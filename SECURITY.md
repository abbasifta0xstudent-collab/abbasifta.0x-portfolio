# 🛡️ Abu Bakar Siddique Portfolio - Security & Maintenance Architecture

This document provides complete instructions for the security hardening, credentials management, Cloudflare CDN configuration, and automated recovery roadmap implemented on the website.

---

## 1. 📋 Code & Interaction Security Implemented

### A. Contact Form Input Sanitization & Anti-Spam
- **Server & Client Sanitization**: All fields (`name`, `email`, `subject`, `message`) are stripped of HTML tags, brackets, and malicious characters (`<`, `>`, `&`, `"`, `'`) to block XSS (Cross-Site Scripting) and injection payloads.
- **Bot Honeypot Protection**: A hidden decoy field `_gotcha` is placed in the form. Automated bots that fill hidden fields are automatically trapped and discarded without server load.
- **Rate Limiting**: Contact form submissions are limited to **5 messages per 15 minutes** per IP address to prevent spam floods.

### B. File Upload Restrictions & Isolated Storage
- **Whitelisted Extensions**: Strictly `.pdf`, `.docx`, `.png`, `.jpg`, `.jpeg`, `.webp`.
- **Blocked Extensions**: `.exe`, `.php`, `.phtml`, `.js`, `.py`, `.sh`, `.bat`, `.cmd` are immediately rejected.
- **Isolated Storage**: Uploaded files are saved with randomized cryptographic hashes (`doc_timestamp_hash.ext`) inside a dedicated `/secure_uploads` directory outside the public web root.
- **Max File Size**: Capped strictly at 5 MB.

### C. Directory Browsing & Path Traversal Defense
- Direct directory indexing is **disabled**.
- Path traversal sequences (`../`, `..\\`, `%2e%2e`) are normalized and blocked.
- Protected files (`.env`, `.git`, `messages.json`, `package.json`, `server.js`) return `403 Forbidden` if requested directly via HTTP.

---

## 2. 🔒 Admin Panel & Login Protection

### A. Custom Secret Admin URL
- In addition to `/admin`, a dedicated secret vault endpoint is configured:
  - **Custom Vault URL**: `http://localhost:3000/abs-vault-portal` (or `https://yourdomain.com/abs-vault-portal`)
  - Configurable via `process.env.CUSTOM_ADMIN_ROUTE`.

### B. Brute-Force Defense & IP Lockout
- **Max Login Attempts**: 5 failed attempts per 15-minute window.
- **Temporary Ban**: If an IP fails 5 times, it is automatically locked out for **30 minutes** with an HTTP 429 response showing the remaining lockout timer.
- **Attempt Reset**: Successful login immediately resets the attempt counter.

### C. Two-Factor Authentication (2FA PIN)
- **Master Admin Password**: `!#@AaA1954@AaA1089@#!`
- **Master 2FA PIN**: `195489` (Configurable via `process.env.ADMIN_2FA_PIN`)
- Admin CMS login requires both the master password and 2FA authentication.

---

## 3. 🛡️ Network, Headers & Cloudflare Integration

### A. Security Headers Injected
Every HTTP response includes industry-standard security headers:
- `X-Frame-Options: SAMEORIGIN` (Blocks Clickjacking iframe embeds).
- `X-Content-Type-Options: nosniff` (Prevents MIME-type confusion).
- `X-XSS-Protection: 1; mode=block`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- `Content-Security-Policy: default-src 'self' https: 'unsafe-inline' 'unsafe-eval' data: blob:;`.

### B. Cloudflare Free CDN & DDoS Protection Guide (Step-by-Step)
1. Go to [cloudflare.com](https://www.cloudflare.com) and create a free account.
2. Click **"Add a Site"** and enter your domain name (e.g. `abubakarsiddique.com`).
3. Select the **Free Plan**.
4. Change your Domain Registrar's Nameservers to the two Cloudflare nameservers provided.
5. In Cloudflare Dashboard:
   - **SSL/TLS**: Set encryption mode to **Full (Strict)**.
   - **Always Use HTTPS**: Turn **ON**.
   - **Automatic HTTPS Rewrites**: Turn **ON**.
   - **Bot Fight Mode**: Turn **ON** (Blocks malicious scraper bots).
   - **DDoS Protection**: Automatically active by default.

---

## 4. 🗓️ Maintenance & Automated Recovery Plan

### A. Automated Backup Command
A snapshot backup script is ready in `scripts/backup.js`.
To create an instant backup of `data.json`, `messages.json`, and all uploaded assets:
```bash
npm run backup
```
* Backups are archived in the `./backups/` directory with timestamped manifests.
* Every time you save changes from the Admin Panel, a pre-save backup is automatically recorded in `./backups/`.

### B. Software & Security Updates
To check for security vulnerabilities and update packages:
```bash
# Run security vulnerability audit
npm run security:check

# Auto-fix vulnerable dependencies
npm audit fix

# Update all dependencies to latest stable versions
npm update
```

---

## 🔑 Emergency Recovery Key Summary
| Parameter | Default Value | Environment Variable |
| :--- | :--- | :--- |
| **Admin Password** | `!#@AaA1954@AaA1089@#!` | `ADMIN_PASSWORD` |
| **2FA Verification PIN** | `195489` | `ADMIN_2FA_PIN` |
| **Custom Admin Route** | `/abs-vault-portal` | `CUSTOM_ADMIN_ROUTE` |
| **Max Login Attempts** | `5 tries` | `MAX_LOGIN_ATTEMPTS` |
| **IP Lockout Window** | `30 minutes` | `LOCKOUT_DURATION_MS` |
| **Official Contact Email** | `abbasifta0x@gmail.com` | `CONTACT_EMAIL` |
