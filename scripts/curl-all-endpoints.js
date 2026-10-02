const http = require('http');
const fs = require('fs');

const BASE_HOST = 'localhost';
const BASE_PORT = 4000;

function httpRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers,
      'Content-Type': 'application/json',
      ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
    };

    const req = http.request(
      {
        host: BASE_HOST,
        port: BASE_PORT,
        method: method,
        path: path,
        headers: reqHeaders,
        timeout: 4000,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: rawData,
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        status: 0,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 0,
        error: 'Timeout',
      });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  console.log('1. Fetching OpenAPI schema from http://localhost:4000/api/docs-json ...');
  const specRes = await httpRequest('GET', '/api/docs-json');
  if (specRes.status !== 200) {
    console.error('Failed to fetch OpenAPI spec:', specRes);
    return;
  }

  const spec = JSON.parse(specRes.body);
  const paths = spec.paths || {};
  console.log(`Discovered ${Object.keys(paths).length} API path definitions.`);

  // 2. Authenticate
  let token = '';
  try {
    const loginRes = await httpRequest('POST', '/api/v1/auth/login', { 'x-tenant-slug': 'platform-root' }, {
      identifier: '09120000000',
      password: 'RokadAdminPass2026!',
    });
    if (loginRes.status === 200 || loginRes.status === 201) {
      const data = JSON.parse(loginRes.body);
      token = data?.data?.accessToken || data?.accessToken || '';
      console.log('Super Admin login succeeded! Token acquired.');
    } else {
      console.log(`Login response status ${loginRes.status}: ${loginRes.body.slice(0, 150)}`);
    }
  } catch (e) {
    console.warn('Login attempt threw:', e.message);
  }

  const results = [];
  const entries = Object.entries(paths);

  for (const [pathKey, methods] of entries) {
    for (const [method, op] of Object.entries(methods)) {
      const m = method.toLowerCase();
      if (!['get', 'post', 'patch', 'put', 'delete'].includes(m)) continue;

      let subPath = pathKey
        .replace('{id}', '00000000-0000-0000-0000-000000000000')
        .replace('{slug}', 'rokad-boys')
        .replace('{studentId}', '00000000-0000-0000-0000-000000000000')
        .replace('{classroomId}', '00000000-0000-0000-0000-000000000000')
        .replace('{lessonId}', '00000000-0000-0000-0000-000000000000')
        .replace('{teacherId}', '00000000-0000-0000-0000-000000000000')
        .replace('{submissionId}', '00000000-0000-0000-0000-000000000000')
        .replace('{participationId}', '00000000-0000-0000-0000-000000000000')
        .replace('{moduleName}', 'homework')
        .replace('{filename}', 'test.pdf')
        .replace('{tenantId}', '00000000-0000-0000-0000-000000000000');

      const fullPath = subPath.startsWith('/api/v1')
        ? subPath
        : `/api/v1${subPath.startsWith('/') ? subPath : '/' + subPath}`;

      const headers = {
        'x-tenant-slug': 'rokad-boys',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await httpRequest(m.toUpperCase(), fullPath, headers, m !== 'get' && m !== 'delete' ? {} : null);
      const is500 = res.status >= 500;
      results.push({
        method: m.toUpperCase(),
        path: pathKey,
        testedUrl: fullPath,
        status: res.status,
        ok: !is500 && res.status !== 0,
        response: res.body ? res.body.slice(0, 150) : res.error,
      });
    }
  }

  const failed500 = results.filter((r) => r.status >= 500 || r.status === 0);
  const success2xx = results.filter((r) => r.status >= 200 && r.status < 300);
  const clientErrors4xx = results.filter((r) => r.status >= 400 && r.status < 500);

  console.log('\n========================================');
  console.log('       ENDPOINT AUDIT REPORT');
  console.log('========================================');
  console.log(`Total Endpoints Tested: ${results.length}`);
  console.log(`2xx Success (Authorized/Valid): ${success2xx.length}`);
  console.log(`4xx Client Error (Guarded/Validation/Auth/NotFound): ${clientErrors4xx.length}`);
  console.log(`5xx Unhandled Server Crashes: ${failed500.length}`);
  console.log('========================================\n');

  if (failed500.length > 0) {
    console.log('Endpoints triggering 500 or errors:');
    failed500.forEach((f) => {
      console.log(`- [${f.method}] ${f.path} (Status ${f.status}): ${f.response}`);
    });
  } else {
    console.log('ALL API ENDPOINTS PASSED SAFELY! (No unhandled server errors / 500 crashes found)');
  }

  fs.writeFileSync('scripts/audit-summary.json', JSON.stringify(results, null, 2));
}

run().catch(console.error);
