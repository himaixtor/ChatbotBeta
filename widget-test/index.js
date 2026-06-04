const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const projectDir = path.resolve(rootDir, '..');
const port = Number(process.env.PORT || 8090);
// const host = process.env.HOST || '172.16.1.67';
const host = process.env.HOST || 'localhost';
const apiEndpoint = process.env.API_ENDPOINT || '';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

function send(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(body);
}

function getFilePath(urlPath) {
  if (urlPath === '/') {
    return path.join(rootDir, 'index.html');
  }

  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);

  if (cleanPath.startsWith('/chatbot/dist/')) {
    return path.resolve(projectDir, `.${cleanPath}`);
  }

  return path.resolve(rootDir, `.${cleanPath}`);
}

function patchIndexHtml(html, req) {
  const endpoint =
    apiEndpoint ||
    // `http://${req.headers.host ? req.headers.host.split(':')[0] : '172.16.1.67'}:5000`;
    `http://${req.headers.host ? req.headers.host.split(':')[0] : 'localhost'}:5000`;

  return html.replace(
    /apiEndpoint:\s*['"][^'"]+['"]/,
    `apiEndpoint: '${endpoint}'`
  );
}

const server = http.createServer((req, res) => {
  const filePath = getFilePath(req.url || '/');
  const isAllowedPath =
    filePath.startsWith(rootDir + path.sep) ||
    filePath.startsWith(path.join(projectDir, 'chatbot', 'dist') + path.sep);

  if (!isAllowedPath) {
    return send(res, 403, 'Forbidden');
  }

  fs.readFile(filePath, 'utf8', (textErr, textData) => {
    if (textErr) {
      return send(res, 404, 'Not found');
    }

    const ext = path.extname(filePath).toLowerCase();

    if (filePath === path.join(rootDir, 'index.html')) {
      return send(res, 200, patchIndexHtml(textData, req), mimeTypes['.html']);
    }

    fs.readFile(filePath, (binaryErr, binaryData) => {
      if (binaryErr) {
        return send(res, 404, 'Not found');
      }

      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      });
      res.end(binaryData);
    });
  });
});

server.listen(port, host, () => {
  console.log(`Widget test page running at http://${host}:${port}`);
  console.log(`Open from your system using http://<VM_IP>:${port}`);
});
