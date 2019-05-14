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
var jsyaml = require('yaml');
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

// Helper function to get unique tags
const getUniqueTags = function (datasets) {
  // Build up list of unique tags
  let tags = [];
  datasets.forEach((d) => {
    d.Tags.forEach((t) => {
      if (tags.includes(t) === false) {
        tags.push(t);
      }
    });
  });

  return tags;
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
    // AWS blog
    if (/https?:\/\/aws.amazon.com.*/.test(link)) {
      return options.fn(this);
    }

    // AWS GitHub repos
    if (/https?:\/\/github.com\/(awslabs|aws-samples)\/.*/.test(link)) {
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
  managedByRenderer: function (str) {
    // Keep from exiting if we have an undefined string
    if (!str) {
      return str;
    }

    // Check to see if we have a markdown link
    let logoPath, managedByURL, managedByName;
    if (/\[(.*)\]\((.*)\)/.test(str)) {
      managedByName = /\[(.*)\]/.exec(str)[1];
      logoPath = `/img/logos/${managedByName.toLowerCase().replace(/ /g, '-').replace(/[.,+]/g, '')}-logo.png`;
      managedByURL = /\((.*)\)/.exec(str)[1];
    } else {
      logoPath = `/img/logos/${str.toLowerCase().replace(/ /g, '-').replace(/[.,+]/g, '')}-logo.png`;
    }

    // Check to see if we have a logo and render that if we do
    if (fs.existsSync(`src/${logoPath}`)) {
      return `<a href="${managedByURL}"><img src="${logoPath}" class="managed-by-logo" alt="${managedByName}"></a>`;
    }

    // No logo if we're here, just render markdown
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

// Compile the tag level yaml and move to dist
gulp.task('yaml:tag', ['clean', 'yaml:convert'], function (cb) {
  const datasets = getDatasets();

  // Build up list of unique tags
  const tags = getUniqueTags(datasets);

  // Loop over each tag and build the page
  tags.forEach((t) => {
    // Filter out datasets without a matching tag
    let filteredDatasets = datasets.filter((d) => {
      return d.Tags.includes(t);
    });

    var templateData = {
      datasets: filteredDatasets,
      baseURL: process.env.BASE_URL
    };

    return gulp.src('./src/datasets.hbs')
      .pipe(handlebars(templateData))
      .pipe(rename(`tag/${t.replace(/ /g, '-')}/datasets.yaml`))
      .pipe(gulp.dest('./dist/'));
  });

  return cb();
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
  // Build up sitemap items
  let slugs = [];
  const datasets = getDatasets();
  datasets.forEach((d) => {
    // Detail page
    slugs.push(d.Slug);

    // Tag pages
    d.Tags.forEach((t) => {
      if (slugs.includes(t) === false) {
        slugs.push(`tag/${t.replace(/ /g, '-')}`);
        slugs.push(`tag/${t.replace(/ /g, '-')}/usage-examples`);
      }
    });
  });

  // Collab pages
  fs.readdirSync('./src/collabs').forEach((c) => {
    // Strip off the file extension and add to slugs
    slugs.push(`collab/${path.basename(c, '.yaml')}`);
  });

  var templateData = {
    slugs: slugs,
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
    datasets: datasets,
    isHome: true
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
    datasets: getDatasets(),
    isHome: false
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

// Compile tag usage examples pages and move to dist
gulp.task('html:tag-usage', ['yaml:convert'], function (cb) {
  const datasets = getDatasets();

  // Build up list of unique tags
  const tags = getUniqueTags(datasets);

  // Loop over each tag and build the page
  tags.forEach((t) => {
    // Filter out datasets without a matching tag
    let filteredDatasets = datasets.filter((d) => {
      return d.Tags.includes(t);
    });

    // HBS templating
    var templateData = {
      datasets: filteredDatasets,
      isHome: false,
      tag: t
    };
    const options = {
      batch: ['./src/partials'],
      helpers: hbsHelpers
    };

    return gulp.src('./src/examples.hbs')
      .pipe(handlebars(templateData, options))
      .pipe(rename(`tag/${t.replace(/ /g, '-')}/usage-examples/index.html`))
      .pipe(gulp.dest('./dist/'));
  });

  return cb();
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

      // Generate slug
      const slug = generateSlug(file.path);

      // Add link to other datasets managed by dataset owner, default to search
      if (templateData.ManagedBy) {
        let managedByName = templateData.ManagedBy;
        // Check if ManagedBy is using Markdown
        if (/\[(.*)\]\((.*)\)/.test(templateData.ManagedBy)) {
          managedByName = /\[(.*)\]/.exec(templateData.ManagedBy)[1];
        }
        templateData.managedByLink = `${process.env.BASE_URL}?search=managedBy:${managedByName.toLowerCase()}`;
        templateData.managedByName = managedByName;

        // Check to see if we have a collab page for this dataset
        fs.readdirSync('./src/collabs').forEach((c) => {
          const file = fs.readFileSync(`./src/collabs/${c}`, 'utf8')
          const json = jsyaml.parse(file);
          if (json.Datasets.includes(slug)) {
            templateData.managedByLink = `${process.env.BASE_URL}/collab/${path.basename(c, '.yaml')}`;
          }
        });
      }

      // Render
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

// Compile tag pages and move to dist
gulp.task('html:tag', ['yaml:convert'], function (cb) {
  const datasets = getDatasets();

  // Build up list of unique tags
  const tags = getUniqueTags(datasets);

  // Loop over each tag and build the page
  tags.forEach((t) => {
    // Filter out datasets without a matching tag
    let filteredDatasets = datasets.filter((d) => {
      return d.Tags.includes(t);
    });

    // HBS templating
    var templateData = {
      datasets: filteredDatasets,
      isHome: false,
      tag: t,
      tagURL: t.replace(/ /g, '-')
    };
    const options = {
      batch: ['./src/partials'],
      helpers: hbsHelpers
    };

    return gulp.src('./src/index.hbs')
      .pipe(handlebars(templateData, options))
      .pipe(rename(`tag/${t.replace(/ /g, '-')}/index.html`))
      .pipe(gulp.dest('./dist/'));
  });

  return cb();
});

// Compile collab pages and move to dist
gulp.task('html:collab', ['yaml:convert'], function (cb) {
  const datasets = getDatasets();

  return gulp.src('./src/collabs/*.yaml')
    .pipe(yaml())
    .pipe(flatmap(function (stream, file) {
      const collabData = JSON.parse(file.contents.toString('utf8'));
      const slug = generateSlug(file.path);
      const options = {
        batch: ['./src/partials'],
        helpers: hbsHelpers
      };

      // Filter out datasets to only the ones in the collab
      const filteredDatasets = datasets.filter((d) => {
        return collabData.Datasets.includes(d.Slug);
      });

      // HBS templating
      var templateData = {
        datasets: filteredDatasets,
        isHome: false,
        collabTitle: collabData.Title,
        collabDescription: collabData.Description,
        collabLogo: collabData.Logo
      };

      return gulp.src('./src/index.hbs')
        .pipe(handlebars(templateData, options))
        .pipe(rename(`collab/${slug}/index.html`))
        .pipe(gulp.dest('./dist/'));
    }));
});

// Server with live reload
gulp.task('serve', ['clean', 'css', 'fonts', 'img', 'yaml:convert', 'json:merge', 'yaml:copy', 'yaml:overview', 'yaml:tag', 'html:collab', 'js', 'html:overview', 'html:detail', 'html:sitemap', 'html:examples', 'html:tag', 'html:tag-usage', 'rss'], function () {
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

gulp.task('default', ['clean', 'css', 'fonts', 'img', 'yaml:convert', 'json:merge', 'yaml:copy', 'yaml:overview', 'yaml:tag', 'js', 'html:overview', 'html:collab', 'html:detail', 'html:sitemap', 'html:examples', 'html:tag', 'html:tag-usage', 'rss']);
