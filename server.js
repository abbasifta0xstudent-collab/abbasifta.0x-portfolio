const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const UPLOADS_DIR = path.join(__dirname, 'secure_uploads');
const BACKUPS_DIR = path.join(__dirname, 'backups');

// Master Credentials & Custom Admin Route
const MASTER_PASSWORD = process.env.ADMIN_PASSWORD || "!#@AaA1954@AaA1089@#!";
const MASTER_2FA_PIN = process.env.ADMIN_2FA_PIN || "195489";
const CUSTOM_ADMIN_ROUTE = process.env.CUSTOM_ADMIN_ROUTE || "/abs-vault-portal";

// Ensure Secure Storage Directories Exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// ============================================================================
// 1. SECURITY UTILITIES & BRUTE FORCE PROTECTION
// ============================================================================

// In-Memory Brute Force Attempt Tracker
const loginAttempts = new Map(); // IP -> { count, lastAttempt, lockedUntil }
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 mins window
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 mins ban

// Contact Form Rate Limiter
const contactRateLimits = new Map(); // IP -> timestamps[]
const MAX_CONTACT_PER_15MIN = 5;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket ? req.socket.remoteAddress : 'unknown';
}

function checkBruteForce(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / (60 * 1000));
    return {
      allowed: false,
      locked: true,
      message: `Too many failed login attempts. IP temporarily banned for ${remainingMinutes} more minute(s).`
    };
  }

  // Reset if window expired
  if (now - record.lastAttempt > LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS - record.count };
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lastAttempt: now, lockedUntil: null };
  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  loginAttempts.set(ip, record);
  return record;
}

function clearFailedLogins(ip) {
  loginAttempts.delete(ip);
}

function checkContactRateLimit(ip) {
  const now = Date.now();
  const timestamps = contactRateLimits.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < 15 * 60 * 1000);

  if (validTimestamps.length >= MAX_CONTACT_PER_15MIN) {
    return false;
  }

  validTimestamps.push(now);
  contactRateLimits.set(ip, validTimestamps);
  return true;
}

// Input Sanitizer to prevent XSS & Injection
function sanitizeInput(str, maxLen = 1000) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .slice(0, maxLen)
    .replace(/[<>]/g, '') // Strip brackets
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Security Response Headers
function applySecurityHeaders(res) {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Clickjacking defense
  res.setHeader('X-Content-Type-Options', 'nosniff'); // MIME-sniffing prevention
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self' https: 'unsafe-inline' 'unsafe-eval' data: blob:;");
}

// ============================================================================
// 2. DATA & PERSISTENCE HELPERS
// ============================================================================

function getSiteData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading data.json:', err.message);
  }
  return null;
}

function saveSiteData(data) {
  try {
    // Auto-create snapshot before saving
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUPS_DIR, `data_backup_${timestamp}.json`);
    if (fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, backupPath);
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing data.json:', err.message);
    return false;
  }
}

// Contact Submission Handler
function handleContactSubmission(bodyData, clientIp) {
  try {
    if (!checkContactRateLimit(clientIp)) {
      return {
        status: 429,
        body: { success: false, message: 'Rate limit exceeded. Please wait 15 minutes before sending another message.' }
      };
    }

    // Anti-Spam Honeypot Check
    if (bodyData._gotcha || bodyData.website_honeypot) {
      // Bot detected, silently acknowledge without saving
      return { status: 200, body: { success: true, message: 'Message received.' } };
    }

    const name = sanitizeInput(bodyData.name, 100);
    const email = sanitizeInput(bodyData.email, 120);
    const subject = sanitizeInput(bodyData.subject, 150) || 'General Inquiry';
    const message = sanitizeInput(bodyData.message, 3000);

    // Email Regex Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !email || !message) {
      return { status: 400, body: { success: false, message: 'Please provide valid name, email, and message.' } };
    }
    if (!emailRegex.test(bodyData.email)) {
      return { status: 400, body: { success: false, message: 'Invalid email address format.' } };
    }

    let messages = [];
    if (fs.existsSync(MESSAGES_FILE)) {
      try {
        messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
      } catch (e) {
        messages = [];
      }
    }

    const newMsg = {
      id: Date.now(),
      ip: clientIp,
      name,
      email,
      subject,
      message,
      date: new Date().toISOString()
    };

    messages.push(newMsg);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');

    return {
      status: 200,
      body: {
        success: true,
        message: `Thank you, ${name}! Your inquiry has been securely delivered to Abu Bakar Siddique.`
      }
    };
  } catch (err) {
    return { status: 500, body: { success: false, message: 'Server error processing contact form.' } };
  }
}

// File Upload Validator
function handleSecureUpload(fileName, fileBuffer) {
  const allowedExts = ['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(fileName).toLowerCase();

  if (!allowedExts.includes(ext)) {
    return { success: false, message: `Disallowed file format '${ext}'. Only .pdf, .docx, and image files are allowed.` };
  }

  // Max 5MB Limit
  if (fileBuffer.length > 5 * 1024 * 1024) {
    return { success: false, message: 'File exceeds maximum size limit (5MB).' };
  }

  const randomHash = crypto.randomBytes(8).toString('hex');
  const safeFilename = `doc_${Date.now()}_${randomHash}${ext}`;
  const targetPath = path.join(UPLOADS_DIR, safeFilename);

  fs.writeFileSync(targetPath, fileBuffer);
  return { success: true, filename: safeFilename, path: targetPath };
}

// ============================================================================
// 3. SERVER IMPLEMENTATION (DUAL ENGINE WITH FULL SECURITY)
// ============================================================================

try {
  const express = require('express');
  const app = express();

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Global Security Headers Middleware
  app.use((req, res, next) => {
    applySecurityHeaders(res);
    next();
  });

  // Block Directory Browsing & Hidden Files Access
  app.use((req, res, next) => {
    const forbiddenFiles = ['.env', '.git', 'messages.json', 'package.json', 'server.js'];
    const lowerUrl = req.url.toLowerCase();
    for (const f of forbiddenFiles) {
      if (lowerUrl.includes(f)) {
        return res.status(403).json({ error: 'Access Denied: Protected System Resource' });
      }
    }
    next();
  });

  // Serve Public Static Assets
  app.use(express.static(PUBLIC_DIR, { dotfiles: 'ignore', index: false }));

  // Home Page
  app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  // Custom Admin Route (Also supporting standard /admin with 2FA/Brute Force)
  const adminRoutes = ['/admin', CUSTOM_ADMIN_ROUTE];
  adminRoutes.forEach(r => {
    app.get(r, (req, res) => {
      res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
    });
  });

  // API: Get Full Site Data
  app.get('/api/data', (req, res) => {
    const data = getSiteData();
    res.json(data);
  });

  // API: Admin Authentication with Brute Force Protection & Optional 2FA
  app.post('/api/admin/login', (req, res) => {
    const clientIp = getClientIp(req);
    const check = checkBruteForce(clientIp);

    if (!check.allowed) {
      return res.status(429).json({ success: false, message: check.message });
    }

    const { password, pin2fa } = req.body;

    // Check Master Password
    if (password !== MASTER_PASSWORD) {
      const record = recordFailedLogin(clientIp);
      const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - record.count);
      return res.status(401).json({
        success: false,
        message: `Invalid admin password. (${remaining} attempt(s) remaining before temporary ban)`
      });
    }

    // Optional 2FA Pin Check if provided or enforced
    if (pin2fa && pin2fa !== MASTER_2FA_PIN) {
      recordFailedLogin(clientIp);
      return res.status(401).json({ success: false, message: 'Invalid 2FA Verification PIN.' });
    }

    // Success: Clear failed attempts
    clearFailedLogins(clientIp);
    res.json({
      success: true,
      message: 'Authenticated successfully.',
      requires2fa: false,
      token: crypto.createHash('sha256').update(MASTER_PASSWORD + clientIp).digest('hex')
    });
  });

  // API: Admin Save with Header/Password Verification
  app.post('/api/admin/save', (req, res) => {
    const authHeader = req.headers['x-admin-password'];
    const bodyPass = req.body?.password;

    if (authHeader !== MASTER_PASSWORD && bodyPass !== MASTER_PASSWORD) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Invalid admin password.' });
    }

    const payload = req.body;
    delete payload.password;

    const saved = saveSiteData(payload);
    if (saved) {
      return res.json({ success: true, message: 'Changes published & backed up successfully!' });
    }
    return res.status(500).json({ success: false, message: 'Failed to write data to storage.' });
  });

  // API: Contact Submission with Input Sanitization & Anti-Spam
  app.post('/api/contact', (req, res) => {
    const clientIp = getClientIp(req);
    const result = handleContactSubmission(req.body, clientIp);
    res.status(result.status).json(result.body);
  });

  // Catch-all route to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.listen(PORT, () => {
    printBanner('Express.js Secure Engine');
  });

} catch (e) {
  // Native HTTP Fallback Engine with Full Security
  const http = require('http');

  const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const server = http.createServer((req, res) => {
    applySecurityHeaders(res);
    const clientIp = getClientIp(req);
    const urlParts = req.url.split('?');
    const pathname = urlParts[0];

    // Block Directory Browsing & Hidden/Sensitive Files
    if (pathname.includes('.env') || pathname.includes('messages.json') || pathname.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Denied' }));
    }

    // Root & Admin Routes
    if ((pathname === '/' || pathname === '/index.html') && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      return fs.createReadStream(path.join(PUBLIC_DIR, 'index.html')).pipe(res);
    }

    if ((pathname === '/admin' || pathname === CUSTOM_ADMIN_ROUTE) && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      return fs.createReadStream(path.join(PUBLIC_DIR, 'admin.html')).pipe(res);
    }

    // API: GET /api/data
    if (req.method === 'GET' && (pathname === '/api/data' || pathname === '/api/profile')) {
      const data = getSiteData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data));
    }

    // API: POST /api/admin/login
    if (req.method === 'POST' && pathname === '/api/admin/login') {
      const check = checkBruteForce(clientIp);
      if (!check.allowed) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, message: check.message }));
      }

      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.password === MASTER_PASSWORD) {
            clearFailedLogins(clientIp);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, message: 'Authenticated successfully.' }));
          }
        } catch (e) {}

        const record = recordFailedLogin(clientIp);
        const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - record.count);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: `Invalid admin password. (${remaining} attempt(s) remaining)`
        }));
      });
      return;
    }

    // API: POST /api/admin/save
    if (req.method === 'POST' && pathname === '/api/admin/save') {
      const authHeader = req.headers['x-admin-password'];
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (authHeader === MASTER_PASSWORD || parsed.password === MASTER_PASSWORD) {
            delete parsed.password;
            const saved = saveSiteData(parsed);
            if (saved) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ success: true, message: 'Changes published successfully!' }));
            }
          }
        } catch (e) {}
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Unauthorized. Invalid admin password.' }));
      });
      return;
    }

    // API: POST /api/contact
    if (req.method === 'POST' && pathname === '/api/contact') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(body); } catch (e) {}
        const result = handleContactSubmission(parsed, clientIp);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
      });
      return;
    }

    // Static File Serving with Path Traversal Defense
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      return fs.createReadStream(filePath).pipe(res);
    }

    // Fallback to index.html
    res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
    fs.createReadStream(path.join(PUBLIC_DIR, 'index.html')).pipe(res);
  });

  server.listen(PORT, () => {
    printBanner('Native HTTP Secure Engine');
  });
}

function printBanner(engine) {
  console.log('================================================================');
  console.log(`🛡️ Abu Bakar Siddique - Executive Secure Portfolio Online`);
  console.log(`🚀 Powered by:  ${engine}`);
  console.log(`🌐 Live Site:   http://localhost:${PORT}`);
  console.log(`🔒 Admin CMS:   http://localhost:${PORT}/admin`);
  console.log(`🔐 Vault Portal: http://localhost:${PORT}${CUSTOM_ADMIN_ROUTE}`);
  console.log(`🛡️ Brute Force: Active (Max 5 attempts / 30m ban)`);
  console.log(`📦 Auto-Backup: Active in ./backups`);
  console.log('================================================================');
}
