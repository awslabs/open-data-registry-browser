#!/bin/bash

# Properly set BASE_URL
if [[ "$CODEBUILD_WEBHOOK_HEAD_REF" == "refs/heads/staging" ]]; then
	export BASE_URL=https://registry-staging.opendata.aws
else
	export BASE_URL=https://registry.opendata.aws
fi

echo Build site with base URL of $BASE_URL

# Build the site
npm run build