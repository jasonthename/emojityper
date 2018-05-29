#!/usr/bin/env node

'use strict';

const autoprefixer = require('gulp-autoprefixer');
const del = require('del');
const gulp = require('gulp');
const rollup = require('gulp-better-rollup')
const concat = require('gulp-concat');
const cleanCSS = require('gulp-clean-css');
const comment = require('gulp-header-comment');
const less = require('gulp-less');
const sourcemaps = require('gulp-sourcemaps');
const tweakdom = require('gulp-tweakdom');
const fs = require('fs');
const babel = require('rollup-plugin-babel')
const commonJS = require('rollup-plugin-commonjs');
const uglify = require('rollup-plugin-uglify');
const sequence = require('run-sequence');
const uglifyES = require('uglify-es');
const workbox = require('workbox-build');

const hasher = new (require('./gulp-hash'))();

gulp.task('css', function() {
  // exclude IE11's broken flexbox
  const browsers = ['last 2 versions', 'not IE <= 11', 'not IE_mob <= 11'];
  return gulp.src('*.less')
    .pipe(less())
    .pipe(autoprefixer({browsers}))
    .pipe(cleanCSS())
    .pipe(hasher.write('styles.css'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('rollup-nomodule', function() {
  // TODO: bring in fetch polyfill
  const options = {
    // nb. ascii_only so escaped emoji are left alone
    plugins: [
      commonJS(),
      babel(),
      uglify({output: {ascii_only: true}}),
    ],
    cache: false,  // cache clobbers other rollup tasks
  };
  return gulp.src(['src/support/*.js', 'src/bundle.js'])
    .pipe(sourcemaps.init())
    .pipe(rollup(options, {format: 'iife'}))
    .pipe(hasher.write('support.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('rollup', function() {
  const options = {
    // nb. ascii_only so escaped emoji are left alone
    plugins: [
      uglify({output: {ascii_only: true, ecma: 6}, mangle: {safari10: true}}, uglifyES.minify),
    ],
    cache: false,  // cache clobbers other rollup tasks
  };
  return gulp.src('src/bundle.js')
    .pipe(sourcemaps.init())
    .pipe(rollup(options, {format: 'es'}))
    .pipe(hasher.write('bundle.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('html', ['css'], function() {
  const mutator = (document, file) => {
    // replace lessCSS with actual styles
    // FIXME(samthor): We generate the dist file, but just inline it anyway.
    const raw = fs.readFileSync('./dist/' + hasher.must('styles.css'));
    const style = Object.assign(document.createElement('style'), {textContent: raw});
    document.head.appendChild(style);

    // fix paths for module/nomodule code
    document.head.querySelector('script[nomodule]').src = hasher.must('support.js');
    document.head.querySelector('script[src^="src/"]').src = hasher.must('bundle.js');

    // remove all dev things
    Array.from(document.querySelectorAll('._dev')).forEach((x) => x.remove());

    // nb. we used to append (new Date), but everything is hashed now
  };
  return gulp.src('index.html')
    .pipe(tweakdom(mutator))
    .pipe(gulp.dest('./dist'));
});

gulp.task('static', function() {
  const src = [
    'CNAME',
    'manifest.json',
    'opensearch.xml',
    'error.html',
    'google*.html',
    'res/*',
  ];
  return gulp.src(src, {base: '.'})
    .pipe(gulp.dest('./dist'));
});

gulp.task('js', ['rollup', 'rollup-nomodule']);
gulp.task('default', ['js', 'html', 'static']);

gulp.task('clean', function() {
  return del(['./dist'])
});

gulp.task('preparedist', ['clean', 'css', 'js', 'html', 'static']);

gulp.task('sw', ['preparedist'], async function() {
  const globPatterns = [
    'index.html',     // don't include error/google html
    '*.{js,json}',    // nb. doesn't include css, which is inlined
    'res/icon-*.png',
  ];
  const {count, size} = await workbox.injectManifest({
    swSrc: 'sw.js',
    swDest: './dist/sw.js',
    globDirectory: './dist',
    globIgnores: ['sw.js'],  // don't include SW
    globPatterns,
    modifyUrlPrefix: {'/': './'},  // treat files as relative to SW
  });
});

gulp.task('dist', function(callback) {
  sequence('clean', ['sw', 'preparedist', 'default'], callback);
});
