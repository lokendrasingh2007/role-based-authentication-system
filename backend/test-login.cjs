var http = require('http');
var pd = '{"email":"admin@example.com","password":"Admin@1234!"}';
console.log('Testing admin login...');
var start = Date.now();
var r = http.request({
  hostname: 'localhost', port: 4000,
  path: '/api/auth/login', method: 'POST',
  headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(pd)}
}, function(res) {
  var d = '';
  res.on('data', function(c) { d += c; });
  res.on('end', function() {
    console.log('status:', res.statusCode, 'time:', Date.now()-start+'ms');
    var b = JSON.parse(d);
    console.log('success:', b.success, 'role:', b.data && b.data.role);
    process.exit(0);
  });
});
r.on('error', function(e) { console.log('ERROR:', e.message); process.exit(1); });
r.setTimeout(15000, function() { console.log('TIMEOUT after 15s'); r.destroy(); });
r.write(pd);
r.end();
