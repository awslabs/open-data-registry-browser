The Registry of Open Data (RODA) Browser acts as a simple, web-based visualization of the data in https://github.com/awslabs/open-data-registry.

This browser can be used to view a single data repository or multiple data repositories, depending on build-time settings. The project builds static HTML files that can be deployed on any compatible web server.

## Logos
You can add logos to the `src/img/logos` directory for use in the **detail** and **collab** pages. Logos should be square PNGs and are currently sized down to 100px x 100px for display. The name of the logo file that the template looks for is tied to the entry in the `ManagedBy` data field. Spaces are replaced with '-' and special characters are removed. If the `ManagedBy` field is using markdown, the link text field is used, otherwise, the entire string is used to generate the logo path for testing.

## Endpoints
- `/` - Main datasets listing page, provides search mechanism.
- `ex: /1000-genomes` - Individual detail pages for each dataset, contains details, license, contact, documentation and example usage links and AWS resources available.
- `/usage-examples/` - Lists all usage examples grouped by dataset.
- `/index.yaml` - YAML formatted listing of each individual YAML file for provided datasets. [`datasets.yaml` is created but should be considered deprecated]
- `/index.ndjson` - NDJSON formatted listing of each individual YAML file for provided datasets.
- `ex: /tag/earth-observation/` - Tag-subsetted view of the main datasets listing page.
- `ex: /tag/machine-learning/usage-examples/` - Tag-subsetted list usage examples grouped by dataset.
- `ex: /tag/astronomy/datasets.yaml` - YAML for all datasets associated with a tag.
- `ex: /datasets/awslabs-open-data-registry/datasets/1000-genomes.yaml` - YAML for individual dataset, used to create the HTML pages.
- `/sitemap.txt` - Sitemap listing all the HTML pages.
- `/providers.html` - A simple listing of logos of data providers.

## Building
1. Get this repository and the related data files with `git clone git@github.com:awslabs/open-data-registry-browser.git`.
1. `npm run copy-data` to copy data repositories locally, see note about using multiple repositories below.
1. `npm install` to install required Node.js modules.
1. `npm run serve` to develop the site with live reloading OR `npm run build` to build the site for deployment. See note about using multiple repositories below.

## Testing
Tests can be run with `npm test`.

## Using multiple repositories
By default, the public data repository at https://github.com/awslabs/open-data-registry is used. If you wish to use a different or multiple repositories, you can add them via the `RODA_SOURCES` environment variable like

`export RODA_SOURCES=git@github.com:awslabs/repo1.git,git@github.com:awslabs/repo2.git`

Make sure this variable is set before running `npm run copy-data` and `npm run build` or `npm run serve`. The `copy-data` script runs a `git clone <repo>` command so the machine you're building on needs to have permissions to the repository and the URL provided must be of the form to work with `git clone`.

Subsequent listed repositores will take precendence over data on previous repositories. Datasets are matched across repos by their `Slug`, which is generated from their filename. Currently, only the `Metadata` dictionary is copied over between repositories. If a dataset exists only outside the primary repository, it will be created as normal.

## Redirects
By using the redirects map in `src/config.yaml` you can set up simple HTML redirects from `source` to `target`. This does not copy any content, simply creates a new HTML page. This function runs after other HTML content is generated so it can be used to create new or overwrite existing HTML pages.

## Running with Docker

Docker can be used to isolate the development environment.

Build the container with:

`docker build -t roda .`

Run the container with:

`docker run --rm -p 3000:3000 -ti roda`

Run the container with a local copy of the registry:

`docker run --rm -p 3000:3000 -v `pwd`/open-data-registry:/app/data-sources/awslabs-open-data-registry -ti roda`
