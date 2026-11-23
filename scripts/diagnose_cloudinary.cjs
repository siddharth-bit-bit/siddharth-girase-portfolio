const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

const lines = fs.readFileSync('.env', 'utf8').split('\n');
for (const line of lines) {
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const k = line.substring(0, idx).trim();
    const v = line.substring(idx + 1).trim();
    if (k && v) process.env[k] = v;
  }
}

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const timestamp = Math.floor(Date.now() / 1000);
const paramsToSign = {
  folder: 'siddharth-portfolio/test',
  overwrite: 'true',
  public_id: 'test_thumbnail_sample',
  timestamp: String(timestamp)
};

const sortedKeys = Object.keys(paramsToSign).sort();
const toSign = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&') + apiSecret;
const signature = crypto.createHash('sha1').update(toSign).digest('hex');

const boundary = '----CloudinaryTest' + Date.now();
const testFilePath = 'public/uploads/thumbnails/thumbnail_1795361979861_5edi9s.jpg';
const fileData = fs.readFileSync(testFilePath);

let body = '';
for (const [k, v] of Object.entries(paramsToSign)) {
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="${k}"\r\n\r\n`;
  body += `${v}\r\n`;
}
body += `--${boundary}\r\n`;
body += `Content-Disposition: form-data; name="api_key"\r\n\r\n${apiKey}\r\n`;
body += `--${boundary}\r\n`;
body += `Content-Disposition: form-data; name="signature"\r\n\r\n${signature}\r\n`;
body += `--${boundary}\r\n`;
body += `Content-Disposition: form-data; name="file"; filename="thumb.jpg"\r\n`;
body += `Content-Type: image/jpeg\r\n\r\n`;

const postData = Buffer.concat([
  Buffer.from(body),
  fileData,
  Buffer.from(`\r\n--${boundary}--\r\n`)
]);

const req = https.request({
  hostname: 'api.cloudinary.com',
  port: 443,
  path: `/v1_1/${cloudName}/image/upload`,
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': postData.length
  }
}, res => {
  let resData = '';
  res.on('data', c => resData += c);
  res.on('end', () => {
    console.log('HTTP Status Code:', res.statusCode);
    console.log('X-Cld-Error Header:', res.headers['x-cld-error'] || 'None');
    console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
    console.log('Response Body:', resData);
  });
});

req.on('error', e => console.error('Req error:', e));
req.write(postData);
req.end();
