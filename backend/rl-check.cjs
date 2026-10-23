var http = require('http');
var pd = '{"email":"test@t.com","password":"Test@1!"}';
var r = http.request({
  hostname: 'localhost', port: 4000,
  path: '/api/auth/login', method: 'POST',
  headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(pd)}
}, function(res) {
  var d = '';
  res.on('data', function(c) { d += c; });
  res.on('end', function() {
    process.stdout.write('status:' + res.statusCode + ' rl-remaining:' + res.headers['ratelimit-remaining'] + '\n');
    process.exit(0);
  });
});
r.on('error', function() { process.exit(1); });
r.setTimeout(5000, function() { r.destroy(); });
r.write(pd);
r.end();
