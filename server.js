const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const { createServer } = require('https');
const http = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const express = require('express');

const dev = process.env.NODE_ENV !== 'production';
const key = process.env.SSL_KEY_PATH;
const cert = process.env.SSL_CERT_PATH;
const domain = process.env.DOMAIN || 'localhost';
const app = next({ dev });
const handle = app.getRequestHandler();

// Attempt to load SSL certs — fall back to HTTP-only if missing
let httpsOptions = null;
try {
    if (key && cert) {
        httpsOptions = {
            key: fs.readFileSync(key),
            cert: fs.readFileSync(cert)
        };
    }
} catch (err) {
    console.warn('SSL certs not found, running HTTP-only:', err.message);
}

app.prepare().then(() => {
    const server = express();

    server.use(express.json()); // To parse JSON bodies

    // Handle requests with Next.js
    server.get('*', (req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    if (httpsOptions) {
        createServer(httpsOptions, (req, res) => {
            const parsedUrl = parse(req.url, true);
            handle(req, res, parsedUrl);
        }).listen(443, err => {
            if (err) throw err;
            console.log(`> Ready on https://${domain}:443`);
        });

        // Create HTTP server and redirect all requests to HTTPS
        http.createServer((req, res) => {
            res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
            res.end();
        }).listen(80, () => {
            console.log('HTTP server running on port 80 and redirecting to HTTPS');
        });
    } else {
        // No SSL — run HTTP only (for local dev or behind a reverse proxy)
        const httpPort = process.env.PORT || 3000;
        http.createServer((req, res) => {
            const parsedUrl = parse(req.url, true);
            handle(req, res, parsedUrl);
        }).listen(httpPort, () => {
            console.log(`> Ready on http://${domain}:${httpPort} (no SSL)`);
        });
    }
});
