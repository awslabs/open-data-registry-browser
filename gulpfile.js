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
var fs = require('fs');
var _ = require('lodash');
let allDatasets;

// Overriding MD renderer to remove outside <p> tags
renderer.paragraph = function (text, level) {
  return text;
};

// Helper function to alpha sort DataAtWork sections
const sortDataAtWork = function (dataAtWork) {
  dataAtWork.sort((a, b) => {
    if (a.Title.toUpperCase() < b.Title.toUpperCase()) {
      return -1;
    }
    if (a.Title.toUpperCase() > b.Title.toUpperCase()) {
      return 1;
    }
    return 0;
  });

  return dataAtWork;
};

// Helper function to grab datasets from JSON files
const getDatasets = function () {
  if (allDatasets) {
    return allDatasets;
  }

  var datasets = requireDir('./tmp/data/datasets');
  var arr = [];
  for (var k in datasets) {
    // Handle deprecated datasets
    if (datasets[k].Deprecated) {
      continue;
    }

    var dataset = datasets[k];
    dataset.Slug = generateSlug(k);
    arr.push(datasets[k]);
  }

  // Rank the datasets
  arr = rankDatasets(arr);

  // Sort DataAtWork section by alpha
  arr = arr.map((d) => {
    if (d.DataAtWork) {
      d.DataAtWork = sortDataAtWork(d.DataAtWork);
    }

    return d;
  });

  allDatasets = arr.slice();
  return allDatasets;
};

// Helper function to generate slug from file name
const generateSlug = function (file) {
  return path.basename(file, '.json').toLowerCase();
};

// Helper function to rank the datasets in some order
const rankDatasets = function (datasets) {
  // Calculate rank
  datasets = datasets.map((d) => {
    d.rank = 0;
    if (d['Tags'].includes('aws-pds')) { d.rank += 3; }
    if (d['DataAtWork']) { d.rank += 1 * d['DataAtWork'].length; }

    return d;
  });

  // Order
  datasets = _.orderBy(datasets, ['rank', 'Name'], ['desc', 'asc']);

  // Remove rank variable
  datasets = datasets.map((d) => {
    delete d.rank;

    return d;
  });

  return datasets;
};

// Handlebars helper functions
const hbsHelpers = {
  toJSON: function (obj) {
    return new handlebars.Handlebars.SafeString(JSON.stringify(obj));
  },
  checkLength: function (arr, len, options) {
    if (arr.length > len) {
      return options.fn(this);
    }
    return options.inverse(this);
  },
  pickRandom: function (arr, len, options) {
    let ret = '';
    const shuffle = function (a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    arr = shuffle(arr.slice());
    arr = arr.slice(0, len);
    arr = arr.forEach((a) => {
      ret += options.fn(a);
    });
    return ret;
  },
  isEqual: function (v1, v2, options) {
    if (v1 === v2) {
      return options.fn(this);
    }
    return options.inverse(this);
  },
  isAWSURL: function (link, options) {
    if (/https?:\/\/aws.amazon.com.*/.test(link)) {
      return options.fn(this);
    }
    return options.inverse(this);
  },
  md: function (str) {
    // Keep from exiting if we have an undefined string
    if (!str) {
      return str;
    }
    return marked(str, {renderer: renderer});
  },
  toType: function (str) {
    return str ? str.toLowerCase().replace(/\s/g, '-') : str;
  }
};

// Clean dist directory
gulp.task('clean', function () {
  return del(['./dist/**/*', './tmp/**/*']);
});

// Convert YAML to JSON
gulp.task('yaml:convert', ['clean'], function () {
  return gulp.src('./data-sources/**/*.yaml')
    .pipe(yaml())
    .pipe(gulp.dest('./tmp/data/unmerged/'));
});

// Merge JSON
gulp.task('json:merge', ['yaml:convert'], function (cb) {
  // Make sure destination parent directory exists
  if (!fs.existsSync('./tmp/data/datasets/')) {
    fs.mkdirSync('./tmp/data/datasets/');
  }

  // Look for repos to use based on RODA_SOURCES env var, default to
  // public repo
  var repos = process.env.RODA_SOURCES;
  if (repos) {
    repos = repos.split(',');
  } else {
    repos = ['git@github.com:awslabs/open-data-registry.git'];
  }

  // Loop over datasets and conflate Metadata
  let top = {};
  repos.forEach(function (repo) {
    // Pretty dir name for finding datasets
    const prettyDir = repo.split(':')[1].replace('/', '-').replace('.git', '');
    var datasets = requireDir(`./tmp/data/unmerged/${prettyDir}/datasets`);
    for (var k in datasets) {
      var dataset = datasets[k];
      const slug = generateSlug(k);
      dataset.Slug = slug;
      // If dataset (slug) already exists, only thing we're
      // copying over is Metadata
      if (top[slug]) {
        if (top[slug]['Metadata']) {
          for (var l in dataset.Metadata) {
            top[slug]['Metadata'][l] = dataset.Metadata[l];
          }
        } else {
          top[slug]['Metadata'] = dataset.Metadata;
        }
        top[slug]['Sources'].push(prettyDir);
      } else {
        top[slug] = dataset;
        top[slug]['Sources'] = [prettyDir];
      }
    }
  });

  // Loop over datasets and write out
  for (var k in top) {
    const dataset = top[k];
    fs.writeFileSync(`./tmp/data/datasets/${dataset.Slug}.json`, JSON.stringify(dataset));
  }

  return cb();
});

// Copy CSS files to dist
gulp.task('css', ['clean'], function () {
  return gulp.src('./src/css/**/*.css')
    .pipe(gulp.dest('./dist/css/'));
});

// Copy the datasets yaml files to dist
gulp.task('yaml:copy', ['clean'], function () {
  return gulp.src('./data-sources/**/*.yaml')
    .pipe(gulp.dest('./dist/datasets/'));
});

// Compile the top level yaml and move to dist
gulp.task('yaml:overview', ['clean', 'yaml:convert'], function () {
  var templateData = {
    datasets: getDatasets(),
    baseURL: process.env.BASE_URL
  };

  return gulp.src('./src/datasets.hbs')
    .pipe(handlebars(templateData))
    .pipe(rename('datasets.yaml'))
    .pipe(gulp.dest('./dist/'));
});

// Compile the RSS feed and move to dist
gulp.task('rss', ['clean', 'yaml:convert'], function () {
  var templateData = {
    datasets: getDatasets(),
    baseURL: process.env.BASE_URL,
    buildDate: new Date().toUTCString()
  };

  return gulp.src('./src/rss.xml.hbs')
    .pipe(handlebars(templateData))
    .pipe(rename('rss.xml'))
    .pipe(gulp.dest('./dist/'));
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
gulp.task('html:sitemap', ['yaml:convert'], function () {
  var templateData = {
    datasets: getDatasets(),
    baseURL: process.env.BASE_URL
  };

  return gulp.src('./src/sitemap.hbs')
    .pipe(handlebars(templateData))
    .pipe(rename('sitemap.txt'))
    .pipe(gulp.dest('./dist/'));
});

// Compile JS and move to dist
gulp.task('js', ['clean', 'yaml:convert'], function () {
  // HBS templating
  var templateData = {
    datasets: getDatasets()
  };
  const options = {
    helpers: hbsHelpers
  };

  return gulp.src('./src/**/*.js')
    .pipe(handlebars(templateData, options))
    .pipe(gulp.dest('./dist/'));
});

// Compile overview page and move to dist
gulp.task('html:overview', ['yaml:convert'], function () {
  const datasets = getDatasets();

  // Do some work to alter the datasets data for display
  datasets.map((d) => {
    d.examplesCount = d['DataAtWork'] ? d['DataAtWork'].length : 0;

    return d;
  });

  // HBS templating
  var templateData = {
    datasets: datasets
  };
  const options = {
    batch: ['./src/partials'],
    helpers: hbsHelpers
  };

  return gulp.src('./src/index.hbs')
    .pipe(handlebars(templateData, options))
    .pipe(rename('index.html'))
    .pipe(gulp.dest('./dist/'));
});

// Compile the usage examples page and move to dist
gulp.task('html:examples', ['yaml:convert'], function () {
  const templateData = {
    datasets: getDatasets()
  };

  const options = {
    batch: ['./src/partials'],
    helpers: hbsHelpers
  };

  return gulp.src('./src/examples.hbs')
    .pipe(handlebars(templateData, options))
    .pipe(rename('index.html'))
    .pipe(gulp.dest('./dist/usage-examples/'));
});

// Compile detail pages and move to dist
gulp.task('html:detail', ['yaml:convert'], function () {
  return gulp.src('./tmp/data/datasets/*.json')
    .pipe(flatmap(function (stream, file) {
      var templateData = JSON.parse(file.contents.toString('utf8'));
      // Sort DataAtWork entries by alpha
      if (templateData.DataAtWork) {
        sortDataAtWork(templateData.DataAtWork);
      }
      var slug = generateSlug(file.path);
      const options = {
        batch: ['./src/partials'],
        helpers: hbsHelpers
      };

      return gulp.src('./src/detail.hbs')
        .pipe(handlebars(templateData, options))
        .pipe(rename(`${slug}/index.html`))
        .pipe(gulp.dest('./dist/'));
    }));
});

// Server with live reload
gulp.task('serve', ['clean', 'css', 'fonts', 'img', 'yaml:convert', 'json:merge', 'yaml:copy', 'yaml:overview', 'js', 'html:overview', 'html:detail', 'html:sitemap', 'html:examples', 'rss'], function () {
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

gulp.task('default', ['clean', 'css', 'fonts', 'img', 'yaml:convert', 'json:merge', 'yaml:copy', 'yaml:overview', 'js', 'html:overview', 'html:detail', 'html:sitemap', 'html:examples', 'rss']);
