const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const fs = require('fs');

// Set NODE_ENV to production if not specified
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
const port = process.env.PORT || 3000;

const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');
const distStandalonePath = path.join(__dirname, 'dist', 'server.js');

if (fs.existsSync(distStandalonePath)) {
  console.log('> Hostinger Node.js: Launching standalone server from dist/server.js');
  require('./dist/server.js');
} else if (fs.existsSync(standalonePath)) {
  console.log('> Hostinger Node.js: Launching standalone server from .next/standalone/server.js');
  require('./.next/standalone/server.js');
} else {
  console.log('> Hostinger Node.js: Launching standard Next.js HTTP server');
  const next = require('next');
  const app = next({ dev: false, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, (err) => {
      if (err) throw err;
      console.log(`> Next.js Hostinger Server running on port ${port}`);
    });
  }).catch((err) => {
    console.error('> Error initializing Next.js server:', err);
    process.exit(1);
  });
}
