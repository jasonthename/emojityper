#!/usr/bin/env node

const less = require('gulp-less');
const tweakdom = require('gulp-tweakdom');
const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const rollup = require('gulp-better-rollup')
const babel = require('rollup-plugin-babel')
const uglify = require('rollup-plugin-uglify');
const uglifyES = require('uglify-es');
const concat = require('gulp-concat');

gulp.task('less', function() {
  return gulp.src('*.less')
    .pipe(less())
    .pipe(gulp.dest('./dist'));
});

gulp.task('rollup-nomodule', function() {
  // TODO: bring in Promise and fetch polyfill or remove dep
  const options = {
    plugins: [babel(), uglify()],
  };
  return gulp.src(['src/polyfill.js', 'src/bundle.js'])
    .pipe(sourcemaps.init())
    .pipe(rollup(options, {format: 'iife'}))
    .pipe(concat('support.min.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
})

gulp.task('rollup', ['rollup-nomodule'], function() {
  // nb. this task doesn't really depend on rollup-nomodule, but they can't be run in parallel
  const options = {
    plugins: [uglify({}, uglifyES.minify)],
  };
  return gulp.src('src/bundle.js')
    .pipe(sourcemaps.init())
    .pipe(rollup(options, {format: 'es'}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('html', function() {
  const mutator = document => {
    document.getElementById('less').remove();
    const link = Object.assign(document.createElement('link'), {href: 'styles.css', rel: 'stylesheet'});
    document.head.appendChild(link);
  };
  return gulp.src('*.html')
    .pipe(tweakdom(mutator))
    .pipe(gulp.dest('./dist'));
});

gulp.task('static', function() {
  return gulp.src(['manifest.json', 'opensearch.xml'])
    .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['less', 'rollup', 'html', 'static']);
