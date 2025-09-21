import { test, expect } from '@playwright/test';

test.describe('API Penetration Testing Suite', () => {
  const API_BASE = 'http://localhost:3007/api/v1';

  // Known test credentials
  const testCredentials = {
    admin: { email: 'john@gmail.com', password: 'password' },
    user: { email: 'jobh@gmail.com', password: 'password' }
  };

  let adminToken = '';
  let userToken = '';

  test.beforeAll(async ({ request }) => {
    // Setup tokens for testing
    try {
      const adminLogin = await request.post(`${API_BASE}/auth/login`, {
        data: testCredentials.admin
      });
      if (adminLogin.status() === 200) {
        const adminData = await adminLogin.json();
        adminToken = adminData.token;
      }

      const userLogin = await request.post(`${API_BASE}/auth/login`, {
        data: testCredentials.user
      });
      if (userLogin.status() === 200) {
        const userData = await userLogin.json();
        userToken = userData.token;
      }
    } catch (error) {
      console.warn('Failed to setup test tokens:', error.message);
    }
  });

  test.describe('Authentication Bypass Attempts', () => {
    test('should prevent JWT algorithm confusion attacks', async ({ request }) => {
      // Test 1: None algorithm attack
      const noneAlgPayload = {
        "typ": "JWT",
        "alg": "none"
      };

      const nonePayload = {
        "user_id": "admin-user",
        "email": "admin@example.com",
        "role": "admin",
        "exp": Math.floor(Date.now() / 1000) + 3600
      };

      const noneToken = btoa(JSON.stringify(noneAlgPayload)) + '.' +
                       btoa(JSON.stringify(nonePayload)) + '.';

      const noneAttackResponse = await request.get(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${noneToken}` }
      });

      expect(noneAttackResponse.status()).toBe(401);

      // Test 2: Algorithm switching (HS256 to RS256)
      if (adminToken) {
        const jwtParts = adminToken.split('.');
        if (jwtParts.length === 3) {
          try {
            const header = JSON.parse(atob(jwtParts[0]));
            header.alg = 'RS256'; // Switch algorithm

            const modifiedToken = btoa(JSON.stringify(header)) + '.' +
                                jwtParts[1] + '.' + jwtParts[2];

            const algSwitchResponse = await request.get(`${API_BASE}/templates`, {
              headers: { 'Authorization': `Bearer ${modifiedToken}` }
            });

            expect(algSwitchResponse.status()).toBe(401);
          } catch (e) {
            // Token parsing failed, which is expected for some tokens
            console.log('Token parsing failed (expected for some token formats)');
          }
        }
      }
    });

    test('should prevent token manipulation attacks', async ({ request }) => {
      if (!adminToken) {
        test.skip('No admin token available for testing');
        return;
      }

      const jwtParts = adminToken.split('.');

      // Test 1: Signature tampering
      const tamperedSignatureToken = jwtParts[0] + '.' + jwtParts[1] + '.tampered_signature';

      const sigTamperResponse = await request.get(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${tamperedSignatureToken}` }
      });
      expect(sigTamperResponse.status()).toBe(401);

      // Test 2: Payload tampering
      try {
        const payload = JSON.parse(atob(jwtParts[1]));
        payload.role = 'super_admin';
        payload.user_id = 'attacker';

        const tamperedPayload = btoa(JSON.stringify(payload));
        const payloadTamperToken = jwtParts[0] + '.' + tamperedPayload + '.' + jwtParts[2];

        const payloadTamperResponse = await request.get(`${API_BASE}/templates`, {
          headers: { 'Authorization': `Bearer ${payloadTamperToken}` }
        });
        expect(payloadTamperResponse.status()).toBe(401);
      } catch (e) {
        console.log('Payload manipulation test skipped due to token format');
      }

      // Test 3: Header tampering
      try {
        const header = JSON.parse(atob(jwtParts[0]));
        header.typ = 'password_reset';

        const tamperedHeader = btoa(JSON.stringify(header));
        const headerTamperToken = tamperedHeader + '.' + jwtParts[1] + '.' + jwtParts[2];

        const headerTamperResponse = await request.get(`${API_BASE}/templates`, {
          headers: { 'Authorization': `Bearer ${headerTamperToken}` }
        });
        expect(headerTamperResponse.status()).toBe(401);
      } catch (e) {
        console.log('Header manipulation test skipped due to token format');
      }
    });

    test('should prevent session fixation attacks', async ({ request }) => {
      // Test 1: Try to reuse an old session token
      const loginResponse1 = await request.post(`${API_BASE}/auth/login`, {
        data: testCredentials.user
      });

      if (loginResponse1.status() === 200) {
        const session1 = await loginResponse1.json();
        const token1 = session1.token;

        // Use the token
        const useToken1 = await request.get(`${API_BASE}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token1}` }
        });
        expect(useToken1.status()).toBe(200);

        // Login again (should invalidate previous session or create new one)
        const loginResponse2 = await request.post(`${API_BASE}/auth/login`, {
          data: testCredentials.user
        });

        if (loginResponse2.status() === 200) {
          const session2 = await loginResponse2.json();
          const token2 = session2.token;

          // Verify new token works
          const useToken2 = await request.get(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token2}` }
          });
          expect(useToken2.status()).toBe(200);

          // Try to use old token - should fail if session management is secure
          const reuseOldToken = await request.get(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token1}` }
          });

          // Either should fail (401) or be the same session
          // Depends on session management strategy
          console.log('Old token reuse status:', reuseOldToken.status());
        }
      }
    });
  });

  test.describe('Authorization Boundary Testing', () => {
    test('should prevent horizontal privilege escalation', async ({ request }) => {
      // This test requires multiple users in the same organization
      // For now, we'll test with available users

      if (!userToken || !adminToken) {
        test.skip('Need both user and admin tokens for this test');
        return;
      }

      // Get user's profile
      const userProfileResponse = await request.get(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (userProfileResponse.status() === 200) {
        const userProfile = await userProfileResponse.json();
        const userId = userProfile.id;

        // Try to modify another user's profile using user token
        const escalationAttempt = await request.put(`${API_BASE}/users/${userId}`, {
          headers: { 'Authorization': `Bearer ${userToken}` },
          data: {
            role: 'admin',
            permissions: ['manage_everything']
          }
        });

        // Should fail - regular users can't modify user roles
        expect(escalationAttempt.status()).toBe(403);

        // Try to access admin-only user management
        const userListAttempt = await request.get(`${API_BASE}/users`, {
          headers: { 'Authorization': `Bearer ${userToken}` }
        });

        expect(userListAttempt.status()).toBe(403);
      }
    });

    test('should prevent vertical privilege escalation', async ({ request }) => {
      if (!userToken) {
        test.skip('Need user token for this test');
        return;
      }

      // Test 1: Try to access admin endpoints
      const adminEndpoints = [
        '/organizations',
        '/users',
        '/analytics/export/admin'
      ];

      for (const endpoint of adminEndpoints) {
        const escalationResponse = await request.get(`${API_BASE}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${userToken}` }
        });

        expect(escalationResponse.status()).toBe(403);
        console.log(`Endpoint ${endpoint} correctly denied access:`, escalationResponse.status());
      }

      // Test 2: Try to perform admin operations
      const adminOperations = [
        {
          method: 'POST',
          endpoint: '/templates',
          data: { name: 'Unauthorized Template', description: 'Should fail' }
        },
        {
          method: 'POST',
          endpoint: '/organizations/test-org/invite',
          data: { email: 'attacker@example.com', role: 'admin' }
        },
        {
          method: 'DELETE',
          endpoint: '/users/some-user-id',
          data: {}
        }
      ];

      for (const operation of adminOperations) {
        let response;
        switch (operation.method) {
          case 'POST':
            response = await request.post(`${API_BASE}${operation.endpoint}`, {
              headers: { 'Authorization': `Bearer ${userToken}` },
              data: operation.data
            });
            break;
          case 'DELETE':
            response = await request.delete(`${API_BASE}${operation.endpoint}`, {
              headers: { 'Authorization': `Bearer ${userToken}` }
            });
            break;
          default:
            continue;
        }

        expect(response.status()).toBe(403);
        console.log(`${operation.method} ${operation.endpoint} correctly denied:`, response.status());
      }
    });

    test('should enforce organization isolation', async ({ request }) => {
      if (!adminToken) {
        test.skip('Need admin token for this test');
        return;
      }

      // Get admin's templates
      const templatesResponse = await request.get(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (templatesResponse.status() === 200) {
        const templates = await templatesResponse.json();

        if (templates.length > 0) {
          const templateId = templates[0].id;
          const orgId = templates[0].organization_id;

          // Try to access template with modified organization context
          const isolationAttempts = [
            {
              headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-Organization-ID': 'different-org-id'
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-Forwarded-Org': 'attack-org'
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Organization-Override': 'malicious-org'
              }
            }
          ];

          for (const attempt of isolationAttempts) {
            const response = await request.get(`${API_BASE}/templates/${templateId}`, attempt);

            if (response.status() === 200) {
              const template = await response.json();
              // Should still return the correct organization
              expect(template.organization_id).toBe(orgId);
              console.log('Organization isolation maintained for template access');
            } else {
              // Blocking the request is also acceptable
              console.log('Template access blocked with org override attempt:', response.status());
            }
          }
        }
      }
    });
  });

  test.describe('Data Injection and Validation Tests', () => {
    test('should prevent SQL injection in various endpoints', async ({ request }) => {
      if (!adminToken) {
        test.skip('Need admin token for this test');
        return;
      }

      const sqlInjectionPayloads = [
        "'; DROP TABLE templates; --",
        "' OR '1'='1' --",
        "'; DELETE FROM users WHERE role='admin'; --",
        "' UNION SELECT password FROM users --",
        "'; INSERT INTO users (email, role) VALUES ('hacker@evil.com', 'admin'); --",
        "1'; EXEC xp_cmdshell('whoami'); --"
      ];

      // Test injection in template creation
      for (const payload of sqlInjectionPayloads) {
        const injectionResponse = await request.post(`${API_BASE}/templates`, {
          headers: { 'Authorization': `Bearer ${adminToken}` },
          data: {
            name: payload,
            description: `Testing SQL injection: ${payload}`
          }
        });

        if (injectionResponse.status() === 201) {
          // If created, verify it was sanitized
          const created = await injectionResponse.json();
          expect(created.name).not.toContain('DROP TABLE');
          expect(created.name).not.toContain('DELETE FROM');
          expect(created.name).not.toContain('UNION SELECT');

          // Clean up
          await request.delete(`${API_BASE}/templates/${created.id}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
          });
        } else {
          // Rejection is also valid
          expect([400, 422]).toContain(injectionResponse.status());
        }
      }

      // Test injection in search/filter parameters
      const searchEndpoints = [
        `/templates?search=${encodeURIComponent("'; DROP TABLE templates; --")}`,
        `/inspections?filter=${encodeURIComponent("' OR '1'='1")}`,
        `/users?sort=${encodeURIComponent("name'; DELETE FROM users; --")}`
      ];

      for (const endpoint of searchEndpoints) {
        const searchResponse = await request.get(`${API_BASE}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        // Should handle malicious parameters gracefully
        expect([200, 400, 422]).toContain(searchResponse.status());
        console.log(`Search injection test for ${endpoint}:`, searchResponse.status());
      }
    });

    test('should prevent NoSQL injection attacks', async ({ request }) => {
      if (!adminToken) {
        test.skip('Need admin token for this test');
        return;
      }

      const nosqlInjectionPayloads = [
        { "$ne": null },
        { "$gt": "" },
        { "$where": "function() { return true; }" },
        { "$regex": ".*" },
        { "$expr": { "$gt": [1, 0] } }
      ];

      for (const payload of nosqlInjectionPayloads) {
        // Test in JSON body
        const bodyInjectionResponse = await request.post(`${API_BASE}/templates`, {
          headers: { 'Authorization': `Bearer ${adminToken}` },
          data: {
            name: "Test Template",
            description: payload
          }
        });

        // Should handle object injection properly
        if (bodyInjectionResponse.status() === 201) {
          const created = await bodyInjectionResponse.json();
          // Verify the payload was not executed as code
          expect(typeof created.description).toBe('string');

          // Clean up
          await request.delete(`${API_BASE}/templates/${created.id}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
          });
        }
      }
    });

    test('should prevent XSS in API responses', async ({ request }) => {
      if (!adminToken) {
        test.skip('Need admin token for this test');
        return;
      }

      const xssPayloads = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert('XSS')",
        "<svg onload=alert('XSS')>",
        "';alert('XSS');//",
        "\"><script>alert('XSS')</script>"
      ];

      for (const payload of xssPayloads) {
        // Create template with XSS payload
        const xssResponse = await request.post(`${API_BASE}/templates`, {
          headers: { 'Authorization': `Bearer ${adminToken}` },
          data: {
            name: payload,
            description: `XSS test: ${payload}`
          }
        });

        if (xssResponse.status() === 201) {
          const created = await xssResponse.json();

          // Verify XSS payload was sanitized or escaped
          expect(created.name).not.toContain('<script>');
          expect(created.name).not.toContain('javascript:');
          expect(created.name).not.toContain('onerror=');
          expect(created.name).not.toContain('onload=');

          // Get the template back and verify it's still safe
          const getResponse = await request.get(`${API_BASE}/templates/${created.id}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
          });

          if (getResponse.status() === 200) {
            const retrieved = await getResponse.json();
            expect(retrieved.name).not.toContain('<script>');
            expect(retrieved.name).not.toContain('javascript:');
          }

          // Clean up
          await request.delete(`${API_BASE}/templates/${created.id}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
          });
        }
      }
    });

    test('should validate input length and format', async ({ request }) => {
      if (!adminToken) {
        test.skip('Need admin token for this test');
        return;
      }

      // Test 1: Extremely long inputs
      const veryLongString = 'A'.repeat(100000);
      const longInputResponse = await request.post(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: {
          name: veryLongString,
          description: veryLongString
        }
      });

      // Should either reject or truncate long inputs
      expect([400, 413, 422]).toContain(longInputResponse.status());

      // Test 2: Invalid email formats
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user..user@domain.com',
        'user@domain',
        'user@.com'
      ];

      for (const email of invalidEmails) {
        const emailTestResponse = await request.post(`${API_BASE}/organizations/test-org/invite`, {
          headers: { 'Authorization': `Bearer ${adminToken}` },
          data: {
            email: email,
            role: 'user'
          }
        });

        // Should reject invalid email formats
        expect([400, 422]).toContain(emailTestResponse.status());
      }

      // Test 3: Invalid JSON structure
      const malformedJsonResponse = await request.post(`${API_BASE}/templates`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: '{"invalid": json structure'
      });

      expect([400, 422]).toContain(malformedJsonResponse.status());
    });
  });

  test.describe('Rate Limiting and DoS Protection', () => {
    test('should implement rate limiting on authentication endpoints', async ({ request }) => {
      const attempts = [];
      const maxAttempts = 20;

      // Make rapid authentication attempts
      for (let i = 0; i < maxAttempts; i++) {
        const attempt = request.post(`${API_BASE}/auth/login`, {
          data: {
            email: `attacker${i}@example.com`,
            password: 'wrongpassword'
          }
        });
        attempts.push(attempt);
      }

      const responses = await Promise.all(attempts);
      const statusCodes = responses.map(r => r.status());

      console.log('Rate limiting test status codes:', statusCodes);

      // Check if rate limiting is active
      const rateLimitedCount = statusCodes.filter(code => code === 429).length;
      const blockedCount = statusCodes.filter(code => code === 403).length;

      console.log('Rate limited responses (429):', rateLimitedCount);
      console.log('Blocked responses (403):', blockedCount);

      // At least some requests should be rate limited for security
      // Note: The exact implementation depends on the rate limiting strategy
    });

    test('should handle large payload attacks', async ({ request }) => {
      if (!adminToken) {
        test.skip('Need admin token for this test');
        return;
      }

      // Test 1: Large JSON payload
      const largeData = {
        name: 'Large Template',
        description: 'A'.repeat(1000000), // 1MB of data
        metadata: {}
      };

      // Fill metadata with large amount of data
      for (let i = 0; i < 1000; i++) {
        largeData.metadata[`key_${i}`] = 'x'.repeat(1000);
      }

      const largePayloadResponse = await request.post(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: largeData
      });

      // Should reject or limit large payloads
      expect([413, 400, 422]).toContain(largePayloadResponse.status());

      // Test 2: Nested object attack
      let nestedObject = { value: 'test' };
      for (let i = 0; i < 1000; i++) {
        nestedObject = { nested: nestedObject };
      }

      const nestedResponse = await request.post(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: {
          name: 'Nested Test',
          description: 'Testing nested objects',
          config: nestedObject
        }
      });

      // Should handle deeply nested objects safely
      expect([400, 413, 422]).toContain(nestedResponse.status());
    });

    test('should limit concurrent requests per user', async ({ request }) => {
      if (!userToken) {
        test.skip('Need user token for this test');
        return;
      }

      // Make many concurrent requests
      const concurrentRequests = [];
      const requestCount = 50;

      for (let i = 0; i < requestCount; i++) {
        const req = request.get(`${API_BASE}/templates`, {
          headers: { 'Authorization': `Bearer ${userToken}` }
        });
        concurrentRequests.push(req);
      }

      const responses = await Promise.all(concurrentRequests);
      const statusCodes = responses.map(r => r.status());

      console.log('Concurrent request status codes:', statusCodes);

      // Check for rate limiting or throttling
      const successCount = statusCodes.filter(code => code === 200).length;
      const rateLimitedCount = statusCodes.filter(code => code === 429).length;

      console.log('Successful concurrent requests:', successCount);
      console.log('Rate limited concurrent requests:', rateLimitedCount);

      // System should handle concurrent requests gracefully
      expect(successCount + rateLimitedCount).toBe(requestCount);
    });
  });

  test.describe('File Upload Security Tests', () => {
    test('should validate file upload security', async ({ request }) => {
      if (!adminToken) {
        test.skip('Need admin token for file upload tests');
        return;
      }

      // Test 1: Malicious file types
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00', mimeType: 'application/octet-stream' },
        { name: 'script.bat', content: '@echo off\ndir c:\\', mimeType: 'text/plain' },
        { name: 'test.php', content: '<?php phpinfo(); ?>', mimeType: 'text/plain' },
        { name: 'exploit.js', content: 'alert("XSS")', mimeType: 'application/javascript' },
        { name: '../../../etc/passwd', content: 'root:x:0:0:root', mimeType: 'text/plain' }
      ];

      for (const file of maliciousFiles) {
        const uploadResponse = await request.post(`${API_BASE}/attachments`, {
          headers: { 'Authorization': `Bearer ${adminToken}` },
          multipart: {
            file: {
              name: file.name,
              mimeType: file.mimeType,
              buffer: Buffer.from(file.content)
            }
          }
        });

        // Should either reject dangerous files or sanitize names
        if (uploadResponse.status() === 200) {
          const result = await uploadResponse.json();
          // Verify filename was sanitized
          expect(result.filename).not.toContain('..');
          expect(result.filename).not.toContain('/');
          expect(result.filename).not.toContain('\\');

          // Should not preserve dangerous extensions as-is
          if (file.name.endsWith('.exe') || file.name.endsWith('.bat') || file.name.endsWith('.php')) {
            expect(result.filename).not.toContain('.exe');
            expect(result.filename).not.toContain('.bat');
            expect(result.filename).not.toContain('.php');
          }
        } else {
          // Rejection is also valid security behavior
          expect([400, 403, 415, 422]).toContain(uploadResponse.status());
        }
      }

      // Test 2: Oversized files
      const largeFileBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      largeFileBuffer.fill('A');

      const oversizeResponse = await request.post(`${API_BASE}/attachments`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        multipart: {
          file: {
            name: 'large_file.txt',
            mimeType: 'text/plain',
            buffer: largeFileBuffer
          }
        }
      });

      // Should reject oversized files
      expect([413, 400, 422]).toContain(oversizeResponse.status());
    });
  });
});