#!/bin/bash

S3_Bucket=johns-aws

sam package --template-file template.yaml --s3-bucket $S3_Bucket --output-template-file packaged-template.yaml
sam deploy --template-file packaged-template.yaml --stack-name imdb-search --capabilities CAPABILITY_IAM
