#!/bin/bash

echo Current branch is $CODEBUILD_WEBHOOK_HEAD_REF and source is $CODEBUILD_SOURCE_VERSION

if [[ "$CODEBUILD_WEBHOOK_HEAD_REF" == "refs/heads/master" && ${CODEBUILD_SOURCE_VERSION:0:3} != "pr/" ]]; then
    echo Deploying dist/ to production S3 bucket and invalidating CloudFront cache.

	# Sync files to S3, removing files that no longer exist
	aws s3 sync dist/ s3://registry.opendata.aws/ --delete

	# Invalidate CDN cache
	aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DIST_ID --paths "/*"
elif [[ "$CODEBUILD_WEBHOOK_HEAD_REF" == "refs/heads/staging" && ${CODEBUILD_SOURCE_VERSION:0:3} != "pr/" ]]; then
    echo Creating restrictive robots.txt and deploying dist/ to staging S3 bucket.

    echo "User-agent: *" > dist/robots.txt
    echo "Disallow: /" >> dist/robots.txt

	# Sync files to S3, removing files that no longer exist
	aws s3 sync dist/ s3://registry-staging.opendata.aws/ --delete
else
    echo No deploy needed.
fi