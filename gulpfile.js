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
var handlebars = require('handlebars');
var hb = require('gulp-hb');
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
var reduce = require('object.reduce');
var ndjson = require('ndjson');
let allDatasets;

// The directory to look in for datasets, will be overridden for testing purposes
const dataDirectory = (process.env.NODE_ENV === 'test') ? './tests/test-data-input/**/*.yaml' : './data-sources/**/*.yaml';

// The directory containing all of the data sources
const dataSourcesDirectory = (process.env.NODE_ENV === 'test') ? './tests/test-data-input/' : './data-sources/';

// Overriding MD renderer to remove outside <p> tags
renderer.paragraph = function (text, level) {
  return text;
};

// Helper function to alpha sort DataAtWork sections
const sortDataAtWork = function (dataAtWork) {
  for (var k in dataAtWork) {
    if (!dataAtWork[k]) { return dataAtWork[k]; }
    dataAtWork[k].sort((a, b) => {
      if (a.Title.toUpperCase() < b.Title.toUpperCase()) {
        return -1;
      }
      if (a.Title.toUpperCase() > b.Title.toUpperCase()) {
        return 1;
      }
      return 0;
    });
  }

  return dataAtWork;
};

// Helper function to grab datasets from JSON files
const getDatasets = function (ignoreRank=false) {
  if (allDatasets && !ignoreRank) {
    return allDatasets;
  }

  var datasets = requireDir('./tmp/data/datasets');
  var arr = [];
  for (var k in datasets) {
    // Handle deprecated datasets
    if (datasets[k].Deprecated) {
      continue;
    }

    // If we have no items in a category, remove it
    for (var category in datasets[k].DataAtWork) {
      if (!datasets[k].DataAtWork[category] || (datasets[k].DataAtWork[category] && datasets[k].DataAtWork[category] === 0)) {
        delete datasets[k].DataAtWork[category];
      }
    }

    // If we have no items at all, delete DataAtWork
    if (_.flatMap(datasets[k].DataAtWork).length === 0) {
      delete datasets[k].DataAtWork;
    }

    var dataset = datasets[k];
    dataset.Slug = generateSlug(k);
    arr.push(datasets[k]);
  }

  // Rank the datasets
  arr = rankDatasets(arr, ignoreRank);

  // Sort DataAtWork section by alpha
  arr = arr.map((d) => {
    if (d.DataAtWork) {
      d.DataAtWork = sortDataAtWork(d.DataAtWork);
    }

    return d;
  });

  // Sort the Tags
  arr = arr.map((d) => {
    if (d.Tags) {
      d.Tags = d.Tags.sort((a, b) => a.localeCompare(b));
    }

    return d;
  });

  if (ignoreRank) {
    return arr.slice();
  }
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

// Helper function to get unique dates
const getUniqueDates = function (datasets) {
  // Build up list of unique tags
  let dates = [];
  datasets.forEach((d) => {
    if (dates.includes(d.RegistryEntryAdded) === false) {
      dates.push(d.RegistryEntryAdded);
    }
  });
  // Sort by descending order
  dates.sort();
  dates.reverse();
  return dates;
};

// Helper function to generate slug from file name
const generateSlug = function (file) {
  return path.basename(file, '.json').toLowerCase();
};

// Helper function to rank the datasets in some order
const rankDatasets = function (datasets, ignoreRank) {
  // Calculate rank
  datasets = datasets.map((d) => {
    d.rank = 0;
    if (d['Tags'].includes('aws-pds')) { d.rank += 3; }
    if (d['DataAtWork']) { d.rank += 1 * _.flatMap(d['DataAtWork']).length; }

    return d;
  });

  // Order
  if (ignoreRank) {
    datasets = _.orderBy(datasets, ['Name'], ['asc']);
  } else {
    datasets = _.orderBy(datasets, ['rank', 'Name'], ['desc', 'asc']);
  }

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
    return new hb.handlebars.SafeString(JSON.stringify(obj));
  },
  checkLength: function (obj, len, options) {
    if (_.flatMap(obj).length > len) {
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
    arr = shuffle(_.flatMap(arr));
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

    // Docs site
    if (/https?:\/\/docs.opendata.aws.*/.test(link)) {
      return options.fn(this);
    }

    // AWS GitHub repos
    if (/https?:\/\/github.com\/(awslabs|aws-samples)\/.*/.test(link)) {
      return options.fn(this);
    }
    
    // go.aws shortener
    if (/https?:\/\/go.aws.*/.test(link)) {
      return options.fn(this);
    }    

    return options.inverse(this);
  },
  md: function (str, escapeStr=false) {
    // Keep from exiting if we have an undefined string
    if (!str) {
      return str;
    }
    var res = marked(str, {renderer: renderer});
    if (escapeStr===true) {
      res = res.replace(/\"/g, '\\\"');
    }
    return res;
  },
  escapeTag: function (str) {
    // Keep from exiting if we have an undefined string
    if (!str) {
      return str;
    }
    return str.replace(/ /g, '-');
  },
  managedByRenderer: function (str, wantLogo=true) {
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
    if (wantLogo && fs.existsSync(`src/${logoPath}`)) {
      return `<a href="${managedByURL}"><img src="${logoPath}" class="managed-by-logo" alt="${managedByName}"></a>`;
    }

    // No logo if we're here, just render markdown
    return marked(str, {renderer: renderer});
  },
  toType: function (str) {
    return str ? str.toLowerCase().replace(/\s/g, '-') : str;
  },
  arnToBucket: function (str) {
    if (str) {
      let bucket = str.split(":::", 2)[1];
      if (String(bucket).endsWith('/')) {
        return bucket;
      } else {
        return bucket + '/';
      }
    }
    return str;
  },
  trimHTML: function(passedString, length) {
    // This function will trim an HTML string to a desired length
    // while keeping links intact.
    const regexAllTags = /<[^>]*>/;
    const regexIsTag = /<|>/;
    const regexOpen = /<[^\/][^>]*>/;
    const regexClose = /<\/[^>]*>/;
    const regexAttribute = /<[^ ]*/;

    let necessaryCount = 0;
    if (passedString.replace(regexAllTags, "").length <= length) {
        return passedString;
    }

    const split = passedString.split(regexAllTags);
    let counter = '';

    split.forEach(item => {
       if (counter.length < length && counter.length + item.length >= length) {
           necessaryCount = passedString.indexOf(item, counter.length)
           + item.substring(0, length - counter.length).length;

           return;
       }

       counter += item;
    });

    if (necessaryCount == 0) {
      necessaryCount = counter.length;
    }

    let x = passedString.match(regexIsTag, necessaryCount);
    if (x != null && x[0] == ">") {
        necessaryCount = x.index + 1;
    }
    let subs = passedString.substring(0, necessaryCount);
    let openTags = subs.match(regexOpen) || [];
    let closeTags = subs.match(regexClose) || [];
    let OpenTags = [];
    openTags.forEach(item => {
      let trans = item.toString().match(regexAttribute)[0];
      trans = '</' + trans.substring(1, trans.length - 1);
      if (trans.charAt(trans.length-1) != '>') {
          trans += '>';
      }

      OpenTags.push(trans);
    });

    closeTags.forEach((close, index) => {
      OpenTags.splice(index, 1);
    });

    for (var i = OpenTags.length - 1; i >= 0; i--) {
        subs += OpenTags[i];
    }

    subs += '...';

    return subs;
  }
};
exports.hbsHelpers = hbsHelpers; // exporting for testing purposes

// Clean dist directory
function clean () {
  return del(['./dist/**/*', './tmp/**/*']);
};

// Convert YAML to JSON
function yamlConvert () {
  return gulp.src(dataDirectory)
    .pipe(yaml())
    .pipe(gulp.dest('./tmp/data/unmerged/'));
};

// Merge JSON
function jsonMerge (cb) {
  // Make sure destination parent directory exists
  if (!fs.existsSync('./tmp/data/datasets/')) {
    fs.mkdirSync('./tmp/data/datasets/');
  }

  let repos = fs.readdirSync(dataSourcesDirectory).filter(function(file) {
    return fs.statSync(path.join(dataSourcesDirectory, file)).isDirectory();
  });

  // Loop over datasets and conflate Metadata
  let top = {};
  repos.forEach(function (repo) {
    // Pretty dir name for finding datasets
    var datasets = requireDir(`./tmp/data/unmerged/${repo}/datasets`);
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
        top[slug]['Sources'].push(repo);
      } else {
        top[slug] = dataset;
        top[slug]['Sources'] = [repo];
      }
    }
  });

  // Loop over datasets and write out
  for (var k in top) {
    const dataset = top[k];
    fs.writeFileSync(`./tmp/data/datasets/${dataset.Slug}.json`, JSON.stringify(dataset));
  }

  return cb();
};

// Compile the top level ndjson and move to dist
function jsonOverview (cb) {
  // Loop over each dataset JSON and save to in-memory string
  const serialize = ndjson.serialize();
  let json = '';
  serialize.on('data', function(line) {
    json += line;
  });
  const datasets = requireDir('./tmp/data/datasets');
  for (var k in datasets) {
    serialize.write(datasets[k]);
  }
  serialize.end();

  // Save string to file
  fs.writeFileSync('./dist/index.ndjson', json);

  return cb();
};

// Copy CSS files to dist
function css () {
  return gulp.src('./src/css/**/*.css')
    .pipe(gulp.dest('./dist/css/'));
};

// Copy the datasets yaml files to dist
function yamlCopy () {
  return gulp.src(dataDirectory)
    .pipe(gulp.dest('./dist/datasets/'));
};

// Compile the top level yaml and move to dist
function yamlOverview () {
  var templateData = {
    datasets: getDatasets(),
    baseURL: process.env.BASE_URL
  };

  return gulp.src('./src/datasets.hbs')
    .pipe(hb({data: templateData, handlebars: handlebars}))
    .pipe(rename('datasets.yaml'))
    .pipe(gulp.dest('./dist/'));
};

// Copy the overview YAML to a new file
function yamlOverviewCopy (cb) {
  fs.createReadStream('./dist/datasets.yaml').pipe(fs.createWriteStream('./dist/index.yaml'));

  return cb();
};

// Compile the tag level yaml and move to dist
function yamlTag (cb) {
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
      .pipe(hb({data: templateData, handlebars: handlebars}))
      .pipe(rename(`tag/${t.replace(/ /g, '-')}/datasets.yaml`))
      .pipe(gulp.dest('./dist/'));
  });

  return cb();
};

// Compile the RSS feed and move to dist
function rss () {
  var templateData = {
    datasets: getDatasets(),
    baseURL: process.env.BASE_URL,
    buildDate: new Date().toUTCString()
  };

  return gulp.src('./src/rss.xml.hbs')
    .pipe(hb({data: templateData, helpers: hbsHelpers, handlebars: handlebars}))
    .pipe(rename('rss.xml'))
    .pipe(gulp.dest('./dist/'));
};

// Copy font files to dist
function fonts () {
  return gulp.src('./src/fonts/**/*')
    .pipe(gulp.dest('./dist/fonts/'));
};

// Copy images to dist
function img () {
  return gulp.src('./src/img/**/*')
    .pipe(gulp.dest('./dist/img/'));
};

// Compile the sitemap and move to dist
function htmlSitemap () {
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
    .pipe(hb({data: templateData, handlebars: handlebars}))
    .pipe(rename('sitemap.txt'))
    .pipe(gulp.dest('./dist/'));
};

// Compile JS and move to dist
function js () {
  // HBS templating
  var templateData = {
    datasets: getDatasets()
  };
  const options = {
    helpers: hbsHelpers
  };

  return gulp.src('./src/**/*.js')
    .pipe(hb({data: templateData, helpers: hbsHelpers, handlebars: handlebars}))
    .pipe(gulp.dest('./dist/'));
};

// Compile overview page and move to dist
function htmlOverview () {
  const datasets = getDatasets();

  // Grab collab data
  let collabData = [];
  fs.readdirSync('./src/collabs').forEach((c) => {
    const file = fs.readFileSync(`./src/collabs/${c}`, 'utf8')
    const json = jsyaml.parse(file);
    collabData.push({
      title: json.Title,
      slug: path.basename(c, '.yaml')
    });
  });

  fs.readdirSync('./src/asdi').forEach((c) => {
    const file = fs.readFileSync(`./src/asdi/${c}`, 'utf8')
    const json = jsyaml.parse(file);
    collabData.push({
      title: json.Title,
      slug: path.basename(c, '.yaml')
    });
  });

  // Do some work to alter the datasets data for display
  datasets.map((d) => {
    d.examplesCount = d['DataAtWork'] ? _.flatMap(d['DataAtWork']).length : 0;

    return d;
  });

  // HBS templating
  var templateData = {
    collabData: collabData,
    datasets: datasets,
    isHome: true
  };

  return gulp.src('./src/index.hbs')
    .pipe(hb({data: templateData, helpers: hbsHelpers, partials: ['./src/partials/*'], handlebars: handlebars}))
    .pipe(rename('index.html'))
    .pipe(gulp.dest('./dist/'));
};

// Compile redirect pages and move to dist
function htmlRedirects (cb) {
  const file = fs.readFileSync('./src/config.yaml', 'utf8');
  const config = jsyaml.parse(file);
  // Exit if we have no redirects
  if (!config.redirects) {
    return cb();
  }

  // Create redirect page for each
  config.redirects.forEach((r) => {
    // HBS templating
    const templateData = {
      target: r.target
    };

    return gulp.src('./src/redirect.hbs')
      .pipe(hb({data: templateData, helpers: hbsHelpers, partials: ['./src/partials/*'], handlebars: handlebars}))
      .pipe(rename(`${r.source}`))
      .pipe(gulp.dest('./dist/'));
  });

  return cb();
};

// Compile the usage examples page and move to dist
function htmlExamples () {
  const templateData = {
    datasets: getDatasets(),
    isHome: false
  };

  // Handle pretty name for data at work field
  templateData.datasets.forEach((d) => {
    if (d.DataAtWork && d.DataAtWork['Tools & Applications']) {
      d.DataAtWork.Tools = d.DataAtWork['Tools & Applications'];
      delete d.DataAtWork['Tools & Applications'];
    }
  });

  return gulp.src('./src/examples.hbs')
    .pipe(hb({data: templateData, helpers: hbsHelpers, partials: ['./src/partials/*'], handlebars: handlebars}))
    .pipe(rename('index.html'))
    .pipe(gulp.dest('./dist/usage-examples/'));
};

// Compile tag usage examples pages and move to dist
function htmlTagUsage (cb) {
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

    return gulp.src('./src/examples.hbs')
      .pipe(hb({data: templateData, helpers: hbsHelpers, partials: ['./src/partials/*'], handlebars: handlebars}))
      .pipe(rename(`tag/${t.replace(/ /g, '-')}/usage-examples/index.html`))
      .pipe(gulp.dest('./dist/'));
  });

  return cb();
};

// Compile detail pages and move to dist
function htmlDetail () {
  return gulp.src('./tmp/data/datasets/*.json')
    .pipe(flatmap(function (stream, file) {
      var templateData = JSON.parse(file.contents.toString('utf8'));

      // If we have no DataAtWork, remove it
      if (!templateData.DataAtWork || (templateData.DataAtWork && _.compact(_.flatMap(templateData.DataAtWork)).length === 0)) {
        delete templateData.DataAtWork;
      }

      // Sort DataAtWork entries by alpha and handle naming
      if (templateData.DataAtWork) {
        sortDataAtWork(templateData.DataAtWork);

        // Handle pretty name for data at work field
        if (templateData.DataAtWork['Tools & Applications']) {
          templateData.DataAtWork.Tools = templateData.DataAtWork['Tools & Applications'];
          delete templateData.DataAtWork['Tools & Applications'];
        }
      }

      // Sort Tags
      if (templateData.Tags) {
        templateData.Tags.sort((a, b) => a.localeCompare(b))
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
      return gulp.src('./src/detail.hbs')
        .pipe(hb({data: templateData, helpers: hbsHelpers, partials: ['./src/partials/*'], handlebars: handlebars}))
        .pipe(rename(`${slug}/index.html`))
        .pipe(gulp.dest('./dist/'));
    }));
};

// Compile tag pages and move to dist
function htmlTag (cb) {
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

    return gulp.src('./src/index.hbs')
      .pipe(hb({data: templateData, helpers: hbsHelpers, partials: ['./src/partials/*'], handlebars: handlebars}))
      .pipe(rename(`tag/${t.replace(/ /g, '-')}/index.html`))
      .pipe(gulp.dest('./dist/'));
  });

  return cb();
};

// Compile collab pages and move to dist
function htmlCollab (cb) {
  const datasets = getDatasets();

  return gulp.src('./src/collabs/*.yaml')
    .pipe(yaml())
    .pipe(flatmap(function (stream, file) {
      const collabData = JSON.parse(file.contents.toString('utf8'));
      const slug = generateSlug(file.path);

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
        .pipe(hb({data: templateData, helpers: hbsHelpers, partials: ['./src/partials/*'], handlebars: handlebars}))
        .pipe(rename(`collab/${slug}/index.html`))
        .pipe(gulp.dest('./dist/'));
    }));
};

// Compile ASDI page and move to dist
function htmlASDI (cb) {
  const datasets = getDatasets(true);

  return gulp.src('./src/asdi/*.yaml')
    .pipe(yaml())
    .pipe(flatmap(function (stream, file) {
      const asdiData = JSON.parse(file.contents.toString('utf8'));

      var filteredDatasets = {};
      reduce(asdiData.Collab.Tags, function(acc, key) {
        // Filter out datasets without a matching tag
        acc[key] = datasets.filter((d) => {
          return d.Collabs && asdiData.Collab.Name in d.Collabs && d.Collabs[asdiData.Collab.Name].Tags && d.Collabs[asdiData.Collab.Name].Tags.includes(key);
        });
        return acc;
      }, filteredDatasets);

      // HBS templating
      var templateData = {
        datasets: filteredDatasets,
        isHome: false,
        collabTitle: asdiData.Title,
        collabDescription: asdiData.Description,
        collabLogo: asdiData.Logo
      };

      templateData.collabDescription += "<br><br> Categories: ";

      asdiData.Collab.Tags.forEach((t) => {
        templateData.collabDescription += "[" + t + "](#" + t.replace(/ /g, '-') + "), ";
      });

      templateData.collabDescription = templateData.collabDescription.slice(0, -2);

      return gulp.src('./src/asdiindex.hbs')
        .pipe(hb({data: templateData, helpers: hbsHelpers, partials: ['./src/partials/*'], handlebars: handlebars}))
        .pipe(rename(`collab/asdi/index.html`))
        .pipe(gulp.dest('./dist/'));
    }));
};

// Compile page for when datasets were added
function htmlAdditions (cb) {
  const datasets = getDatasets();

  // Build up list of unique tags
  const dates = getUniqueDates(datasets);

  var filteredDatasets = {};
  reduce(dates, function(acc, key) {
    // Filter out datasets without a matching tag
    acc[key] = datasets.filter((d) => {
      return d.RegistryEntryAdded == key;
    });
    return acc;
  }, filteredDatasets);

  // HBS templating
  var templateData = {
    datasets: filteredDatasets,
    isHome: false
  };

  return gulp.src('./src/changelogindex.hbs')
    .pipe(hb({data: templateData, helpers: hbsHelpers, partials: ['./src/partials/*'], handlebars: handlebars}))
    .pipe(rename(`change-log/index.html`))
    .pipe(gulp.dest('./dist/'));
};

// Compile providers page and move to dist
function htmlProviders (cb) {
  const logos = fs.readdirSync('./src/img/logos').map((c) => {
    return `img/logos/${c}`;
  });

  // HBS templating
  const templateData = {
    Providers: logos
  };

  return gulp.src('./src/providers.hbs')
    .pipe(hb({data: templateData, helpers: hbsHelpers, partials: ['./src/partials/*'], handlebars: handlebars}))
    .pipe(rename(`/providers.html`))
    .pipe(gulp.dest('./dist/'));
};

// Server with live reload
exports.serve = gulp.series(clean, gulp.parallel(css, fonts, img, yamlConvert, yamlCopy), jsonMerge, gulp.parallel(yamlOverview, jsonOverview), yamlOverviewCopy, yamlTag, js, rss, gulp.parallel(htmlAdditions, htmlASDI, htmlCollab, htmlDetail, htmlOverview, htmlSitemap, htmlExamples, htmlTag, htmlTagUsage, htmlProviders), htmlRedirects, function () {

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

  gulp.watch('src/**/*', gulp.series('default'));
});

exports.build = gulp.series(clean, gulp.parallel(css, fonts, img, yamlConvert, yamlCopy), jsonMerge, gulp.parallel(yamlOverview, jsonOverview), yamlOverviewCopy, yamlTag, js, rss, gulp.parallel(htmlAdditions, htmlASDI, htmlCollab, htmlDetail, htmlOverview, htmlSitemap, htmlExamples, htmlTag, htmlTagUsage, htmlProviders), htmlRedirects);
exports.default = exports.build;

