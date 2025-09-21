#!/bin/bash

# Get auth token
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"admin@resourcemgmt.com","password":"password123"}' http://localhost:5432/api/v1/auth/login | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Getting all templates to clean up duplicates..."

# Get all templates and keep only latest of each unique name
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5432/api/v1/templates" | jq -r '
.templates 
| group_by(.name) 
| map(sort_by(.created_at) | reverse) 
| map(.[1:][]) 
| .[].id' | while read template_id; do
    if [ ! -z "$template_id" ]; then
        echo "Deleting duplicate template: $template_id"
        curl -s -H "Authorization: Bearer $TOKEN" -X DELETE "http://localhost:5432/api/v1/templates/$template_id" | jq -r '.message'
    fi
done

echo -e "\nFinal templates after cleanup:"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5432/api/v1/templates" | jq '.templates[] | {id: .id, name: .name, category: .category}'