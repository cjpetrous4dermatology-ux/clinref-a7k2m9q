#!/usr/bin/env node
// AiCVD 模擬考：建置與加密工具
//
//   node exam-app/build.mjs build     讀 exam-src/（明文，不進 git）→ 驗證 → 加密 → 產生 exam/index.html
//   node exam-app/build.mjs app       只重新打包程式碼（沿用現有加密題庫，不需要明文）
//   node exam-app/build.mjs decrypt   從 exam-app/bank-src.enc.json 還原 exam-src/（編輯題目前先跑這個）
//   node exam-app/build.mjs stats     列出題庫分布（需要 exam-src/）
//   node exam-app/build.mjs rekey     換密碼（需要 exam-src/；舊密碼在其他裝置「記住」的狀態會失效）
//
// 密碼來源：環境變數 EXAM_PASS，或 exam-src/.passphrase 檔案（第一行）。

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'exam-src');
const OUT_HTML = path.join(ROOT, 'exam', 'index.html');
const BANK_ENC = path.join(HERE, 'bank.enc.json');
const SRC_ENC = path.join(HERE, 'bank-src.enc.json');
const ITER = 600000;
const { parseBank, DOMAINS, PARTS } = require('./parser.js');

function passphrase() {
  if (process.env.EXAM_PASS) return process.env.EXAM_PASS;
  const f = path.join(SRC, '.passphrase');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').split('\n')[0].trim();
  console.error('找不到密碼：請設定 EXAM_PASS，或在 exam-src/.passphrase 第一行寫入密碼。');
  process.exit(1);
}

function deriveKey(pass, salt) {
  return crypto.pbkdf2Sync(Buffer.from(pass, 'utf8'), salt, ITER, 32, 'sha256');
}

function encrypt(obj, key, salt) {
  const iv = crypto.randomBytes(12);
  const plain = zlib.gzipSync(Buffer.from(JSON.stringify(obj), 'utf8'), { level: 9 });
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]);
  return { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64') };
}

function decrypt(env, pass) {
  const key = deriveKey(pass, Buffer.from(env.salt, 'base64'));
  const buf = Buffer.from(env.ct, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(env.iv, 'base64'));
  d.setAuthTag(buf.subarray(buf.length - 16));
  const plain = Buffer.concat([d.update(buf.subarray(0, buf.length - 16)), d.final()]);
  return JSON.parse(zlib.gunzipSync(plain).toString('utf8'));
}

function readSource() {
  if (!fs.existsSync(SRC)) {
    console.error('找不到 exam-src/。先執行：node exam-app/build.mjs decrypt');
    process.exit(1);
  }
  const files = {};
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const p = path.join(dir, name);
      const rel = path.relative(SRC, p).split(path.sep).join('/');
      if (name.startsWith('.')) continue;
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(txt|svg|json|md|mjs)$/.test(name)) files[rel] = fs.readFileSync(p, 'utf8');
    }
  };
  walk(SRC);
  return files;
}

function compile(files) {
  let questions = [], errors = [];
  const figures = {};
  for (const [rel, text] of Object.entries(files)) {
    if (rel.endsWith('.txt')) {
      const r = parseBank(text, rel);
      questions = questions.concat(r.questions);
      errors = errors.concat(r.errors);
    } else if (rel.startsWith('figures/') && rel.endsWith('.svg')) {
      figures[path.basename(rel, '.svg')] = text.trim();
    }
  }
  const seen = new Set();
  for (const q of questions) {
    if (seen.has(q.id)) errors.push('重複的題號 ' + q.id);
    seen.add(q.id);
    if (q.fig && !figures[q.fig]) errors.push(q.id + ': 找不到圖 figures/' + q.fig + '.svg');
  }
  let meta = {};
  if (files['meta.json']) {
    try { meta = JSON.parse(files['meta.json']); } catch (e) { errors.push('meta.json 不是有效的 JSON：' + e.message); }
  }
  return { questions, figures, meta, errors };
}

function stats(questions) {
  const by = (k) => questions.reduce((m, q) => ((m[q[k]] = (m[q[k]] || 0) + 1), m), {});
  console.log('總題數', questions.length);
  console.log('各部分', by('part'));
  const t = {};
  for (const q of questions) {
    t[q.dom] = t[q.dom] || { mcq: 0, essay: 0, image: 0, histo: 0 };
    t[q.dom][q.part]++;
  }
  console.table(DOMAINS.map((d) => ({ dom: d, ...(t[d] || {}) })));
  const papers = {};
  for (const q of questions) {
    const k = q.part + ':' + (q.paper || '-');
    papers[k] = (papers[k] || 0) + 1;
  }
  console.log('各卷', papers);
  console.log('物種', by('sp'));
  console.log('難度', by('diff'));
  const recent = questions.filter((q) => q.yr && q.yr >= 2016).length;
  console.log('2016 年後文獻題', recent, '(' + Math.round((recent / questions.length) * 100) + '%)');
}

function buildHtml(bankEnv) {
  const tpl = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8');
  const css = fs.readFileSync(path.join(HERE, 'app.css'), 'utf8');
  const parser = fs.readFileSync(path.join(HERE, 'parser.js'), 'utf8');
  const app = fs.readFileSync(path.join(HERE, 'app.js'), 'utf8');
  const html = tpl
    .replace('/*__CSS__*/', () => css)
    .replace('/*__PARSER__*/', () => parser)
    .replace('/*__APP__*/', () => app)
    .replace('"__BANK__"', () => JSON.stringify(bankEnv));
  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, html);
  console.log('已寫入', path.relative(ROOT, OUT_HTML), Math.round(html.length / 1024) + ' KB');
}

function existingSalt() {
  if (fs.existsSync(BANK_ENC)) return Buffer.from(JSON.parse(fs.readFileSync(BANK_ENC, 'utf8')).salt, 'base64');
  return null;
}

function build({ rekey = false } = {}) {
  const files = readSource();
  const { questions, figures, meta, errors } = compile(files);
  if (errors.length) {
    console.error('題庫有 ' + errors.length + ' 個問題：\n  ' + errors.join('\n  '));
    process.exit(1);
  }
  stats(questions);
  const pass = passphrase();
  const salt = (!rekey && existingSalt()) || crypto.randomBytes(16);
  // 沿用舊 salt 前先確認密碼一致，避免用錯密碼覆蓋
  if (!rekey && fs.existsSync(SRC_ENC)) {
    try { decrypt(JSON.parse(fs.readFileSync(SRC_ENC, 'utf8')), pass); }
    catch { console.error('密碼與現有加密檔不符。若要換密碼請用 rekey。'); process.exit(1); }
  }
  const key = deriveKey(pass, salt);
  const bank = { builtAt: new Date().toISOString(), questions, figures, meta };
  const bankEnv = encrypt(bank, key, salt);
  fs.writeFileSync(BANK_ENC, JSON.stringify(bankEnv));
  fs.writeFileSync(SRC_ENC, JSON.stringify(encrypt({ files }, key, salt)));
  buildHtml(bankEnv);
}

const cmd = process.argv[2] || 'build';
if (cmd === 'build') build();
else if (cmd === 'rekey') build({ rekey: true });
else if (cmd === 'app') buildHtml(JSON.parse(fs.readFileSync(BANK_ENC, 'utf8')));
else if (cmd === 'stats') { const r = compile(readSource()); if (r.errors.length) console.error(r.errors.join('\n')); stats(r.questions); }
else if (cmd === 'decrypt') {
  let files;
  try { ({ files } = decrypt(JSON.parse(fs.readFileSync(SRC_ENC, 'utf8')), passphrase())); }
  catch { console.error('密碼不對，無法解密 bank-src.enc.json。'); process.exit(1); }
  for (const [rel, text] of Object.entries(files)) {
    const p = path.join(SRC, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
  }
  console.log('已還原 ' + Object.keys(files).length + ' 個檔案到 exam-src/');
} else {
  console.error('未知指令：' + cmd);
  process.exit(1);
}
