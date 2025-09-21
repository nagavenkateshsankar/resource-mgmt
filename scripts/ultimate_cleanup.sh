#!/bin/bash

# Get auth token
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"admin@resourcemgmt.com","password":"password123"}' http://localhost:5432/api/v1/auth/login | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Final cleanup - keeping only unique template names..."

# Keep only these specific templates:
FINAL_TEMPLATES=(
    "1103227591115079681"  # Building Safety Inspection (has file upload!)
    "1101148598791766017"  # Site Maintenance Review  
    "1101148598765617153"  # Compliance Audit
    "1100688937171419137"  # Equipment Inspection (original from migration)
    "1100688937171320833"  # Safety Inspection (original from migration)
)

# Get all current templates
ALL_TEMPLATES=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5432/api/v1/templates" | jq -r '.templates[].id')

echo "Deleting duplicates..."
for template_id in $ALL_TEMPLATES; do
    KEEP=false
    for keep_id in "${FINAL_TEMPLATES[@]}"; do
        if [ "$template_id" = "$keep_id" ]; then
            KEEP=true
            echo "Keeping template: $template_id"
            break
        fi
    done
    
    if [ "$KEEP" = false ]; then
        echo "Deleting duplicate: $template_id"
        curl -s -H "Authorization: Bearer $TOKEN" -X DELETE "http://localhost:5432/api/v1/templates/$template_id" > /dev/null
    fi
done

echo -e "\n🎯 Final result - unique templates:"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5432/api/v1/templates" | jq '.templates[] | {id: .id, name: .name, category: .category}'

echo -e "\nTotal count:"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5432/api/v1/templates" | jq '.templates | length'