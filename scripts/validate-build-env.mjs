import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

const parseDotEnv = (filePath) => {
  if (!existsSync(filePath)) return {};

  const values = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
};

// Vite loads generic env files first, then mode-specific files. Process
// variables always win, which is how Vercel supplies production secrets.
const fileEnv = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
].reduce((values, fileName) => ({ ...values, ...parseDotEnv(resolve(projectRoot, fileName)) }), {});
const env = { ...fileEnv, ...process.env };

const isPlaceholder = (value) => /YOUR_|MY_|PLACEHOLDER|CHANGE_ME/i.test(value);
const isServiceRoleKey = (value) => {
  if (value.startsWith('sb_secret_')) return true;

  const parts = value.split('.');
  if (parts.length !== 3) return false;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
};
const missing = [];

for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
  const value = typeof env[key] === 'string' ? env[key].trim() : '';
  if (!value) {
    missing.push(`${key} is missing`);
  } else if (isPlaceholder(value)) {
    missing.push(`${key} still contains a placeholder`);
  } else if (key === 'VITE_SUPABASE_ANON_KEY' && isServiceRoleKey(value)) {
    missing.push(`${key} contains a service-role key; use the publishable/anon key instead`);
  }
}

const supabaseUrl = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      missing.push('VITE_SUPABASE_URL is not a valid URL');
    }
  } catch {
    missing.push('VITE_SUPABASE_URL is not a valid URL');
  }
}

if (missing.length > 0) {
  console.error('\nBuild blocked: Supabase client configuration is incomplete.');
  console.error('Provide these values in the local .env file before building web or Android:');
  for (const issue of missing) console.error(`- ${issue}`);
  console.error('Use the publishable/anon key only; never use SUPABASE_SERVICE_ROLE_KEY in VITE_ variables.\n');
  process.exit(1);
}

if (!env.VITE_GOOGLE_CLIENT_ID?.trim()) {
  console.warn('VITE_GOOGLE_CLIENT_ID is not set; the built-in Bible Nova Web client ID fallback will be used.');
}

console.log('Build environment check passed: Supabase client values are present.');
