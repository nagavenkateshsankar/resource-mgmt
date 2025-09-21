const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:8081';
const API_BASE = `${BASE_URL}/api/v1`;

// Helper function to generate unique domain names (alphanumeric only)
function generateUniqueDomain() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5);
  return `testorg${timestamp.substr(-6)}${random}`;
}

test.describe('Debug Organization API', () => {
  test('debug organization creation', async ({ request }) => {
    const uniqueDomain = generateUniqueDomain();
    const orgData = {
      organization_name: 'Debug Test Organization',
      admin_name: 'Debug Admin',
      admin_email: `admin@${uniqueDomain}.com`,
      admin_password: 'securePassword123',
      domain: uniqueDomain
    };

    console.log('Sending request with data:', JSON.stringify(orgData, null, 2));

    const response = await request.post(`${API_BASE}/organizations`, {
      data: orgData
    });
    
    const status = response.status();
    const responseBody = await response.json();
    
    console.log('Response status:', status);
    console.log('Response body:', JSON.stringify(responseBody, null, 2));
    
    if (status !== 201) {
      console.log('FAILED: Expected 201, got', status);
    } else {
      console.log('SUCCESS: Organization created');
    }
  });

  test('test simple API health check', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    const status = response.status();
    const body = await response.json();
    
    console.log('Health check status:', status);
    console.log('Health check body:', JSON.stringify(body, null, 2));
    
    expect(status).toBe(200);
  });
});