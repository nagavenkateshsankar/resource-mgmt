#!/bin/bash

# Test database connection and check if admin user exists
echo "Testing database connection..."

# Test basic connection
echo "1. Testing basic connection:"
cockroach sql --insecure --host=nagaizingamacbookair.local:26257 --database=resourcedb --execute="SELECT 1 as test;"

echo -e "\n2. Checking if users table exists:"
cockroach sql --insecure --host=nagaizingamacbookair.local:26257 --database=resourcedb --execute="SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='users';"

echo -e "\n3. Checking admin user:"
cockroach sql --insecure --host=nagaizingamacbookair.local:26257 --database=resourcedb --execute="SELECT id, name, email, role FROM users WHERE email='admin@resourcemgmt.com';"

echo -e "\n4. Checking all users:"
cockroach sql --insecure --host=nagaizingamacbookair.local:26257 --database=resourcedb --execute="SELECT COUNT(*) as total_users FROM users;"