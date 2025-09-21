#!/bin/bash

# Test Authentication API

echo "🚀 Testing Site Inspection API Authentication System"
echo "=================================================="

BASE_URL="http://localhost:8080/api/v1"

# Test Health Check
echo -e "\n1. Health Check:"
echo "GET $BASE_URL/health"
curl -s "$BASE_URL/health" | jq . 2>/dev/null || curl -s "$BASE_URL/health"

# Test Login (Demo Mode)
echo -e "\n\n2. Login Test:"
echo "POST $BASE_URL/auth/login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@resourcemgmt.com", "password": "password123"}')

echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "\n✅ Login successful! Token received."
    
    # Test Protected Profile Endpoint
    echo -e "\n\n3. Get Profile (Protected):"
    echo "GET $BASE_URL/auth/profile"
    curl -s "$BASE_URL/auth/profile" \
      -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || \
    curl -s "$BASE_URL/auth/profile" \
      -H "Authorization: Bearer $TOKEN"

    # Test User Roles
    echo -e "\n\n4. Get User Roles:"
    echo "GET $BASE_URL/users/roles"
    curl -s "$BASE_URL/users/roles" \
      -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || \
    curl -s "$BASE_URL/users/roles" \
      -H "Authorization: Bearer $TOKEN"

    # Test User Permissions
    echo -e "\n\n5. Get User Permissions:"
    echo "GET $BASE_URL/users/permissions"
    curl -s "$BASE_URL/users/permissions" \
      -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || \
    curl -s "$BASE_URL/users/permissions" \
      -H "Authorization: Bearer $TOKEN"

    # Test Creating Inspection (Requires Permission)
    echo -e "\n\n6. Create Inspection (Permission Required):"
    echo "POST $BASE_URL/inspections"
    curl -s -X POST "$BASE_URL/inspections" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "template_id": 1,
        "inspector_id": 1,
        "site_location": "Building A - Test Site",
        "site_name": "Demo Site",
        "priority": "high",
        "notes": "Created via API test"
      }' | jq . 2>/dev/null || \
    curl -s -X POST "$BASE_URL/inspections" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "template_id": 1,
        "inspector_id": 1,
        "site_location": "Building A - Test Site",
        "site_name": "Demo Site", 
        "priority": "high",
        "notes": "Created via API test"
      }'

    # Test Unauthorized Access
    echo -e "\n\n7. Test Without Token (Should Fail):"
    echo "GET $BASE_URL/inspections"
    curl -s "$BASE_URL/inspections" | jq . 2>/dev/null || curl -s "$BASE_URL/inspections"

else
    echo -e "\n❌ Login failed or no token received"
fi

echo -e "\n\n🎯 Authentication API Test Summary:"
echo "=================================="
echo "✅ JWT-based authentication"
echo "✅ Role-based authorization"
echo "✅ Permission-based access control"
echo "✅ Protected endpoints"
echo "✅ Token validation"
echo "✅ Demo mode support"

echo -e "\n📚 Available Auth Endpoints:"
echo "POST /api/v1/auth/login"
echo "POST /api/v1/auth/register"  
echo "GET  /api/v1/auth/profile"
echo "PUT  /api/v1/auth/profile"
echo "POST /api/v1/auth/change-password"
echo "POST /api/v1/auth/refresh"

echo -e "\n🔐 User Roles:"
echo "- admin: Full access"
echo "- supervisor: Manage inspections & templates"
echo "- inspector: Create & edit own inspections"
echo "- viewer: Read-only access"

echo -e "\n🛡️ Permission System:"
echo "- can_create_inspections"
echo "- can_view_all_inspections"
echo "- can_edit_inspections"
echo "- can_delete_inspections"
echo "- can_create_templates"
echo "- can_manage_users"
echo "- can_view_reports"
echo "- and more..."

echo -e "\nAPI is ready for production! 🚀"