/**
 * Run an operator script against the DEPLOYED environment.
 *
 *   npm run create-admin:prod
 *   npm run inspect:db:prod
 *
 * Loads server/.env.production.local (gitignored) into process.env *before*
 * config/env.ts is imported, so the target script connects to Atlas and prints
 * activation links pointing at the live site rather than localhost.
 *
 * This exists because the manual form is three lines that must all be right:
 *
 *   $env:MONGO_URI  = ...        forget it -> you edit your laptop by mistake
 *   $env:CLIENT_URL = ...        forget it -> the activation link says localhost
 *                                             and is useless to the recipient
 *   npm run create-admin
 *   Remove-Item Env:\...         forget it -> the next command in that window
 *                                             is still pointed at production
 *
 * Here the values are set for this process only and die with it.
 */
import fs from 'node:fs';
import path from 'node:path';

const PROD_ENV_FILE = path.resolve(__dirname, '../../.env.production.local');

const TARGETS: Record<string, string> = {
  'create-admin': './create-admin',
  'inspect-db': './inspect-db',
};

function loadProdEnv(): Record<string, string> {
  if (!fs.existsSync(PROD_ENV_FILE)) {
    /* eslint-disable no-console */
    console.error(`\n  Missing ${path.basename(PROD_ENV_FILE)}\n`);
    console.error('  Create server/.env.production.local with your deployed values:\n');
    console.error('    MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/assistify?retryWrites=true&w=majority');
    console.error('    CLIENT_URL=https://your-site.vercel.app\n');
    console.error('  It is gitignored — it never leaves your machine.\n');
    /* eslint-enable no-console */
    process.exit(1);
  }

  const vars: Record<string, string> = {};
  for (const line of fs.readFileSync(PROD_ENV_FILE, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

async function main(): Promise<void> {
  const target = process.argv[2];
  if (!target || !TARGETS[target]) {
    // eslint-disable-next-line no-console
    console.error(`  Usage: tsx src/scripts/prod.ts <${Object.keys(TARGETS).join('|')}>`);
    process.exit(1);
  }

  const vars = loadProdEnv();

  if (!vars.MONGO_URI) {
    // eslint-disable-next-line no-console
    console.error('  .env.production.local has no MONGO_URI.');
    process.exit(1);
  }

  /* eslint-disable no-console */
  if (!vars.CLIENT_URL) {
    console.warn('\n  ⚠️  No CLIENT_URL in .env.production.local.');
    console.warn('     Activation links will point at localhost and will not work');
    console.warn('     for whoever you send them to. Add:\n');
    console.warn('       CLIENT_URL=https://your-site.vercel.app\n');
  }

  // Set BEFORE importing anything that reads config/env — dotenv does not
  // override variables that are already present, so these win.
  for (const [k, v] of Object.entries(vars)) process.env[k] = v;

  const host = vars.MONGO_URI.replace(/^mongodb(\+srv)?:\/\/[^@]*@/, '').split(/[/?]/)[0];
  console.log('\n  ═══ DEPLOYED ENVIRONMENT ═══');
  console.log(`  database : ${host}`);
  console.log(`  site     : ${vars.CLIENT_URL ?? '(not set)'}`);
  console.log('  ════════════════════════════');
  /* eslint-enable no-console */

  await import(TARGETS[target]);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('failed:', err);
  process.exit(1);
});
