/**
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is located at
 *
 * http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

'use strict';

var gulp = require('gulp');
var yaml = require('gulp-yaml');
var del = require('del');
var handlebars = require('gulp-compile-handlebars');
var rename = require('gulp-rename');
var flatmap = require('gulp-flatmap');
var requireDir = require('require-dir');
var path = require('path');
var marked = require('marked');
var renderer = new marked.Renderer();
var browserSync = require('browser-sync');
var reload = browserSync.reload;

// Overriding MD renderer to remove outside <p> tags
renderer.paragraph = function (text, level) {
  return text;
};

// Helper function to grab datasets from JSON files
var getDatasets = function () {
  var datasets = requireDir('./tmp/data/datasets');
  var arr = [];
  for (var k in datasets) {
    var dataset = datasets[k];
    dataset.Slug = generateSlug(k);
    arr.push(datasets[k]);
  }

  return arr;
};

// Helper function to generate slug from file name
var generateSlug = function (file) {
  return path.basename(file, '.json');
};

// Clean dist directory
gulp.task('clean', function () {
  return del(['./dist/**/*', './tmp/**/*']);
});

// Convert YAML to JSON
gulp.task('yaml', ['clean'], function () {
  return gulp.src('./open-data-registry/**/*.yaml')
    .pipe(yaml())
    .pipe(gulp.dest('./tmp/data/'));
});

// Copy CSS files to dist
gulp.task('css', ['clean'], function () {
  return gulp.src('./src/css/**/*.css')
    .pipe(gulp.dest('./dist/css/'));
});

// Copy font files to dist
gulp.task('fonts', ['clean'], function () {
  return gulp.src('./src/fonts/**/*')
    .pipe(gulp.dest('./dist/fonts/'));
});

// Copy images to dist
gulp.task('img', ['clean'], function () {
  return gulp.src('./src/img/**/*')
    .pipe(gulp.dest('./dist/img/'));
});

// Compile the sitemap and move to dist
gulp.task('html:sitemap', ['yaml'], function () {
  var templateData = {
    datasets: getDatasets(),
    baseURL: process.env.BASE_URL
  };

  return gulp.src('./src/sitemap.hbs')
      .pipe(handlebars(templateData))
      .pipe(rename('sitemap.txt'))
      .pipe(gulp.dest('./dist/'));
});

// Compile overview page and move to dist
gulp.task('html:overview', ['yaml'], function () {
  var templateData = {
    datasets: getDatasets()
  };
  const options = {
    batch: ['./src/partials'],
    helpers: {
      toJSON: function (obj) {
        return new handlebars.Handlebars.SafeString(JSON.stringify(obj));
      }
    }
  };

  return gulp.src('./src/index.hbs')
      .pipe(handlebars(templateData, options))
      .pipe(rename('index.html'))
      .pipe(gulp.dest('./dist/'));
});

// Compile detail pages and move to dist
gulp.task('html:detail', ['yaml'], function () {
  return gulp.src('./tmp/data/datasets/*.json')
    .pipe(flatmap(function (stream, file) {
      var templateData = JSON.parse(file.contents.toString('utf8'));
      var slug = generateSlug(file.path);
      const options = {
        batch: ['./src/partials'],
        helpers: {
          md: function (str) {
            return marked(str, {renderer: renderer});
          },
          toType: function (str) {
            return str ? str.toLowerCase().replace(/\s/g, '-') : str;
          }
        }
      };

      return gulp.src('./src/detail.hbs')
          .pipe(handlebars(templateData, options))
          .pipe(rename(`${slug}/index.html`))
          .pipe(gulp.dest('./dist/'));
    }));
});

// Server with live reload
gulp.task('serve', ['clean', 'css', 'fonts', 'img', 'yaml', 'html:overview', 'html:detail', 'html:sitemap'], function () {
  browserSync({
    port: 3000,
    server: {
      baseDir: ['dist']
    }
  });

  // watch for changes and add a debounce for dist changes
  var timer;
  gulp.watch([
    'dist/**/*'
  ]).on('change', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      reload();
    }, 500);
  });

  gulp.watch('src/**/*', ['default']);
});

gulp.task('default', ['clean', 'css', 'fonts', 'img', 'yaml', 'html:overview', 'html:detail', 'html:sitemap']);
