/**
 * Automated Backup Utility - Abu Bakar Siddique Portfolio
 * Creates a timestamped archive of data.json, messages.json, and uploads.
 * Usage: node scripts/backup.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');
const DATA_FILE = path.join(ROOT_DIR, 'data.json');
const MESSAGES_FILE = path.join(ROOT_DIR, 'messages.json');
const UPLOADS_DIR = path.join(ROOT_DIR, 'secure_uploads');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

function runBackup() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupFolder = path.join(BACKUPS_DIR, `backup_${timestamp}`);

  fs.mkdirSync(backupFolder, { recursive: true });

  const summary = {
    backupDate: now.toISOString(),
    filesBackedUp: []
  };

  // 1. Backup data.json
  if (fs.existsSync(DATA_FILE)) {
    fs.copyFileSync(DATA_FILE, path.join(backupFolder, 'data.json'));
    summary.filesBackedUp.push('data.json');
  }

  // 2. Backup messages.json
  if (fs.existsSync(MESSAGES_FILE)) {
    fs.copyFileSync(MESSAGES_FILE, path.join(backupFolder, 'messages.json'));
    summary.filesBackedUp.push('messages.json');
  }

  // 3. Backup Uploads
  if (fs.existsSync(UPLOADS_DIR)) {
    const uploadFiles = fs.readdirSync(UPLOADS_DIR);
    if (uploadFiles.length > 0) {
      const targetUploads = path.join(backupFolder, 'secure_uploads');
      fs.mkdirSync(targetUploads, { recursive: true });
      uploadFiles.forEach(f => {
        fs.copyFileSync(path.join(UPLOADS_DIR, f), path.join(targetUploads, f));
      });
      summary.filesBackedUp.push(`secure_uploads (${uploadFiles.length} files)`);
    }
  }

  // 4. Write manifest
  fs.writeFileSync(
    path.join(backupFolder, 'manifest.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log(`====================================================`);
  console.log(`✅ Automated Backup Created Successfully!`);
  console.log(`📂 Location: ${backupFolder}`);
  console.log(`📋 Manifest:`, summary);
  console.log(`====================================================`);
}

runBackup();
