
import fs from 'fs';
import path from 'path';
const root = process.cwd();
const txtPath = path.join(root, 'admin-credentials.txt');
const outPath = path.join(root, 'functions/api/admin/_local_credentials.ts');
const raw = fs.existsSync(txtPath) ? fs.readFileSync(txtPath, 'utf8') : '';
const cfg = {};
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^\s*(ADMIN_ACCOUNT|ADMIN_PASSWORD_1|ADMIN_PASSWORD_2|ADMIN_SESSION_SECRET)\s*=\s*(.*)\s*$/);
  if (m) cfg[m[1]] = m[2] || '';
}
const esc = v => JSON.stringify(String(v || ''));
fs.writeFileSync(outPath, `// Generated from admin-credentials.txt. Prefer Cloudflare Pages secrets for production.\nexport const LOCAL_ADMIN_CREDENTIALS = {\n  ADMIN_ACCOUNT: ${esc(cfg.ADMIN_ACCOUNT)},\n  ADMIN_PASSWORD_1: ${esc(cfg.ADMIN_PASSWORD_1)},\n  ADMIN_PASSWORD_2: ${esc(cfg.ADMIN_PASSWORD_2)},\n  ADMIN_SESSION_SECRET: ${esc(cfg.ADMIN_SESSION_SECRET)},\n};\n`);
console.log('Generated functions/api/admin/_local_credentials.ts');
