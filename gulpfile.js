#!/usr/bin/env node

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
const path = require('path');
const babel = require('rollup-plugin-babel')
const commonJS = require('rollup-plugin-commonjs');
const uglify = require('rollup-plugin-uglify');
const sequence = require('run-sequence');
const uglifyES = require('uglify-es');
const workbox = require('workbox-build');

const builtAt = new Date;
const builtAtTime = +builtAt;
const nonce = builtAtTime.toString(36);

gulp.task('css', function() {
  // exclude IE11's broken flexbox
  const browsers = ['last 2 versions', 'not IE <= 11', 'not IE_mob <= 11'];
  return gulp.src('*.less')
    .pipe(less())
    .pipe(autoprefixer({browsers}))
    .pipe(cleanCSS())
    .pipe(concat(`styles-${nonce}.css`))
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
    .pipe(concat(`support-${nonce}.min.js`))
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
    .pipe(concat(`bundle-${nonce}.min.js`))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('html', function() {
  const mutator = (document, file) => {
    if (path.basename(file) !== 'index.html') { return; }

    // replace lessCSS with actual styles
    document.getElementById('less').remove();
    const link = Object.assign(document.createElement('link'),
        {href: `styles-${nonce}.css`, rel: 'stylesheet'});
    document.head.appendChild(link);

    // fix paths for module/nomodule code
    document.head.querySelector('script[nomodule]').src = `support-${nonce}.min.js`;
    document.head.querySelector('script[src^="src/"]').src = `bundle-${nonce}.min.js`;

    // append buildAt
    document.head.appendChild(document.createComment(`Generated on: ${builtAt}`));
  };
  return gulp.src('*.html')
    .pipe(tweakdom(mutator))
    .pipe(gulp.dest('./dist'));
});

gulp.task('static', function() {
  const src = [
    'CNAME',
    'manifest.json',
    'opensearch.xml',
    'google*.html',
    'res/*',
  ];
  return gulp.src(src, {base: '.'})
    .pipe(gulp.dest('./dist'));
});

gulp.task('js', ['rollup', 'rollup-nomodule']);
gulp.task('default', ['css', 'js', 'html', 'static']);

gulp.task('clean', function() {
  return del(['./dist'])
});

gulp.task('manifest', ['clean', 'css', 'js', 'html', 'static'], function() {
  // nb. manifest requires clean to remove old output files
  return workbox.generateFileManifest({
    manifestDest: './dist/manifest.js',
    globPatterns: ['**/*.{png,html,js,json,css}'],
    globIgnores: ['*.map', 'sw.js', 'manifest.js'],  // don't include sourcemaps or SW
    globDirectory: './dist',
    modifyUrlPrefix: {'/': './'},  // treat files as relative to SW
  });
});

gulp.task('sw', ['manifest'], function() {
  return gulp.src(['sw.js'])
    .pipe(comment(`Generated on: ${builtAt}`))
    .pipe(gulp.dest('./dist'));
});

gulp.task('dist', function(callback) {
  sequence('clean', ['sw', 'manifest', 'default'], callback);
});
