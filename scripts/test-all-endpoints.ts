import axios from 'axios';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:4000';

async function run() {
  console.log('Fetching OpenAPI schema from backend...');
  const res = await axios.get(`${BASE_URL}/api/docs-json`);
  const spec = res.data;
  const paths = spec.paths || {};

  console.log(`Found ${Object.keys(paths).length} API path definitions.`);

  // 1. Perform login to get JWT tokens for testing authenticated endpoints
  let superAdminToken = '';
  let schoolAdminToken = '';
  let teacherToken = '';
  let studentToken = '';

  try {
    const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      username: 'admin@rokadschool.ir',
      password: 'RokadAdminPass2026!',
    });
    superAdminToken = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
    console.log('Super Admin login successful.');
  } catch (err: any) {
    console.warn('Super Admin login failed (might need seed or tenant slug):', err?.response?.data?.message || err.message);
  }

  const results: {
    path: string;
    method: string;
    status: number;
    ok: boolean;
    note: string;
  }[] = [];

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods as any)) {
      if (['get', 'post', 'patch', 'put', 'delete'].indexOf(method.toLowerCase()) === -1) continue;

      // Replace path parameters with dummy valid IDs if needed
      let testUrl = path
        .replace('{id}', 'test-id')
        .replace('{slug}', 'rokad-boys')
        .replace('{studentId}', 'test-student-id')
        .replace('{classroomId}', 'test-classroom-id');

      const fullUrl = `${BASE_URL}/api/v1${testUrl.startsWith('/') ? testUrl : '/' + testUrl}`;

      try {
        let resp;
        const config: any = {
          headers: {
            'x-tenant-slug': 'rokad-boys',
            ...(superAdminToken ? { Authorization: `Bearer ${superAdminToken}` } : {}),
          },
          validateStatus: () => true, // Don't throw on 4xx/5xx
          timeout: 4000,
        };

        if (method.toLowerCase() === 'get') {
          resp = await axios.get(fullUrl, config);
        } else if (method.toLowerCase() === 'post') {
          resp = await axios.post(fullUrl, {}, config);
        } else if (method.toLowerCase() === 'patch') {
          resp = await axios.patch(fullUrl, {}, config);
        } else if (method.toLowerCase() === 'delete') {
          resp = await axios.delete(fullUrl, config);
        }

        const status = resp?.status || 0;
        const is500 = status >= 500;
        results.push({
          path,
          method: method.toUpperCase(),
          status,
          ok: !is500,
          note: is500 ? JSON.stringify(resp?.data) : (status === 200 || status === 201 ? 'Success' : `Handled status ${status}`),
        });
      } catch (e: any) {
        results.push({
          path,
          method: method.toUpperCase(),
          status: 0,
          ok: false,
          note: e.message,
        });
      }
    }
  }

  const failed500 = results.filter((r) => !r.ok || r.status >= 500);
  console.log('\n--- SCAN SUMMARY ---');
  console.log(`Total Endpoints Tested: ${results.length}`);
  console.log(`Healthy / Handled (2xx, 4xx): ${results.length - failed500.length}`);
  console.log(`Server Errors (500) / Crashes: ${failed500.length}`);

  if (failed500.length > 0) {
    console.log('\nEndpoints with 500 or errors:');
    failed500.forEach((f) => console.log(`[${f.method}] ${f.path} -> Status ${f.status}: ${f.note.substring(0, 120)}`));
  } else {
    console.log('\nALL ENDPOINTS RETURNED SAFE RESPONSES WITHOUT UNHANDLED 500 CRASHES!');
  }

  fs.writeFileSync('scripts/endpoint-audit-results.json', JSON.stringify(results, null, 2));
}

run().catch(console.error);
