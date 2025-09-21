#!/bin/bash

# Get auth token
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"admin@resourcemgmt.com","password":"password123"}' http://localhost:5432/api/v1/auth/login | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Cleaning up duplicate templates..."

# Delete all old duplicates, keeping only the newest of each type and the Building Safety Inspection
TEMPLATES_TO_DELETE=(
    "1102946390298296321"  # General Safety Inspection (duplicate)
    "1101940698434142209"  # Equipment Inspection (duplicate)  
    "1101940698402652161"  # General Safety Inspection (duplicate)
    "1101940543361974273"  # Site Maintenance Review (duplicate)
    "1101940543342018561"  # Compliance Audit (duplicate)
    "1101940543316525057"  # Equipment Inspection (duplicate)
    "1101940543296733185"  # General Safety Inspection (duplicate)
    "1101807443713359873"  # Site Maintenance Review (duplicate)
    "1101807443687276545"  # Compliance Audit (duplicate)
    "1101807443658473473"  # Equipment Inspection (duplicate)
    "1101807443622625281"  # General Safety Inspection (duplicate)
    "1101807285286436865"  # Site Maintenance Review (duplicate)
    "1101807285260648449"  # Compliance Audit (duplicate)
    "1101807285233909761"  # Equipment Inspection (duplicate)
    "1101807285199306753"  # General Safety Inspection (duplicate)
)

for template_id in "${TEMPLATES_TO_DELETE[@]}"; do
    echo "Deleting template $template_id..."
    curl -H "Authorization: Bearer $TOKEN" -X DELETE "http://localhost:5432/api/v1/templates/$template_id"
    echo ""
done

echo "Cleanup complete! Checking remaining templates..."
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5432/api/v1/templates" | jq '.templates[] | {id: .id, name: .name, category: .category}'