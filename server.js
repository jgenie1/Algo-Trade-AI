const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const fs = require('fs');

// Set NODE_ENV to production if not specified
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;

const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');
const distStandalonePath = path.join(__dirname, 'dist', 'server.js');
const buildIdPath = path.join(__dirname, '.next', 'BUILD_ID');

if (fs.existsSync(distStandalonePath)) {
  console.log('> Hostinger Node.js: Launching standalone server from dist/server.js');
  require('./dist/server.js');
} else if (fs.existsSync(standalonePath)) {
  console.log('> Hostinger Node.js: Launching standalone server from .next/standalone/server.js');
  require('./.next/standalone/server.js');
} else if (fs.existsSync(buildIdPath)) {
  console.log('> Hostinger Node.js: Launching standard Next.js HTTP server');
  const next = require('next');
  const app = next({ dev: false, port, hostname: '0.0.0.0' });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, '0.0.0.0', (err) => {
      if (err) throw err;
      console.log(`> Next.js Hostinger Server running on http://0.0.0.0:${port}`);
    });
  }).catch((err) => {
    console.error('> Error initializing Next.js server:', err);
    process.exit(1);
  });
} else {
  // If the production build is pending or not yet generated on Hostinger,
  // DO NOT crash process.exit(1) (which kills port 3000 and causes LiteSpeed 403/503 errors).
  // Instead, listen on port 3000 and serve a responsive status page instructing to run build.
  console.warn('> Hostinger Node.js: Build not detected in .next. Serving temporary warm-up page on port ' + port);
  createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AlgoTrade AI &bull; Initialisation du Serveur</title>
  <style>
    * { box-sizing: border-box; }
    body { background: #0d0914; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #150f21; border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 36px; max-width: 560px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
    h1 { color: #c2ff0c; font-size: 24px; margin-bottom: 12px; font-weight: 800; }
    p { color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 8px 0; }
    .cmd { background: #09050e; border: 1px solid rgba(194,255,12,0.3); color: #c2ff0c; padding: 12px 18px; border-radius: 12px; font-family: ui-monospace, monospace; font-size: 14px; display: inline-block; margin: 18px 0; font-weight: 700; letter-spacing: 0.5px; }
    .spinner { width: 36px; height: 36px; border: 3px solid rgba(194,255,12,0.2); border-top-color: #c2ff0c; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 18px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
  <script>setTimeout(() => window.location.reload(), 15000);</script>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>AlgoTrade AI &bull; D&eacute;marrage en cours</h1>
    <p>Le serveur Node.js est actif et fonctionnel sur Hostinger, mais la compilation de production n'a pas encore &eacute;t&eacute; effectu&eacute;e.</p>
    <div class="cmd">npm run build</div>
    <p>Veuillez lancer le build dans votre console Hostinger ou d&eacute;ployer les fichiers compil&eacute;s (.next). Cette page se rechargera automatiquement toutes les 15 secondes d&egrave;s la fin du build.</p>
  </div>
</body>
</html>`);
  }).listen(port, '0.0.0.0', (err) => {
    if (err) console.error('> Warm-up server listen error:', err);
    else console.log(`> Warm-up server listening on port ${port}`);
  });
}
