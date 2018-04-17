The Registry of Open Data (RODA) Browser acts as a simple, web-based visualization of the data in https://github.com/awslabs/open-data-registry.

This browser can be used to view a single data repository or multiple data repositories, depending on build-time settings. The project builds static HTML files that can be deployed on any compatible web server.

## Endpoints
- `/` - Main datasets listing page, provides search mechanism.
- `ex: /1000-genomes` - Individual detail pages for each dataset, contains details, license, contact, documentation and example usage links and AWS resources available.
- `datasets.yaml` - YAML formatted listing of each individual YAML file for provided datasets.
- `ex: data-sources/awslabs-open-data-registry/datasets/1000-genomes.yaml` - YAML for individual dataset, used to create the HTML pages.
- `sitemap.txt` - Sitemap listing all the HTML pages.

## Building
1. Get this repository and the related data files with `git clone git@github.com:awslabs/open-data-registry-browser.git`.
1. `npm run copy-data` to copy data repositories locally, see note about using multiple repositories below.
1. `npm install` to install required Node.js modules.
1. `npm run serve` to develop the site with live reloading OR `npm run build` to build the site for deployment. See note about using multiple repositories below.

## Using multiple repositories
By default, the public data repository at https://github.com/awslabs/open-data-registry is used. If you wish to use a different or multiple repositories, you can add them via the `RODA_SOURCES` environment variable like

`export RODA_SOURCES=git@github.com:awslabs/repo1.git,git@github.com:awslabs/repo2.git`

Make sure this variable is set before running `npm run copy-data` and `npm run build` or `npm run serve`. The `copy-data` script runs a `git clone <repo>` command so the machine you're building on needs to have permissions to the repository and the URL provided must be of the form to work with `git clone`.

Subsequent listed repositores will take precendence over data on previous repositories. Datasets are matched across repos by their `Slug`, which is generated from their filename. Currently, only the `Metadata` dictionary is copied over between repositories. If a dataset exists only outside the primary repository, it will be created as normal.