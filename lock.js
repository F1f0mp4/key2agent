// Encrypts an LLM API key with a password and stores it in agent.html,
// so users unlock the agent with the password instead of pasting a key.
//
//   node lock.js           set or replace the locked key
//   node lock.js --remove  go back to asking each user for their own key
//
// KEY2AGENT_KEY / KEY2AGENT_PASSWORD env vars skip the prompts.
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { webcrypto: crypto } = require('crypto');

const FILE = path.join(__dirname, 'agent.html');
const LINE = /^(\s*)var LOCKED_KEY = .*; \/\/ key2agent:locked-key$/m;
const ITERATIONS = 600000;
const MIN_PASSWORD = 12;

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer.trim()); });
  });
}

function write(value) {
  const html = fs.readFileSync(FILE, 'utf8');
  if (!LINE.test(html)) throw new Error('could not find the LOCKED_KEY line in agent.html');
  fs.writeFileSync(FILE, html.replace(LINE, (_, indent) => `${indent}var LOCKED_KEY = ${value}; // key2agent:locked-key`));
}

async function main() {
  if (process.argv.includes('--remove')) {
    write('null');
    console.log('Removed the locked key. agent.html asks each user for their own key again.');
    return;
  }
  const key = process.env.KEY2AGENT_KEY || await ask('API key (hidden): ');
  const password = process.env.KEY2AGENT_PASSWORD || await ask(`Password (hidden, at least ${MIN_PASSWORD} characters): `);
  if (!process.env.KEY2AGENT_PASSWORD && password !== await ask('Repeat password: ')) throw new Error('passwords do not match');
  if (!key) throw new Error('no API key given');
  if (password.length < MIN_PASSWORD) throw new Error(`password must be at least ${MIN_PASSWORD} characters`);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const aes = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(key));
  const b64 = (b) => Buffer.from(b).toString('base64');
  write(JSON.stringify({ salt: b64(salt), iv: b64(iv), iter: ITERATIONS, data: b64(data) }));
  console.log('Done. agent.html now holds the encrypted key; upload it to GitHub to update the tool.');
}

main().catch((e) => { console.error('Error: ' + e.message); process.exit(1); });
