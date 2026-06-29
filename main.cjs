const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const QCLAW_APP_STORE_PATH = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'QClaw',
  'app-store.json'
);
const QCLAW_API_KEY_STORE_KEY = 'authGateway.providers.qclaw.apiKey';
const QCLAW_KEYCHAIN_SERVICE = 'QClaw Safe Storage';
const QCLAW_KEYCHAIN_ACCOUNT = 'QClaw Key';

function timestamp() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function log(message) {
  process.stdout.write(`[${timestamp()}] ${message}\n`);
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getAppStorePath() {
  return process.env.QCLAW_APP_STORE_PATH || QCLAW_APP_STORE_PATH;
}

function getKeychainPassword() {
  return execFileSync(
    'security',
    [
      'find-generic-password',
      '-w',
      '-s',
      QCLAW_KEYCHAIN_SERVICE,
      '-a',
      QCLAW_KEYCHAIN_ACCOUNT,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  ).trim();
}

function decryptChromiumV10(cipherText, password) {
  const encrypted = Buffer.from(cipherText, 'base64');
  const prefix = encrypted.slice(0, 3).toString('utf8');
  if (prefix !== 'v10') {
    throw new Error(`不支持的 QClaw 本地密文格式: ${prefix || '<empty>'}`);
  }

  const key = crypto.pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1');
  const iv = Buffer.alloc(16, ' ');
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  return Buffer.concat([
    decipher.update(encrypted.slice(3)),
    decipher.final(),
  ]).toString('utf8');
}

function decryptStoredValue(storedValue) {
  if (typeof storedValue === 'string') {
    return storedValue.trim();
  }

  if (!storedValue || typeof storedValue !== 'object') {
    return '';
  }

  if (typeof storedValue.value === 'string') {
    return storedValue.value.trim();
  }

  if (typeof storedValue.cipherText !== 'string') {
    return '';
  }

  return decryptChromiumV10(storedValue.cipherText, getKeychainPassword()).trim();
}

function readQClawApiKey() {
  if (process.platform !== 'darwin') {
    throw new Error('当前只支持 macOS：QClaw 的本地密钥保存在 macOS Keychain 中。');
  }

  const appStorePath = getAppStorePath();
  if (!fs.existsSync(appStorePath)) {
    throw new Error(
      `未找到 QClaw 本地存储文件：${appStorePath}\n` +
        '请先安装并打开 QClaw，完成一次登录/授权。'
    );
  }

  const store = readJsonFile(appStorePath);
  const apiKey = decryptStoredValue(store[QCLAW_API_KEY_STORE_KEY]);
  if (!apiKey) {
    throw new Error(
      `未在 QClaw 本地存储中找到 ${QCLAW_API_KEY_STORE_KEY}。\n` +
        '请先在 QClaw 中完成登录，并让 QClaw 初始化默认 provider。'
    );
  }

  return apiKey;
}

function printCurlExample(apiKey) {
  process.stdout.write(
    `\n` +
      `curl --location --request POST 'https://mmgrcalltoken.3g.qq.com/aizone/v1/chat/completions' \\\n` +
      `  -H 'Authorization: Bearer ${apiKey}' \\\n` +
      `  -H 'Content-Type: application/json' \\\n` +
      `  -d '{\n` +
      `    "model": "modelroute",\n` +
      `    "messages": [\n` +
      `      { "role": "system", "content": "hi" },\n` +
      `      { "role": "user", "content": "hi" }\n` +
      `    ]\n` +
      `  }'\n`
  );
}

function run() {
  try {
    const apiKey = readQClawApiKey();
    log('已从已登录的 QClaw 本地存储读取 apiKey。');
    process.stdout.write(`${apiKey}\n`);

    if (!process.argv.includes('--key-only')) {
      printCurlExample(apiKey);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`读取 QClaw apiKey 失败：${message}`);
    process.exitCode = 1;
  }
}

run();
