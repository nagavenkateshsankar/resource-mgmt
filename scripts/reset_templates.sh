#!/bin/bash

# Get auth token
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"admin@resourcemgmt.com","password":"password123"}' http://localhost:5432/api/v1/auth/login | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Deleting ALL templates to start fresh..."

# Get all template IDs and delete them
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5432/api/v1/templates" | jq -r '.templates[].id' | while read template_id; do
    if [ ! -z "$template_id" ]; then
        echo "Deleting template: $template_id"
        curl -s -H "Authorization: Bearer $TOKEN" -X DELETE "http://localhost:5432/api/v1/templates/$template_id" | jq -r '.message'
    fi
done

echo -e "\nAll templates deleted. Now adding the Building Safety Inspection template back..."
curl -s -H "Authorization: Bearer $TOKEN" -X POST -H "Content-Type: application/json" -d @sample_template.json "http://localhost:5432/api/v1/templates" | jq '{id: .id, name: .name, category: .category}'

echo -e "\nFinal check - templates now in database:"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5432/api/v1/templates" | jq '.templates[] | {id: .id, name: .name, category: .category}'