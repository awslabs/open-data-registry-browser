'use strict';

const cp = require('child_process');
const gulpfile = require('../gulpfile');
const fs = require('fs');

// Mocking a Handlebars options function
const hbsOptions = {
  fn: () => {
    return true;
  },
  inverse: () => {
    return false;
  }
};

describe('Handlebars helpers', () => {
  test('Tests AWS link matching', () => {
    expect(gulpfile.hbsHelpers.isAWSURL('https://aws.amazon.com/foo', hbsOptions)).toBeTruthy();
    expect(gulpfile.hbsHelpers.isAWSURL('https://docs.opendata.aws/foo', hbsOptions)).toBeTruthy();
    expect(gulpfile.hbsHelpers.isAWSURL('https://github.com/awslabs/foo', hbsOptions)).toBeTruthy();
    expect(gulpfile.hbsHelpers.isAWSURL('https://github.com/aws-samples/foo', hbsOptions)).toBeTruthy();
    expect(gulpfile.hbsHelpers.isAWSURL('https://github.com/foo/bar', hbsOptions)).toBeFalsy();
    expect(gulpfile.hbsHelpers.isAWSURL('https://example.com', hbsOptions)).toBeFalsy();
  });
  test('Tests Type string creation', () => {
    expect(gulpfile.hbsHelpers.toType('TEST CASE')).toBe('test-case');
  });
});

describe('Site build', () => {
  beforeAll((done) => {
    const process = cp.fork('./node_modules/gulp-cli/bin/gulp.js');
    process.on('exit', () => {
      return done();
    });
  }, 20000);

  test('Test build artifacts against known good copies', () => {
    expect(fs.readFileSync('./dist/datasets.yaml')).toEqual(fs.readFileSync('./tests/test-data-compare/datasets.yaml'));
    expect(fs.readFileSync('./dist/index.html')).toEqual(fs.readFileSync('./tests/test-data-compare/index.html'));
    expect(fs.readFileSync('./dist/index.ndjson')).toEqual(fs.readFileSync('./tests/test-data-compare/index.ndjson'));
    expect(fs.readFileSync('./dist/index.yaml')).toEqual(fs.readFileSync('./tests/test-data-compare/index.yaml'));
    expect(fs.readFileSync('./dist/sitemap.txt')).toEqual(fs.readFileSync('./tests/test-data-compare/sitemap.txt'));
    expect(fs.readFileSync('./dist/landsat-8/index.html')).toEqual(fs.readFileSync('./tests/test-data-compare/landsat-8.html'));
    expect(fs.readFileSync('./dist/change-log/index.html')).toEqual(fs.readFileSync('./tests/test-data-compare/change-log.html'));
  });
});
