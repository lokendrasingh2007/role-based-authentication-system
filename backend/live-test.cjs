/**
 * live-test.cjs — End-to-end API tests against the running backend.
 * Run: node live-test.cjs
 * Requires backend on http://localhost:4000
 */
'use strict';
const http = require('http');

const BASE_HOSTNAME = 'localhost';
const BASE_PORT = 4000;

let passed = 0;
let failed = 0;

function req(method, path, body, cookieStr) {
  return new Promise(function(resolve, reject) {
    var postData = body ? JSON.stringify(body) : null;
    var headers = { 'Content-Type': 'application/json' };
    if (cookieStr) headers['Cookie'] = cookieStr;
    if (postData) headers['Content-Length'] = Buffer.byteLength(postData);

    var options = {
      hostname: BASE_HOSTNAME,
      port: BASE_PORT,
      path: path,
      method: method,
      headers: headers
    };

    var r = http.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        var parsed = {};
        try { parsed = JSON.parse(data); } catch(e) {}
        var cookies = (res.headers['set-cookie'] || []).map(function(c) {
          return c.split(';')[0];
        }).join('; ');
        resolve({
          status: res.statusCode,
          body: parsed,
          cookie: cookies,
          headers: res.headers
        });
      });
    });
    r.on('error', reject);
    r.setTimeout(10000, function() { r.destroy(new Error('Request timeout')); });
    if (postData) r.write(postData);
    r.end();
  });
}

var logLines = [];

function check(name, ok, detail) {
  var line = (ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + detail + ']' : '');
  process.stdout.write(line + '\n');
  logLines.push(line);
  if (ok) passed++; else failed++;
}

async function run() {
  process.stdout.write('\n=== Live API Tests ===\n\n');

  // 1. Health
  var h = await req('GET', '/health');
  check('[01] Health check', h.status === 200 && h.body.success);

  // 2. Register new user
  var newEmail = 'livetest_' + Date.now() + '@example.com';
  var reg = await req('POST', '/api/auth/register', {
    email: newEmail, password: 'LiveTest@1!', firstName: 'Live', lastName: 'Test'
  });
  check('[02] Register 201', reg.status === 201, 'status=' + reg.status);
  check('[02b] Register no passwordHash', !reg.body.data || reg.body.data.passwordHash === undefined);
  check('[02c] Register role=USER', reg.body.data && reg.body.data.role === 'USER');
  check('[02d] Register sets HttpOnly cookie', reg.cookie.indexOf('token=') !== -1);

  // 3. Duplicate email (409)
  var dup = await req('POST', '/api/auth/register', {
    email: 'audit_test@example.com', password: 'Audit@1234!', firstName: 'X', lastName: 'Y'
  });
  check('[03] Duplicate email 409', dup.status === 409, 'status=' + dup.status);

  // 4. Invalid email (422)
  var badE = await req('POST', '/api/auth/register', {
    email: 'notanemail', password: 'Audit@1234!', firstName: 'X', lastName: 'Y'
  });
  check('[04] Invalid email 422', badE.status === 422, 'status=' + badE.status);

  // 5. Weak password (422)
  var weakP = await req('POST', '/api/auth/register', {
    email: 'nw2@example.com', password: 'weakpass', firstName: 'X', lastName: 'Y'
  });
  check('[05] Weak password 422', weakP.status === 422, 'status=' + weakP.status);

  // 6. Admin login
  process.stdout.write('Running test 06...\n');
  var al = await req('POST', '/api/auth/login', {
    email: 'admin@example.com', password: 'Admin@1234!'
  });
  check('[06] Admin login 200', al.status === 200 && al.body.success, 'status=' + al.status);
  check('[06b] Admin login role=ADMIN', al.body.data && al.body.data.role === 'ADMIN');
  check('[06c] Admin login no passwordHash', !al.body.data || al.body.data.passwordHash === undefined);
  var adminCk = al.cookie;

  // 7. User login
  var ul = await req('POST', '/api/auth/login', {
    email: 'audit_test@example.com', password: 'Audit@1234!'
  });
  check('[07] User login 200', ul.status === 200 && ul.body.success, 'status=' + ul.status);
  check('[07b] User login role=USER', ul.body.data && ul.body.data.role === 'USER');
  check('[07c] User login no passwordHash', !ul.body.data || ul.body.data.passwordHash === undefined);
  var userCk = ul.cookie;

  // 8. GET /me authenticated
  var me = await req('GET', '/api/auth/me', null, adminCk);
  check('[08] GET /me authenticated', me.status === 200 && me.body.data && me.body.data.email === 'admin@example.com');
  check('[08b] GET /me no passwordHash', !me.body.data || me.body.data.passwordHash === undefined);

  // 9. GET /me no token (401)
  var meNoToken = await req('GET', '/api/auth/me');
  check('[09] GET /me no-token 401', meNoToken.status === 401, 'status=' + meNoToken.status);

  // 10. GET /me invalid token (401)
  var meInvalid = await req('GET', '/api/auth/me', null, 'token=bad.jwt.token');
  check('[10] GET /me invalid-token 401', meInvalid.status === 401, 'status=' + meInvalid.status);

  // 11. USER -> admin/users (403)
  var u2admin = await req('GET', '/api/admin/users', null, userCk);
  check('[11] USER->admin/users 403', u2admin.status === 403, 'status=' + u2admin.status);

  // 12. USER -> audit-logs (403)
  var u2logs = await req('GET', '/api/admin/audit-logs', null, userCk);
  check('[12] USER->audit-logs 403', u2logs.status === 403, 'status=' + u2logs.status);

  // 13. Unauth -> admin (401)
  var noauth = await req('GET', '/api/admin/users');
  check('[13] Unauth->admin 401', noauth.status === 401, 'status=' + noauth.status);

  // 14. Admin list users
  var list = await req('GET', '/api/admin/users', null, adminCk);
  var anyHash = Array.isArray(list.body.data) && list.body.data.some(function(u) { return u.passwordHash; });
  check('[14] Admin list users 200', list.status === 200 && list.body.success);
  check('[14b] List users pagination', list.body.pagination && list.body.pagination.total > 0,
    'total=' + (list.body.pagination && list.body.pagination.total));
  check('[14c] List users no passwordHash', !anyHash);

  // 15. Admin search
  var search = await req('GET', '/api/admin/users?search=audit_test', null, adminCk);
  check('[15] Admin search', search.status === 200 && search.body.pagination && search.body.pagination.total >= 1,
    'results=' + (search.body.pagination && search.body.pagination.total));

  // 16. Pagination
  var paged = await req('GET', '/api/admin/users?page=1&limit=1', null, adminCk);
  check('[16] Pagination limit=1', paged.status === 200 && Array.isArray(paged.body.data) && paged.body.data.length <= 1 && paged.body.pagination && paged.body.pagination.limit === 1);

  // Get user IDs
  var allU = await req('GET', '/api/admin/users?limit=100', null, adminCk);
  var testUser = allU.body.data && allU.body.data.find(function(u) { return u.email === 'audit_test@example.com'; });
  var adminUser = allU.body.data && allU.body.data.find(function(u) { return u.email === 'admin@example.com'; });

  if (!testUser || !adminUser) {
    check('[17..30] Prerequisite user IDs not found', false, 'admin or test user missing');
    process.exit(1);
  }

  // 17. GET user by ID
  var byId = await req('GET', '/api/admin/users/' + testUser.id, null, adminCk);
  check('[17] GET user by ID', byId.status === 200 && byId.body.data && byId.body.data.id === testUser.id);
  check('[17b] GET user no passwordHash', !byId.body.data || byId.body.data.passwordHash === undefined);

  // 18. Change role USER->ADMIN
  var toAdmin = await req('PATCH', '/api/admin/users/' + testUser.id + '/role', { role: 'ADMIN' }, adminCk);
  check('[18] Change role USER->ADMIN', toAdmin.status === 200 && toAdmin.body.data && toAdmin.body.data.role === 'ADMIN');
  // Revert
  await req('PATCH', '/api/admin/users/' + testUser.id + '/role', { role: 'USER' }, adminCk);

  // 19. Admin self-role-change (403)
  var selfRole = await req('PATCH', '/api/admin/users/' + adminUser.id + '/role', { role: 'USER' }, adminCk);
  check('[19] Admin self-role-change 403', selfRole.status === 403, 'status=' + selfRole.status);

  // 20. Admin self-status-change (403)
  var selfStatus = await req('PATCH', '/api/admin/users/' + adminUser.id + '/status', { status: 'INACTIVE' }, adminCk);
  check('[20] Admin self-status-change 403', selfStatus.status === 403, 'status=' + selfStatus.status);

  // 21. Deactivate user
  var deact = await req('PATCH', '/api/admin/users/' + testUser.id + '/status', { status: 'INACTIVE' }, adminCk);
  check('[21] Deactivate user', deact.status === 200 && deact.body.data && deact.body.data.status === 'INACTIVE');

  // 22. Deactivated user cannot login (403)
  var deactLogin = await req('POST', '/api/auth/login', {
    email: 'audit_test@example.com', password: 'Audit@1234!'
  });
  check('[22] Deactivated login 403', deactLogin.status === 403, 'status=' + deactLogin.status);

  // Reactivate
  await req('PATCH', '/api/admin/users/' + testUser.id + '/status', { status: 'ACTIVE' }, adminCk);

  // 23. Invalid role value (422)
  var badRole = await req('PATCH', '/api/admin/users/' + testUser.id + '/role', { role: 'SUPERUSER' }, adminCk);
  check('[23] Invalid role value 422', badRole.status === 422, 'status=' + badRole.status);

  // 24. Audit logs
  var logs = await req('GET', '/api/admin/audit-logs', null, adminCk);
  check('[24] Audit logs 200', logs.status === 200 && logs.body.success);
  check('[24b] Audit logs have entries', logs.body.pagination && logs.body.pagination.total > 0,
    'total=' + (logs.body.pagination && logs.body.pagination.total));

  // 25. Change password valid
  var ul2 = await req('POST', '/api/auth/login', { email: 'audit_test@example.com', password: 'Audit@1234!' });
  var uck2 = ul2.cookie;
  var pwOk = await req('PATCH', '/api/auth/change-password', {
    currentPassword: 'Audit@1234!', newPassword: 'NewAudit@5678!', confirmPassword: 'NewAudit@5678!'
  }, uck2);
  check('[25] Change password valid', pwOk.status === 200 && pwOk.body.success, 'status=' + pwOk.status);

  // 26. Old cookie rejected after password change (server cleared it)
  var meOld = await req('GET', '/api/auth/me', null, uck2);
  check('[26] Old token invalid after pw change', meOld.status === 401, 'status=' + meOld.status);

  // Restore password
  var ul3 = await req('POST', '/api/auth/login', { email: 'audit_test@example.com', password: 'NewAudit@5678!' });
  await req('PATCH', '/api/auth/change-password', {
    currentPassword: 'NewAudit@5678!', newPassword: 'Audit@1234!', confirmPassword: 'Audit@1234!'
  }, ul3.cookie);

  // 27. Change password wrong current (400)
  var ul4 = await req('POST', '/api/auth/login', { email: 'audit_test@example.com', password: 'Audit@1234!' });
  var uck4 = ul4.cookie;
  var pwWrong = await req('PATCH', '/api/auth/change-password', {
    currentPassword: 'WrongPass@1!', newPassword: 'NewAudit@5678!', confirmPassword: 'NewAudit@5678!'
  }, uck4);
  check('[27] Change pw wrong current 400', pwWrong.status === 400, 'status=' + pwWrong.status);

  // 28. Change password mismatch (422)
  var pwMismatch = await req('PATCH', '/api/auth/change-password', {
    currentPassword: 'Audit@1234!', newPassword: 'NewAudit@5678!', confirmPassword: 'Mismatch@99!'
  }, uck4);
  check('[28] Change pw mismatch 422', pwMismatch.status === 422, 'status=' + pwMismatch.status);

  // 29. Change password same as current (422)
  var pwSame = await req('PATCH', '/api/auth/change-password', {
    currentPassword: 'Audit@1234!', newPassword: 'Audit@1234!', confirmPassword: 'Audit@1234!'
  }, uck4);
  check('[29] Change pw same-as-current 422', pwSame.status === 422, 'status=' + pwSame.status);

  // 30. Logout
  var logout = await req('POST', '/api/auth/logout', null, adminCk);
  check('[30] Logout 200', logout.status === 200 && logout.body.success);

  // 31. Rate-limit headers
  var rl = await req('POST', '/api/auth/login', { email: 'admin@example.com', password: 'Admin@1234!' });
  var hasRlHeader = !!(rl.headers['ratelimit-remaining'] || rl.headers['x-ratelimit-remaining']);
  check('[31] Rate-limit headers present', hasRlHeader,
    'remaining=' + (rl.headers['ratelimit-remaining'] || rl.headers['x-ratelimit-remaining'] || 'not-found'));

  // 32. MongoDB persistence check
  var adminCk2 = rl.cookie;
  var allAfter = await req('GET', '/api/admin/users?search=' + encodeURIComponent(newEmail.split('@')[0]), null, adminCk2);
  check('[32] MongoDB persistence', allAfter.body.pagination && allAfter.body.pagination.total >= 1,
    'found=' + (allAfter.body.pagination && allAfter.body.pagination.total));

  // Summary
  var summary = '\n' + '─'.repeat(55) + '\n' +
    '  Total: ' + (passed + failed) + '  |  PASS: ' + passed + '  |  FAIL: ' + failed + '\n' +
    '─'.repeat(55) + '\n';
  process.stdout.write(summary);

  // Write full results to file
  var fs = require('fs');
  var fullLog = '=== Live API Tests ===\n\n' + logLines.join('\n') + '\n' + summary;
  fs.writeFileSync('live-test-results.txt', fullLog);
  process.stdout.write('Results saved to live-test-results.txt\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(function(e) {
  var fs = require('fs');
  var msg = '\nTest runner crashed: ' + (e.message || String(e)) + '\n' + (e.stack || '') + '\n';
  process.stdout.write(msg);
  fs.appendFileSync('live-test-results.txt', msg);
  process.exit(1);
});
