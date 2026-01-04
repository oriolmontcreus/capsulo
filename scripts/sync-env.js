/**
 * sync-env.js
 * 
 * Syncs GitHub OAuth secrets from root .env to workers/github-oauth/.dev.vars
 * This ensures developers only need to configure one file.
 * 
 * Usage: npm run sync:env
 * 
 * This script is automatically run before `npm run dev`.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { intro, outro, success, warn, error, info, colors } from './lib/cli.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_ENV_PATH = path.join(__dirname, '..', '.env');
const DEV_VARS_PATH = path.join(__dirname, '..', 'workers', 'github-oauth', '.dev.vars');

// Secrets to sync from root .env to worker .dev.vars
const SECRETS_TO_SYNC = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'];

/**
 * Parses a .env file and returns an object with key-value pairs
 * @param {string} filePath - Path to the .env file
 * @returns {Record<string, string>} Parsed environment variables
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const result = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, equalsIndex).trim();
    const value = trimmed.substring(equalsIndex + 1).trim();

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Main sync function
 */
function main() {
  intro('sync-env');

  // Check if root .env exists
  if (!fs.existsSync(ROOT_ENV_PATH)) {
    warn('No .env file found at project root');
    info(`Copy ${colors.info('.env.example')} to ${colors.info('.env')} and add your secrets`);
    info(`Run: ${colors.dim('cp .env.example .env')}`);
    return;
  }

  const rootEnv = parseEnvFile(ROOT_ENV_PATH);
  const secrets = {};
  const missingSecrets = [];

  // Extract secrets that need to be synced
  for (const key of SECRETS_TO_SYNC) {
    if (rootEnv[key] && rootEnv[key] !== `your-github-app-${key.toLowerCase().replace(/_/g, '-')}`) {
      secrets[key] = rootEnv[key];
    } else {
      missingSecrets.push(key);
    }
  }

  // Warn about missing secrets
  if (missingSecrets.length > 0) {
    warn(`Missing or placeholder secrets in ${colors.info('.env')}:`);
    for (const key of missingSecrets) {
      info(`  ${colors.dim('•')} ${colors.warning(key)}`);
    }
    info(`The OAuth worker may not work correctly without these.`);
    info(`Get them from your GitHub App settings.`);
  }

  // Write secrets to .dev.vars if we have any
  if (Object.keys(secrets).length > 0) {
    // Ensure the worker directory exists
    const workerDir = path.dirname(DEV_VARS_PATH);
    if (!fs.existsSync(workerDir)) {
      error(`Worker directory not found: ${colors.dim(workerDir)}`);
      return;
    }

    const content = Object.entries(secrets)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';

    fs.writeFileSync(DEV_VARS_PATH, content);
    success(`Synced ${colors.info(Object.keys(secrets).length)} secret(s) to ${colors.info('workers/github-oauth/.dev.vars')}`);
  } else {
    info('No secrets to sync (all values are missing or placeholders)');
  }

  outro('Environment sync complete');
}

main();
