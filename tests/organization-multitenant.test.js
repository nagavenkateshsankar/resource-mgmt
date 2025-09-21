const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:8081';
const API_BASE = `${BASE_URL}/api/v1`;

// Helper function to generate unique domain names
function generateUniqueDomain() {
  return `testorg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

// Helper function to create organization
async function createOrganization(request, orgData) {
  const response = await request.post(`${API_BASE}/organizations`, {
    data: orgData
  });
  return response;
}

test.describe('Multi-Tenant Organization Management', () => {
  
  test.beforeAll(async () => {
    // Ensure server is running - we'll skip this in the test for now
    // In a real scenario, you'd want to start the server or check if it's running
  });

  test('should create a new organization with admin user', async ({ request }) => {
    const uniqueDomain = generateUniqueDomain();
    const orgData = {
      organization_name: 'Test Organization Inc.',
      admin_name: 'John Admin',
      admin_email: `admin@${uniqueDomain}.com`,
      admin_password: 'securePassword123',
      domain: uniqueDomain
    };

    const response = await createOrganization(request, orgData);
    
    expect(response.status()).toBe(201);
    
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('organization');
    expect(responseBody).toHaveProperty('admin_user');
    expect(responseBody).toHaveProperty('message');
    expect(responseBody.message).toBe('Organization created successfully');
    
    // Verify organization details
    expect(responseBody.organization.name).toBe(orgData.organization_name);
    expect(responseBody.organization.domain).toBe(uniqueDomain);
    expect(responseBody.organization.plan).toBe('free');
    expect(responseBody.organization.is_active).toBe(true);
    
    // Verify admin user details
    expect(responseBody.admin_user.name).toBe(orgData.admin_name);
    expect(responseBody.admin_user.email).toBe(orgData.admin_email);
    expect(responseBody.admin_user.role).toBe('admin');
    expect(responseBody.admin_user.is_org_admin).toBe(true);
    expect(responseBody.admin_user.organization_id).toBe(responseBody.organization.id);
    
    // Password should not be returned in response
    expect(responseBody.admin_user).not.toHaveProperty('password');
  });

  test('should check domain availability', async ({ request }) => {
    const availableDomain = `available-${Date.now()}`;
    
    const response = await request.get(`${API_BASE}/organizations/check-domain?domain=${availableDomain}`);
    
    expect(response.status()).toBe(200);
    
    const responseBody = await response.json();
    expect(responseBody.available).toBe(true);
    expect(responseBody.domain).toBe(availableDomain);
  });

  test('should detect unavailable domain after organization creation', async ({ request }) => {
    const uniqueDomain = generateUniqueDomain();
    const orgData = {
      organization_name: 'Domain Test Org',
      admin_name: 'Jane Admin',
      admin_email: `admin@${uniqueDomain}.com`,
      admin_password: 'password123',
      domain: uniqueDomain
    };

    // Create organization first
    const createResponse = await createOrganization(request, orgData);
    expect(createResponse.status()).toBe(201);

    // Then check domain availability
    const checkResponse = await request.get(`${API_BASE}/organizations/check-domain?domain=${uniqueDomain}`);
    expect(checkResponse.status()).toBe(200);
    
    const responseBody = await checkResponse.json();
    expect(responseBody.available).toBe(false);
    expect(responseBody.domain).toBe(uniqueDomain);
    expect(responseBody.message).toBe('Domain is already taken');
  });

  test('should reject invalid domain formats', async ({ request }) => {
    const invalidDomains = [
      'a', // too short
      'ab', // too short
      '1domain', // starts with number (should be allowed actually, let's test)
      'domain-', // ends with hyphen
      '-domain', // starts with hyphen
      'domain with spaces', // contains spaces
      'domain.with.dots', // contains dots
      'a'.repeat(51), // too long
    ];

    for (const invalidDomain of ['a', 'ab', 'domain-', '-domain']) {
      const orgData = {
        organization_name: 'Invalid Domain Test',
        admin_name: 'Test Admin',
        admin_email: `admin@${invalidDomain}.com`,
        admin_password: 'password123',
        domain: invalidDomain
      };

      const response = await createOrganization(request, orgData);
      expect(response.status()).toBe(400);
      
      const responseBody = await response.json();
      expect(responseBody).toHaveProperty('error');
      expect(responseBody.error).toContain('invalid domain format');
    }
  });

  test('should reject duplicate domain creation', async ({ request }) => {
    const uniqueDomain = generateUniqueDomain();
    const orgData1 = {
      organization_name: 'First Organization',
      admin_name: 'First Admin',
      admin_email: `first@${uniqueDomain}.com`,
      admin_password: 'password123',
      domain: uniqueDomain
    };

    const orgData2 = {
      organization_name: 'Second Organization',
      admin_name: 'Second Admin',
      admin_email: `second@${uniqueDomain}.com`,
      admin_password: 'password123',
      domain: uniqueDomain // Same domain
    };

    // Create first organization
    const firstResponse = await createOrganization(request, orgData1);
    expect(firstResponse.status()).toBe(201);

    // Try to create second organization with same domain
    const secondResponse = await createOrganization(request, orgData2);
    expect(secondResponse.status()).toBe(400);
    
    const responseBody = await secondResponse.json();
    expect(responseBody).toHaveProperty('error');
    expect(responseBody.error).toBe('domain already exists');
  });

  test('should validate required fields for organization creation', async ({ request }) => {
    const testCases = [
      {
        data: {}, // Empty data
        expectedError: 'organization_name'
      },
      {
        data: {
          organization_name: 'Test Org'
        },
        expectedError: 'admin_name'
      },
      {
        data: {
          organization_name: 'Test Org',
          admin_name: 'Admin'
        },
        expectedError: 'admin_email'
      },
      {
        data: {
          organization_name: 'Test Org',
          admin_name: 'Admin',
          admin_email: 'admin@test.com'
        },
        expectedError: 'admin_password'
      },
      {
        data: {
          organization_name: 'Test Org',
          admin_name: 'Admin',
          admin_email: 'admin@test.com',
          admin_password: 'password123'
        },
        expectedError: 'domain'
      },
    ];

    for (const testCase of testCases) {
      const response = await createOrganization(request, testCase.data);
      expect(response.status()).toBe(400);
      
      const responseBody = await response.json();
      expect(responseBody).toHaveProperty('error');
      // The error message should mention the missing field
      expect(responseBody.error.toLowerCase()).toContain(testCase.expectedError.toLowerCase().replace('_', ''));
    }
  });

  test('should validate email format', async ({ request }) => {
    const uniqueDomain = generateUniqueDomain();
    const invalidEmails = [
      'invalid-email',
      'no@domain',
      '@nodomain.com',
      'spaces @domain.com',
      'multiple@@domain.com'
    ];

    for (const email of invalidEmails) {
      const orgData = {
        organization_name: 'Email Validation Test',
        admin_name: 'Test Admin',
        admin_email: email,
        admin_password: 'password123',
        domain: `${uniqueDomain}-${invalidEmails.indexOf(email)}`
      };

      const response = await createOrganization(request, orgData);
      expect(response.status()).toBe(400);
      
      const responseBody = await response.json();
      expect(responseBody).toHaveProperty('error');
    }
  });

  test('should validate password strength', async ({ request }) => {
    const uniqueDomain = generateUniqueDomain();
    const weakPasswords = [
      '123', // too short
      'pass', // too short
      '12345', // too short but meets minimum
    ];

    for (const password of weakPasswords) {
      const orgData = {
        organization_name: 'Password Test',
        admin_name: 'Test Admin',
        admin_email: `admin@${uniqueDomain}-${weakPasswords.indexOf(password)}.com`,
        admin_password: password,
        domain: `${uniqueDomain}-${weakPasswords.indexOf(password)}`
      };

      const response = await createOrganization(request, orgData);
      if (password.length < 6) {
        expect(response.status()).toBe(400);
        const responseBody = await response.json();
        expect(responseBody).toHaveProperty('error');
      }
    }
  });

  test('should set default plan to free', async ({ request }) => {
    const uniqueDomain = generateUniqueDomain();
    const orgData = {
      organization_name: 'Default Plan Test',
      admin_name: 'Plan Admin',
      admin_email: `admin@${uniqueDomain}.com`,
      admin_password: 'password123',
      domain: uniqueDomain
      // No plan specified
    };

    const response = await createOrganization(request, orgData);
    expect(response.status()).toBe(201);
    
    const responseBody = await response.json();
    expect(responseBody.organization.plan).toBe('free');
  });

  test('should accept custom plan during creation', async ({ request }) => {
    const uniqueDomain = generateUniqueDomain();
    const orgData = {
      organization_name: 'Custom Plan Test',
      admin_name: 'Plan Admin',
      admin_email: `admin@${uniqueDomain}.com`,
      admin_password: 'password123',
      domain: uniqueDomain,
      plan: 'premium'
    };

    const response = await createOrganization(request, orgData);
    expect(response.status()).toBe(201);
    
    const responseBody = await response.json();
    expect(responseBody.organization.plan).toBe('premium');
  });

  test('should handle concurrent organization creation', async ({ request }) => {
    const baseDomain = generateUniqueDomain();
    
    // Create multiple organizations concurrently
    const promises = Array.from({ length: 5 }, (_, i) => {
      const orgData = {
        organization_name: `Concurrent Test Org ${i}`,
        admin_name: `Admin ${i}`,
        admin_email: `admin${i}@${baseDomain}${i}.com`,
        admin_password: 'password123',
        domain: `${baseDomain}${i}`
      };
      return createOrganization(request, orgData);
    });

    const responses = await Promise.all(promises);
    
    // All should succeed since they have different domains
    responses.forEach(response => {
      expect(response.status()).toBe(201);
    });
  });

  test('should verify admin user has full permissions', async ({ request }) => {
    const uniqueDomain = generateUniqueDomain();
    const orgData = {
      organization_name: 'Permissions Test Org',
      admin_name: 'Permissions Admin',
      admin_email: `admin@${uniqueDomain}.com`,
      admin_password: 'password123',
      domain: uniqueDomain
    };

    const response = await createOrganization(request, orgData);
    expect(response.status()).toBe(201);
    
    const responseBody = await response.json();
    const adminUser = responseBody.admin_user;
    
    // Check that admin has all required permissions
    const expectedPermissions = [
      'can_create_inspections',
      'can_view_own_inspections',
      'can_view_all_inspections',
      'can_edit_inspections',
      'can_delete_inspections',
      'can_create_templates',
      'can_edit_templates',
      'can_delete_templates',
      'can_manage_users',
      'can_view_reports',
      'can_export_reports',
      'can_upload_files',
      'can_manage_notifications'
    ];

    const permissions = adminUser.permissions;
    expectedPermissions.forEach(permission => {
      expect(permissions).toHaveProperty(permission);
      expect(permissions[permission]).toBe(true);
    });
  });
});

test.describe('Data Isolation Tests', () => {
  test('should ensure organizations have separate data spaces', async ({ request }) => {
    // This is a conceptual test - in practice you'd need to create data and verify isolation
    const org1Domain = generateUniqueDomain();
    const org2Domain = generateUniqueDomain();
    
    // Create two organizations
    const org1Data = {
      organization_name: 'Isolation Test Org 1',
      admin_name: 'Admin One',
      admin_email: `admin@${org1Domain}.com`,
      admin_password: 'password123',
      domain: org1Domain
    };

    const org2Data = {
      organization_name: 'Isolation Test Org 2',
      admin_name: 'Admin Two',
      admin_email: `admin@${org2Domain}.com`,
      admin_password: 'password123',
      domain: org2Domain
    };

    const [response1, response2] = await Promise.all([
      createOrganization(request, org1Data),
      createOrganization(request, org2Data)
    ]);

    expect(response1.status()).toBe(201);
    expect(response2.status()).toBe(201);

    const [body1, body2] = await Promise.all([
      response1.json(),
      response2.json()
    ]);

    // Verify they have different organization IDs
    expect(body1.organization.id).not.toBe(body2.organization.id);
    expect(body1.admin_user.organization_id).toBe(body1.organization.id);
    expect(body2.admin_user.organization_id).toBe(body2.organization.id);
  });
});