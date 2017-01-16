#!/bin/bash

npm run bundle

cd dist
git init
git config user.name "Circle-CI"
git config user.email "circle@somewhere.com"
git add .
git commit -m "CI deploy to gh-pages"
git push --force --quiet "git@github.com:parkmath/edit" master:gh-pages
