#!/usr/bin/env node

const autoprefixer = require('gulp-autoprefixer');
const del = require('del');
const gulp = require('gulp');
const rollup = require('gulp-better-rollup')
const concat = require('gulp-concat');
const cleanCSS = require('gulp-clean-css');
const less = require('gulp-less');
const sourcemaps = require('gulp-sourcemaps');
const tweakdom = require('gulp-tweakdom');
const path = require('path');
const babel = require('rollup-plugin-babel')
const commonJS = require('rollup-plugin-commonjs');
const uglify = require('rollup-plugin-uglify');
const sequence = require('run-sequence');
const uglifyES = require('uglify-es');
const workbox = require('workbox-build');

gulp.task('css', function() {
  // exclude IE11's broken flexbox
  const browsers = ['last 2 versions', 'not IE <= 11', 'not IE_mob <= 11'];
  return gulp.src('*.less')
    .pipe(less())
    .pipe(autoprefixer({browsers}))
    .pipe(cleanCSS())
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
    cache: false,  // cache clobbers rollup
  };
  return gulp.src(['src/support/*.js', 'src/bundle.js'])
    .pipe(sourcemaps.init())
    .pipe(rollup(options, {format: 'iife'}))
    .pipe(concat('support.min.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
})

gulp.task('rollup', function() {
  // nb. this task doesn't really depend on rollup-nomodule, but they can't be run in parallel
  const options = {
    // nb. ascii_only so escaped emoji are left alone
    plugins: [
      uglify({output: {ascii_only: true, ecma: 6}, mangle: {safari10: true}}, uglifyES.minify),
    ],
    cache: false,  // cache clobbers rollup-nomodule
  };
  return gulp.src('src/bundle.js')
    .pipe(sourcemaps.init())
    .pipe(rollup(options, {format: 'es'}))
    .pipe(concat('bundle.min.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('html', function() {
  const mutator = (document, file) => {
    if (path.basename(file) !== 'index.html') { return; }

    // replace lessCSS with actual styles
    document.getElementById('less').remove();
    const link = Object.assign(document.createElement('link'),
        {href: 'styles.css', rel: 'stylesheet'});
    document.head.appendChild(link);

    // fix paths for module/nomodule code
    document.head.querySelector('script[nomodule]').src = 'support.min.js';
    document.head.querySelector('script[src^="src/"]').src = 'bundle.min.js';
  };
  return gulp.src('*.html')
    .pipe(tweakdom(mutator))
    .pipe(gulp.dest('./dist'));
});

gulp.task('static', function() {
  return gulp.src(['manifest.json', 'sw.js', 'opensearch.xml', 'res/*'], {base: '.'})
    .pipe(gulp.dest('./dist'));
});

gulp.task('js', ['rollup', 'rollup-nomodule']);
gulp.task('default', ['css', 'js', 'html', 'static']);

gulp.task('clean', function() {
  return del(['./dist'])
});

gulp.task('manifest', ['css', 'js', 'html', 'static'], function() {
  return workbox.generateFileManifest({
    manifestDest: './dist/manifest.js',
    globPatterns: ['**/*'],
    globIgnores: ['*.map'],
    globDirectory: './dist',
    modifyUrlPrefix: {'/': './'},  // treat files as relative to SW
  });
});
gulp.task('dist', function(callback) {
  sequence('clean', 'manifest', callback);
});
