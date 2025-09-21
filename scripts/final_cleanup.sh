#!/bin/bash

# Get auth token
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"admin@resourcemgmt.com","password":"password123"}' http://localhost:5432/api/v1/auth/login | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Aggressively cleaning up all duplicates, keeping only newest + Building Safety Inspection..."

# Keep only these IDs (newest of each type + Building Safety Inspection):
# 1103226805905850369 - Building Safety Inspection  
# 1103217906775818241 - Site Maintenance Review (newest)
# 1103217906750849025 - Compliance Audit (newest)
# 1103217906714574849 - Equipment Inspection (newest)
# 1103217906641043457 - General Safety Inspection (newest)

TEMPLATES_TO_KEEP=(
    "1103226805905850369"  # Building Safety Inspection
    "1103217906775818241"  # Site Maintenance Review
    "1103217906750849025"  # Compliance Audit  
    "1103217906714574849"  # Equipment Inspection
    "1103217906641043457"  # General Safety Inspection
)

# Get all template IDs
ALL_TEMPLATES=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5432/api/v1/templates" | jq -r '.templates[].id')

for template_id in $ALL_TEMPLATES; do
    # Check if this template should be kept
    KEEP=false
    for keep_id in "${TEMPLATES_TO_KEEP[@]}"; do
        if [ "$template_id" = "$keep_id" ]; then
            KEEP=true
            break
        fi
    done
    
    # Delete if not in keep list
    if [ "$KEEP" = false ]; then
        echo "Deleting template: $template_id"
        curl -s -H "Authorization: Bearer $TOKEN" -X DELETE "http://localhost:5432/api/v1/templates/$template_id" | jq -r '.message'
    fi
done

echo -e "\nFinal templates (should be 5 total):"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5432/api/v1/templates" | jq '.templates[] | {id: .id, name: .name, category: .category}'