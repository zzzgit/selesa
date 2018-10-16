#!/bin/sh
data=`node ./bin/generator.js upload`
echo $data
curl -H "Authorization: bearer 620538d81b54df8bf36ebe51ad9751126a7106c8" -X POST -d "$data" https://api.github.com/graphql