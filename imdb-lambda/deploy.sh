#!/bin/bash

S3_Bucket=johns-s3

sam package --template-file template.yaml --s3-bucket $S3_Bucket --output-template-file packaged-template.yaml --region ap-southeast-2
sam deploy --template-file packaged-template.yaml --stack-name imdb-search --capabilities CAPABILITY_IAM --region ap-southeast-2
