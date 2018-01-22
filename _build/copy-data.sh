#!/bin/bash

# Top level data directory
DATA_DIR="data-sources"

# Make data directory
echo "Creating $DATA_DIR/ if needed"
mkdir -p $DATA_DIR

# Clean out the data directory
echo "Cleaning up" $DATA_DIR
rm -rf $DATA_DIR/

# Loop over each item in RODA_SOURCES env var and git clone them,
# if none present, default to public source.
# RODA_SOURCES must be of form RODA_SOURCES=git@github.com:awslabs/repo1.git,git@github.com:awslabs/repo2.git
if [ -z ${RODA_SOURCES+x} ]; then RODA_SOURCES="git@github.com:awslabs/open-data-registry.git"; fi
REPOS=$(echo $RODA_SOURCES | tr "," "\n")

for repo in $REPOS
do
    echo "Cloning data for": $repo
    # Store in top level directory and make prettier name for folders
    dir="$DATA_DIR/$(cut -d ':' -f2 <<<$repo | tr "/" "-" | cut -d "." -f1)"
    git clone $repo $dir
done