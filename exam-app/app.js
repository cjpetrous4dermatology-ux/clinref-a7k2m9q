(() => {
  'use strict';

  // ───────────────────────── 常數 ─────────────────────────
  // 各部分的題數、時間與說明來自加密題庫 meta.parts
  const PARTS = {
    mcq: { name: '選擇題', en: 'MCQ', min: 0, n: 0, day: '', form: '' },
    essay: { name: '申論題', en: 'Essay', min: 0, n: 0, day: '', form: '' },
    image: { name: '影像題', en: 'Image', min: 0, n: 0, day: '', form: '' },
    histo: { name: '組織病理', en: 'Histopathology', min: 0, n: 0, day: '', form: '' },
  };
  const PART_ORDER = ['mcq', 'essay', 'image', 'histo'];
  const DOMS = {
    SF: { n: '皮膚構造與功能', en: 'Structure & function', w: 11 },
    IMM: { n: '免疫學（過敏・自體免疫）', en: 'Immunology', w: 17 },
    MIC: { n: '微生物與感染', en: 'Microbiology & infectious', w: 12 },
    PAR: { n: '寄生蟲與節肢動物', en: 'Parasitology', w: 7 },
    OTO: { n: '耳科', en: 'Otology', w: 5 },
    IMO: { n: '內科（內分泌）與腫瘤', en: 'Internal medicine & oncology', w: 5 },
    GEN: { n: '遺傳性疾病', en: 'Genetics', w: 3 },
    NEB: { n: '營養・環境・行為', en: 'Nutritional, environmental, behavioural', w: 3 },
    PHA: { n: '藥理與治療', en: 'Pharmacology & therapeutics', w: 14 },
    CLP: { n: '臨床病理與檢驗', en: 'Clinical pathology', w: 5 },
    DPA: { n: '皮膚病理', en: 'Dermatopathology', w: 15 },
    RES: { n: '研究方法與統計', en: 'Research methodology', w: 1 },
    CR: { n: '臨床推理', en: 'Clinical reasoning', w: 2 },
  };
  const SPN = { general: '通用', dog: '犬', cat: '貓', dogcat: '犬貓', horse: '馬', farm: '經濟動物', exotic: '異寵', human: '人醫比較' };
  const DIFF = { 1: '易', 2: '中', 3: '難' };
  const ERAS = [
    { k: 'classic', n: '經典／教科書', test: (y) => !y || y < 2016 },
    { k: '2016', n: '2016–2020 文獻', test: (y) => y >= 2016 && y <= 2020 },
    { k: '2021', n: '2021 年後文獻', test: (y) => y >= 2021 },
  ];
  // 每個領域的建議讀物（內容在加密題庫 meta.read）
  let READ = {};
  const PAPER_NAMES = { R: '近年文獻精選（2016–2026）' };
  const paperName = (k) => PAPER_NAMES[k] || '試卷 ' + k;
  const DAY = 86400000;
  const SRS_DAYS = [0, 1, 3, 7, 14, 30];
  const PASS_PART = 0.5, PASS_AVG = 0.65, CARRY = 0.65, WRONG_BELOW = 0.6;
  const KEY = 'aicvd-mock-v1';

  // ───────────────────────── 小工具 ─────────────────────────
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (s) => {
    if (!s) return '';
    let h = esc(s);
    h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    h = h.replace(/(^|[\s(（>\/])_([^_\n]+?)_(?=[\s).,;:，。、）\/]|$)/g, '$1<i>$2</i>');
    return h.replace(/\n/g, '<br>');
  };
  const pct = (x, d = 0) => (x == null || isNaN(x) ? '—' : (x * 100).toFixed(d) + '%');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmtDate = (t) => { const d = new Date(t); return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0'); };
  const fmtDateTime = (t) => { const d = new Date(t); return fmtDate(t) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const fmtClock = (sec) => {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  };
  const fmtDur = (sec) => { sec = Math.round(sec || 0); const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? h + ' 小時 ' + m + ' 分' : m + ' 分'; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const statusOf = (x) => (x == null ? 'none' : x >= CARRY ? 'good' : x >= PASS_PART ? 'warn' : 'bad');
  const statusPill = (x) => {
    const st = statusOf(x);
    if (st === 'none') return '<span class="pill pill-neutral">尚無資料</span>';
    const label = st === 'good' ? '✓ ≥65%' : st === 'warn' ? '△ 50–65%' : '✕ &lt;50%';
    return '<span class="pill pill-' + st + '">' + label + '</span>';
  };

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2600);
  }

  // ───────────────────────── 儲存 ─────────────────────────
  function defaults() {
    return { v: 1, hist: {}, srs: {}, notes: {}, flags: {}, sessions: [], active: null, settings: { examDate: '2027-07-31', theme: 'system', size: 'normal', shuffle: true } };
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      const d = defaults();
      return Object.assign(d, raw, { settings: Object.assign(d.settings, raw.settings || {}) });
    } catch (e) { return defaults(); }
  }
  let S = load();
  let saveWarned = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { if (!saveWarned) { toast('進度無法存進瀏覽器（儲存空間被封鎖或已滿），請到設定匯出備份'); saveWarned = true; } }
  }

  // IndexedDB：記住的金鑰、自訂題目、自己附的圖片
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('aicvd-mock', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('images'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function idb(store, mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
    });
  }
  const idbGet = (store, k) => idb(store, 'readonly', (s) => s.get(k)).catch(() => null);
  const idbPut = (store, k, v) => idb(store, 'readwrite', (s) => s.put(v, k));
  const idbDel = (store, k) => idb(store, 'readwrite', (s) => s.delete(k));

  // ───────────────────────── 解密 ─────────────────────────
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function deriveKey(pass, env) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(env.salt), iterations: env.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  }
  async function openBank(key, env) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(env.iv) }, key, b64(env.ct));
    const stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }

  // ───────────────────────── 題庫 ─────────────────────────
  let B = null;           // { questions, figures, meta, builtAt }
  let TIPS = [], TEXT = {};
  let Q = {};             // id → question
  let customCount = 0;
  const byPart = (p) => B.questions.filter((q) => q.part === p);

  async function attachCustom() {
    const text = await idbGet('kv', 'custom');
    customCount = 0;
    if (!text) return [];
    const r = QParser.parseBank(text, '自訂題目');
    const ok = r.questions.filter((q) => !Q[q.id] || Q[q.id].custom);
    ok.forEach((q) => { q.custom = true; q.paper = q.paper || 'U'; });
    B.questions = B.questions.filter((q) => !q.custom).concat(ok);
    customCount = ok.length;
    index();
    return r.errors;
  }
  function index() { Q = {}; B.questions.forEach((q) => (Q[q.id] = q)); }

  // ───────────────────────── 成績計算 ─────────────────────────
  function latest() {
    const m = {};
    for (const id in S.hist) { const a = S.hist[id]; if (Q[id] && a.length) m[id] = a[a.length - 1].s; }
    return m;
  }
  function groupAcc(keyFn) {
    const L = latest(), g = {};
    for (const id in L) {
      const k = keyFn(Q[id]);
      if (k == null) continue;
      (g[k] = g[k] || { s: 0, n: 0 });
      g[k].s += L[id]; g[k].n++;
    }
    for (const k in g) g[k].acc = g[k].s / g[k].n;
    return g;
  }
  function record(qid, sc, mode) {
    const now = Date.now();
    (S.hist[qid] = S.hist[qid] || []).push({ t: now, s: Math.round(sc * 1000) / 1000, m: mode });
    if (S.hist[qid].length > 12) S.hist[qid] = S.hist[qid].slice(-12);
    const r = S.srs[qid];
    if (sc < WRONG_BELOW) S.srs[qid] = { box: 0, due: now, wrong: ((r && r.wrong) || 0) + 1, last: now, added: (r && r.added) || now };
    else if (r) { r.box = Math.min(5, r.box + 1); r.due = now + SRS_DAYS[r.box] * DAY; r.last = now; }
  }
  const wrongActive = () => Object.keys(S.srs).filter((id) => Q[id] && S.srs[id].box < 5);
  const wrongDue = () => wrongActive().filter((id) => S.srs[id].due <= Date.now());
  const mastered = () => Object.keys(S.srs).filter((id) => Q[id] && S.srs[id].box >= 5);
  const flagged = () => Object.keys(S.flags).filter((id) => Q[id] && S.flags[id]);

  // 只有接近整份長度的模擬才算進放榜與走勢（近年文獻精選等小卷不算）
  const isFullMock = (s) => s.mode === 'mock' && PARTS[s.part] && s.n >= Math.min(PARTS[s.part].n, 20) * 0.8;
  function latestMock() {
    const out = {};
    for (const s of S.sessions) if (isFullMock(s) && !out[s.part]) out[s.part] = s;
    return out;
  }
  function verdict() {
    const lm = latestMock();
    const parts = PART_ORDER.map((p) => ({ p, s: lm[p] }));
    const have = parts.filter((x) => x.s);
    const allIn = have.length === 4;
    const avg = allIn ? sum(have.map((x) => x.s.pct)) / 4 : null;
    const minOk = have.every((x) => x.s.pct >= PASS_PART);
    const pass = allIn && minOk && avg >= PASS_AVG;
    const carry = have.filter((x) => x.s.pct >= CARRY).map((x) => x.p);
    return { parts, allIn, avg, minOk, pass, carry };
  }
  function priorities() {
    const g = groupAcc((q) => q.dom);
    const total = {};
    B.questions.forEach((q) => (total[q.dom] = (total[q.dom] || 0) + 1));
    return Object.keys(DOMS).filter((d) => total[d]).map((d) => {
      const x = g[d];
      const n = x ? x.n : 0;
      const acc = x ? x.acc : null;
      const conf = Math.min(1, n / 5);
      const pr = DOMS[d].w * (acc == null ? 0.5 : (1 - acc) * conf + 0.5 * (1 - conf));
      return { d, acc, n, total: total[d], pr };
    }).sort((a, b) => b.pr - a.pr);
  }

  // ───────────────────────── UI 狀態 ─────────────────────────
  const ui = { view: 'home', resultId: null, single: null, confirm: null, tick: null, last: 0, practice: null, search: '', wtab: 'due', urls: [] };

  function applyTheme() {
    const r = document.documentElement;
    if (S.settings.theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', S.settings.theme);
    if (S.settings.size === 'large') r.setAttribute('data-size', 'large'); else r.removeAttribute('data-size');
  }
  function daysLeft() {
    const t = new Date(S.settings.examDate + 'T09:00:00').getTime();
    return isNaN(t) ? null : Math.ceil((t - Date.now()) / DAY);
  }

  const NAV = [
    ['home', '總覽'], ['mock', '模擬考'], ['practice', '主題練習'], ['wrong', '錯題本'], ['history', '成績紀錄'], ['analysis', '弱項分析'], ['settings', '設定'],
  ];
  function shell(inner) {
    const dl = daysLeft();
    const due = wrongDue().length;
    return '<header class="top"><div class="top-inner gutter">' +
      '<div class="brand">AiCVD <span>Board</span> 模擬考</div>' +
      (dl != null ? '<div class="countdown">距離考試 <b>' + dl + '</b> 天</div>' : '') +
      '<div class="top-spacer"></div>' +
      (S.active ? '<button class="btn btn-sm btn-primary" data-act="resume">繼續作答</button>' : '') +
      '<button class="btn btn-sm btn-ghost" data-act="lock" title="鎖定並清除畫面上的題目">鎖定</button>' +
      '</div><nav class="tabs gutter" aria-label="主選單">' +
      NAV.map(([k, n]) => '<button class="tab" data-go="' + k + '"' + (ui.view === k ? ' aria-current="page"' : '') + '>' + n +
        (k === 'wrong' && due ? '<span class="badge">' + due + '</span>' : '') + '</button>').join('') +
      '</nav></header><main class="view gutter" id="main">' + inner + '</main>';
  }

  function go(view) {
    if (ui.view === 'run' && view !== 'run') stopTick();
    if ((view === 'run' || view === 'grade') && !S.active) view = 'home';
    if (view === 'run' && S.active.grading) view = 'grade';
    ui.view = view;
    ui.confirm = null;
    window.scrollTo(0, 0);
    if (['home', 'mock', 'practice', 'wrong', 'history', 'analysis', 'settings'].includes(view)) {
      try { history.replaceState(null, '', '#' + view); } catch (e) { /* 預覽環境 */ }
    }
    render();
  }

  function render() {
    revokeUrls();
    const app = $('#app');
    const v = ui.view;
    if (v === 'run') { app.innerHTML = renderRunner(); startTick(); fillImages(); return; }
    if (v === 'grade') { app.innerHTML = renderGrading(); return; }
    const views = { home: renderHome, mock: renderMock, practice: renderPractice, wrong: renderWrong, history: renderHistory, analysis: renderAnalysis, settings: renderSettings, result: renderResult };
    app.innerHTML = shell((views[v] || renderHome)());
    if (v === 'result') fillImages();
  }

  // ───────────────────────── 總覽 ─────────────────────────
  function renderVerdict() {
    const v = verdict();
    const cells = v.parts.map(({ p, s }) => {
      const st = s ? statusOf(s.pct) : 'none';
      return '<div class="verdict-part"><div class="small muted">' + PARTS[p].day + '・' + PARTS[p].name + '</div>' +
        '<div class="v">' + (s ? pct(s.pct, 1) : '—') + '</div>' +
        (s ? '<div>' + statusPill(s.pct) + (s.pct >= CARRY ? ' <span class="pill pill-info">可保留</span>' : '') + '</div><div class="small muted">' + fmtDate(s.date) + (s.paper ? '・' + esc(paperName(s.paper)) : '') + '</div>'
          : '<div class="small muted">尚未模擬</div>') + '</div>';
    }).join('');
    let line;
    if (!v.parts.some((x) => x.s)) line = '<span class="pill pill-neutral">尚未完成任何一部分的全真模擬</span>';
    else if (!v.allIn) line = '<span class="pill pill-neutral">還差 ' + (4 - v.parts.filter((x) => x.s).length + ' 部分才能判定') + '</span>' + (v.carry.length ? ' <span class="small">目前可保留：' + v.carry.map((p) => PARTS[p].name).join('、') + '</span>' : '');
    else if (v.pass) line = '<span class="pill pill-good">✓ 模擬通過</span> <span class="small">四部分平均 ' + pct(v.avg, 1) + '，每部分皆 ≥50%</span>';
    else line = '<span class="pill pill-bad">✕ 模擬未通過</span> <span class="small">平均 ' + pct(v.avg, 1) + (v.minOk ? '（未達 65%）' : '（有部分 <50%）') + (v.carry.length ? '；可保留：' + v.carry.map((p) => PARTS[p].name).join('、') : '；沒有可保留的部分') + '</span>';
    return '<section class="panel"><div class="panel-head"><h3>模擬放榜</h3><span class="rule">規則：每部分 ≥50%、四部分平均 ≥65% 才通過；單一部分 ≥65% 可保留到下次</span></div>' +
      '<div class="verdict">' + cells + '</div><div>' + line + '</div></section>';
  }

  function renderHome() {
    const total = B.questions.length;
    const L = latest();
    const done = Object.keys(L).length;
    const accAll = done ? sum(Object.values(L)) / done : null;
    const dl = daysLeft();
    const pri = priorities().slice(0, 3);
    const a = S.active;
    let h = '<div class="view-head"><p class="eyebrow">AiCVD Diplomate Examination・模擬練習</p><h2>總覽</h2>' +
      '<p>題目是依 ECVD 2022 Exam Blueprint 的領域權重與 AiCVD 書單撰寫的原創模擬題（非歷屆真題），偏重 2016 年後的文獻。成績、錯題與筆記只存在這台裝置的瀏覽器裡。</p></div>';
    if (a) {
      const answered = a.qids.filter((id) => isAnswered(a, Q[id])).length;
      h += '<section class="panel"><div class="panel-head"><h3>作答中：' + esc(a.title) + '</h3><span class="small muted">' + answered + ' / ' + a.qids.length + ' 題已作答' +
        (a.limit ? '・剩 ' + fmtClock(a.limit - a.elapsed) : '・已用 ' + fmtClock(a.elapsed)) + '</span></div>' +
        '<div class="row"><button class="btn btn-primary" data-act="resume">繼續作答</button><button class="btn btn-ghost btn-sm" data-act="abandon">放棄這次作答</button></div>' +
        (ui.confirm === 'abandon' ? '<div class="confirm">確定放棄？這次的作答不會計分。<div class="row"><button class="btn btn-danger btn-sm" data-act="abandon-yes">放棄</button><button class="btn btn-sm" data-act="cancel">取消</button></div></div>' : '') +
        '</section>';
    }
    h += '<section class="panel"><div class="stats-row">' +
      stat(dl != null ? dl + ' 天' : '—', '距離考試', S.settings.examDate + '（可在設定修改）') +
      stat(done + ' / ' + total, '已練習題數', '涵蓋率 ' + pct(total ? done / total : 0)) +
      stat(pct(accAll), '目前正確率', '每題以最近一次作答計') +
      stat(String(wrongDue().length), '今天該複習', '錯題本共 ' + wrongActive().length + ' 題') +
      '</div></section>';
    h += renderVerdict();
    h += '<div class="grid-2"><section class="panel"><div class="panel-head"><h3>先補這三個領域</h3><button class="btn btn-sm btn-ghost" data-go="analysis">完整分析 →</button></div>' +
      (done < 10 ? '<p class="small muted">練習滿 10 題後排序會比較可靠；目前先依 Blueprint 權重排。</p>' : '') +
      '<div class="stack">' + pri.map((p) => '<div class="row" style="justify-content:space-between"><div><b>' + DOMS[p.d].n + '</b> <span class="small muted">Blueprint ' + DOMS[p.d].w + '%・已做 ' + p.n + '/' + p.total + '</span></div>' +
        '<div class="row">' + statusPill(p.acc) + '<span class="mono small">' + pct(p.acc) + '</span><button class="btn btn-sm" data-act="drill" data-dom="' + p.d + '">練 20 題</button></div></div>').join('') + '</div></section>' +
      '<section class="panel"><div class="panel-head"><h3>開始一場全真模擬</h3><button class="btn btn-sm btn-ghost" data-go="mock">全部試卷 →</button></div><div class="stack">' +
      PART_ORDER.map((p) => '<div class="row" style="justify-content:space-between"><div><b>' + PARTS[p].name + '</b> <span class="small muted">' + PARTS[p].day + '・' + PARTS[p].n + ' 題・' + PARTS[p].min + ' 分鐘</span></div>' +
        '<button class="btn btn-sm" data-act="mock-random" data-part="' + p + '">隨機組卷</button></div>').join('') + '</div></section></div>';
    h += renderRecent(5);
    return h;
  }
  const stat = (v, k, d) => '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="d">' + (d || '') + '</div></div>';

  function renderRecent(n) {
    const list = S.sessions.slice(0, n);
    if (!list.length) return '<section class="panel"><h3>最近作答</h3><div class="empty">還沒有作答紀錄。從「模擬考」開始一份試卷，或在「主題練習」挑領域練。<button class="btn btn-primary btn-sm" data-go="mock">去模擬考</button></div></section>';
    return '<section class="panel"><div class="panel-head"><h3>最近作答</h3><button class="btn btn-sm btn-ghost" data-go="history">全部紀錄 →</button></div>' + sessionTable(list) + '</section>';
  }
  const MODE = { mock: '全真模擬', practice: '主題練習', review: '錯題複習' };
  function sessionTable(list) {
    return '<div class="table-wrap"><table class="t"><thead><tr><th>日期</th><th>類型</th><th>內容</th><th class="num">題數</th><th class="num">得分</th><th>判定</th><th class="num">用時</th></tr></thead><tbody>' +
      list.map((s) => '<tr class="clickable" data-act="open-result" data-id="' + s.id + '"><td class="mono">' + fmtDateTime(s.date) + '</td><td>' + MODE[s.mode] + '</td><td>' + esc(s.title) + '</td><td class="num">' + s.n + '</td><td class="num">' + pct(s.pct, 1) + '</td><td>' + statusPill(s.pct) + '</td><td class="num">' + fmtClock(s.elapsed) + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  // ───────────────────────── 模擬考 ─────────────────────────
  function papersOf(part) {
    const m = {};
    byPart(part).forEach((q) => { const k = q.paper || '-'; (m[k] = m[k] || []).push(q.id); });
    return Object.keys(m).filter((k) => k !== '-' && k !== 'U').sort().map((k) => ({ k, ids: m[k] }));
  }
  function lastPaperScore(part, paper) { return S.sessions.find((s) => s.mode === 'mock' && s.part === part && s.paper === paper); }

  function renderMock() {
    let h = '<div class="view-head"><p class="eyebrow">Full-length mock</p><h2>全真模擬考</h2><p>' + esc(TEXT.mockIntro || '') + '</p></div>';
    h += '<div class="grid-parts">' + PART_ORDER.map((p) => {
      const P = PARTS[p];
      const papers = papersOf(p);
      return '<section class="panel"><div class="panel-head"><h3>' + P.day + '・' + P.name + ' <span class="muted small">' + P.en + '</span></h3><span class="small muted">' + P.n + ' 題・' + P.min + ' 分鐘</span></div>' +
        '<p class="small">' + P.form + '</p><div class="paper-list">' +
        papers.map(({ k, ids }) => {
          const last = lastPaperScore(p, k);
          const mins = Math.round(sum(ids.map((id) => Q[id].min)));
          return '<div class="paper"><div><div class="paper-name">' + esc(paperName(k)) + '</div><div class="paper-meta">' + ids.length + ' 題・建議 ' + Math.min(P.min, mins) + ' 分鐘' + (last ? '・上次 ' + pct(last.pct) + '（' + fmtDate(last.date) + '）' : '・未考過') + '</div></div>' +
            '<button class="btn btn-sm btn-primary" data-act="mock-paper" data-part="' + p + '" data-paper="' + esc(k) + '">開始</button></div>';
        }).join('') +
        '<div class="paper"><div><div class="paper-name">隨機組卷</div><div class="paper-meta">' + (p === 'mcq' ? '依 Blueprint 權重抽 100 題，' : '從全部 ' + byPart(p).length + ' 題抽 ' + Math.min(P.n, byPart(p).length) + ' 題，') + '優先沒做過的題目</div></div>' +
        '<button class="btn btn-sm" data-act="mock-random" data-part="' + p + '">開始</button></div>' +
        '</div></section>';
    }).join('') + '</div>';
    if (TIPS.length) h += '<section class="panel"><h3>' + esc(TEXT.tipsTitle || '') + '</h3><ul class="small" style="margin:0;padding-left:1.2em;display:grid;gap:.3rem">' + TIPS.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul></section>';
    return h;
  }

  function buildRandom(part) {
    const pool = byPart(part);
    const n = Math.min(PARTS[part].n, pool.length);
    const unseen = (q) => !S.hist[q.id];
    const pick = (arr, k) => shuffle(arr.filter(unseen)).concat(shuffle(arr.filter((q) => !unseen(q)))).slice(0, k);
    if (part !== 'mcq') return pick(pool, n).map((q) => q.id);
    const chosen = new Set();
    const wsum = sum(Object.values(DOMS).map((d) => d.w));
    Object.keys(DOMS).forEach((d) => {
      const k = Math.round((DOMS[d].w / wsum) * n);
      pick(pool.filter((q) => q.dom === d), k).forEach((q) => chosen.add(q.id));
    });
    const rest = pick(pool.filter((q) => !chosen.has(q.id)), n - chosen.size);
    rest.forEach((q) => chosen.add(q.id));
    return shuffle([...chosen]).slice(0, n);
  }
  function newSession(o) {
    const s = { id: uid(), mode: o.mode, part: o.part, paper: o.paper || null, title: o.title, qids: o.qids, ans: {}, marks: {}, shown: {}, perm: {}, idx: 0, date: Date.now(), elapsed: 0, limit: o.limitMin ? o.limitMin * 60 : 0 };
    if (S.settings.shuffle && o.mode !== 'mock') {
      s.qids.forEach((id) => { const q = Q[id]; if (q.kind === 'choice') s.perm[id] = shuffle(q.opts.map((_, i) => i)); });
    }
    return s;
  }
  function begin(s) {
    if (!s.qids.length) { toast('沒有符合條件的題目'); return; }
    S.active = s; save(); go('run');
  }
  function startMock(part, paper) {
    const P = PARTS[part];
    let qids, title;
    if (paper) { qids = papersOf(part).find((x) => x.k === paper).ids.slice(); title = P.name + '・' + paperName(paper); }
    else { qids = buildRandom(part); title = P.name + '・隨機組卷'; }
    const mins = Math.min(P.min, Math.round(sum(qids.map((id) => Q[id].min))));
    begin(newSession({ mode: 'mock', part, paper: paper || '隨機', title, qids, limitMin: mins }));
  }

  // ───────────────────────── 作答 ─────────────────────────
  function isAnswered(s, q) {
    const a = s.ans[q.id];
    if (q.kind === 'choice') return a != null;
    return !!(a && a.some((t) => t && t.trim())) || !!s.shown[q.id];
  }
  function scoreOf(s, q) {
    if (q.kind === 'choice') return s.ans[q.id] === q.answer ? 1 : 0;
    const m = s.marks[q.id] || [];
    return q.max ? m.filter(Boolean).length / q.max : 0;
  }
  const kOffset = (q, si) => sum(q.subs.slice(0, si).map((x) => x.k.length));

  function figHtml(q) {
    let h = '';
    if (q.fig && B.figures[q.fig]) h += '<figure class="fig">' + B.figures[q.fig] + '<figcaption>原創示意圖（非實際照片）</figcaption></figure>';
    if (q.img) h += '<div class="imgdesc"><div class="lbl">影像描述</div><div>' + fmt(q.img) + '</div></div>';
    h += '<div class="myimgs" data-myimgs="' + esc(q.id) + '"></div>';
    return h;
  }
  function chipsHtml(q) {
    return '<div class="chips"><span class="chip">' + PARTS[q.part].name + '</span><span class="chip">' + DOMS[q.dom].n + '</span>' +
      (q.sp ? '<span class="chip">' + (SPN[q.sp] || q.sp) + '</span>' : '') + '<span class="chip">Grade ' + q.g + '</span><span class="chip">難度 ' + DIFF[q.diff] + '</span>' +
      (q.yr ? '<span class="chip">' + q.yr + '</span>' : '') + (q.custom ? '<span class="chip">自訂</span>' : '') + '</div>';
  }
  function explainHtml(q) {
    if (!q.X && !q.R.length && !q.V) return '';
    return '<div class="x"><div class="x-title">解析</div>' + (q.X ? '<div>' + fmt(q.X) + '</div>' : '') +
      (q.R.length ? '<div class="refs">' + q.R.map((r) => '<div>📄 ' + fmt(r) + '</div>').join('') + '</div>' : '') +
      (q.V ? '<div class="verify"><span class="verify-t">文獻核對</span>' + fmt(q.V) + '</div>' : '') + '</div>';
  }

  function renderRunner() {
    const s = S.active;
    const q = Q[s.qids[s.idx]];
    const n = s.qids.length;
    const answered = s.qids.filter((id) => isAnswered(s, Q[id])).length;
    const remain = s.limit ? s.limit - s.elapsed : null;
    const instant = s.mode !== 'mock';
    let h = '<div class="runbar"><div class="runbar-inner gutter">' +
      '<span class="title">' + esc(s.title) + '</span><span class="pill pill-info">' + MODE[s.mode] + '</span>' +
      '<span class="timer' + (remain != null && remain < 600 ? ' low' : '') + '" id="timer" aria-live="off">' + (remain != null ? fmtClock(remain) : fmtClock(s.elapsed)) + '</span>' +
      '<div class="progress" aria-label="作答進度"><i style="width:' + (answered / n) * 100 + '%"></i></div>' +
      '<span class="small mono">' + answered + '/' + n + '</span>' +
      '<button class="btn btn-sm btn-ghost" data-act="pause">暫停離開</button>' +
      '<button class="btn btn-sm btn-primary" data-act="submit">' + (instant ? '結束練習' : '交卷') + '</button>' +
      '</div>' +
      (ui.confirm === 'submit' ? '<div class="gutter" style="max-width:1240px;margin:0 auto;padding-bottom:.6rem"><div class="confirm">還有 ' + (n - answered) + ' 題沒作答' + (instant ? '，沒作答的題目不會計分。' : '，未作答以 0 分計。') + '確定' + (instant ? '結束' : '交卷') + '？<div class="row"><button class="btn btn-danger btn-sm" data-act="submit-yes">確定</button><button class="btn btn-sm" data-act="cancel">繼續作答</button></div></div></div>' : '') +
      '</div>';
    h += '<div class="runner gutter"><article class="qcard">';
    h += '<div class="qhead"><span class="qnum">第 ' + (s.idx + 1) + ' / ' + n + ' 題</span>' + chipsHtml(q) + '</div>';
    h += figHtml(q);
    h += '<div class="stem">' + fmt(q.Q) + '</div>';
    if (q.kind === 'choice') {
      const a = s.ans[q.id];
      const shown = instant && a != null;
      const order = s.perm[q.id] || q.opts.map((_, i) => i);
      h += '<div class="opts" role="group" aria-label="選項">' + order.map((oi, pos) => {
        let cls = 'opt';
        if (shown && oi === q.answer) cls += ' is-right';
        else if (shown && oi === a) cls += ' is-wrong';
        return '<button class="' + cls + '" data-act="choose" data-oi="' + oi + '" aria-pressed="' + (a === oi) + '"' + (shown ? ' disabled' : '') + '><span class="L">' + 'ABCDEFGH'[pos] + '</span><span>' + fmt(q.opts[oi]) + '</span></button>';
      }).join('') + '</div>';
      if (shown) h += '<div class="feedback">' + (a === q.answer ? '<span class="pill pill-good">✓ 答對</span>' : '<span class="pill pill-bad">✕ 答錯</span>') + '</div>' + explainHtml(q);
    } else {
      const a = s.ans[q.id] || [];
      const shown = instant && s.shown[q.id];
      const m = s.marks[q.id] || [];
      h += q.subs.map((sub, si) => {
        let x = '<div class="sub">' + (sub.t ? '<div class="sub-t">' + fmt(sub.t) + ' <span class="muted small">（' + sub.k.length + ' 分）</span></div>' : '') +
          '<label class="field-label" for="ans-' + si + '">我的答案</label><textarea class="input" id="ans-' + si + '" data-ans="' + si + '" placeholder="用英文作答；條列式即可">' + esc(a[si] || '') + '</textarea>';
        if (shown) {
          const off = kOffset(q, si);
          x += '<div class="kps">' + sub.k.map((k, ki) => '<label class="kp"><input type="checkbox" data-mark="' + (off + ki) + '"' + (m[off + ki] ? ' checked' : '') + '><span>' + fmt(k) + '</span></label>').join('') + '</div>';
        }
        return x + '</div>';
      }).join('');
      if (instant && !shown) h += '<div><button class="btn btn-primary" data-act="reveal">對答案（顯示評分要點）</button></div>';
      if (shown) h += '<div class="feedback"><span class="small">勾選你答到的要點：</span><span class="mono" id="kp-score">' + m.filter(Boolean).length + ' / ' + q.max + '</span></div>' + explainHtml(q);
      if (!instant) h += '<p class="small muted">交卷後會顯示評分要點，再自己勾選得分。</p>';
    }
    h += noteTools(q);
    h += '<div class="qnav"><button class="btn" data-act="prev"' + (s.idx === 0 ? ' disabled' : '') + '>← 上一題</button>' +
      '<span class="small muted">鍵盤：A–D 選答、← → 換題、F 標記</span>' +
      '<button class="btn btn-primary" data-act="next"' + (s.idx === n - 1 ? ' disabled' : '') + '>下一題 →</button></div>';
    h += '</article><aside class="side"><section class="panel"><div class="panel-head"><h3>題號</h3><span class="small muted">' + answered + ' 已答</span></div><div class="navgrid">' +
      s.qids.map((id, i) => {
        const qq = Q[id];
        let cls = 'nb';
        if (instant && qq.kind === 'choice' && s.ans[id] != null) cls += s.ans[id] === qq.answer ? ' r1' : ' r0';
        else if (isAnswered(s, qq)) cls += ' done';
        if (i === s.idx) cls += ' cur';
        if (S.flags[id]) cls += ' flag';
        return '<button class="' + cls + '" data-act="jump" data-i="' + i + '" aria-label="第 ' + (i + 1) + ' 題">' + (i + 1) + '</button>';
      }).join('') + '</div><div class="legend"><span><i style="background:var(--accent-soft)"></i>已答</span><span><i style="background:var(--surface)"></i>未答</span><span><i style="background:var(--eosin);border-radius:50%"></i>已標記</span>' +
      (instant ? '<span><i style="background:var(--good-bg)"></i>對</span><span><i style="background:var(--bad-bg)"></i>錯</span>' : '') + '</div></section></aside></div>';
    return h;
  }

  function noteTools(q) {
    const note = S.notes[q.id];
    return '<div class="qtools"><button class="btn btn-sm" data-act="flag" aria-pressed="' + !!S.flags[q.id] + '">' + (S.flags[q.id] ? '★ 已標記' : '☆ 標記這題') + '</button>' +
      '<label class="btn btn-sm">＋ 附上我的圖片<input type="file" accept="image/*" data-act="addimg" data-q="' + esc(q.id) + '" hidden multiple></label></div>' +
      '<details' + (note && note.v ? ' open' : '') + '><summary class="small">我的筆記' + (note && note.v ? '（已有）' : '') + '</summary><textarea class="input" data-note="' + esc(q.id) + '" placeholder="記下自己的盲點、口訣、vault 連結…">' + esc(note ? note.v : '') + '</textarea></details>';
  }

  // 計時
  function startTick() {
    stopTick();
    ui.last = Date.now();
    ui.tick = setInterval(() => {
      const s = S.active;
      if (!s || ui.view !== 'run') return stopTick();
      const now = Date.now();
      if (document.visibilityState === 'visible') s.elapsed += (now - ui.last) / 1000;
      ui.last = now;
      const el = $('#timer');
      if (s.limit) {
        const r = s.limit - s.elapsed;
        if (el) { el.textContent = fmtClock(r); el.classList.toggle('low', r < 600); }
        if (r <= 0) { stopTick(); toast('時間到，自動交卷'); submit(true); return; }
      } else if (el) el.textContent = fmtClock(s.elapsed);
      if (Math.round(s.elapsed) % 10 === 0) save();
    }, 1000);
  }
  function stopTick() { if (ui.tick) { clearInterval(ui.tick); ui.tick = null; save(); } }

  function submit(force) {
    const s = S.active;
    const unanswered = s.qids.filter((id) => !isAnswered(s, Q[id])).length;
    if (!force && unanswered && ui.confirm !== 'submit') { ui.confirm = 'submit'; render(); return; }
    ui.confirm = null;
    stopTick();
    const needGrade = s.qids.filter((id) => {
      const q = Q[id];
      if (q.kind !== 'points') return false;
      if (s.mode === 'mock') return true;
      return isAnswered(s, q) && !s.shown[id];
    });
    if (needGrade.length) { s.grading = needGrade; needGrade.forEach((id) => (s.shown[id] = true)); save(); go('grade'); }
    else finalize(s);
  }

  function renderGrading() {
    const s = S.active;
    const ids = s.grading || [];
    const got = sum(ids.map((id) => (s.marks[id] || []).filter(Boolean).length));
    const max = sum(ids.map((id) => Q[id].max));
    let h = '<div class="runbar"><div class="runbar-inner gutter"><span class="title">自我評分：' + esc(s.title) + '</span>' +
      '<span class="pill pill-info">' + ids.length + ' 題要評分</span><span class="mono" id="grade-total">' + got + ' / ' + max + ' 分</span><div class="top-spacer"></div>' +
      '<button class="btn btn-primary btn-sm" data-act="finish-grade">完成評分，看成績</button></div></div>';
    h += '<main class="view gutter"><div class="note">' + esc(TEXT.gradingNote || '對照每題的評分要點，勾選你實際寫到的內容。') + '</div>';
    h += ids.map((id, n) => {
      const q = Q[id];
      const a = s.ans[id] || [];
      const m = s.marks[id] || [];
      return '<article class="qcard" data-gq="' + esc(id) + '"><div class="qhead"><span class="qnum">' + (s.qids.indexOf(id) + 1) + '.</span>' + chipsHtml(q) + '<span class="mono small" data-gscore="' + esc(id) + '">' + m.filter(Boolean).length + ' / ' + q.max + '</span></div>' +
        '<details><summary class="small">看題目與圖</summary><div class="stack" style="margin-top:.6rem">' + figHtml(q) + '<div class="stem">' + fmt(q.Q) + '</div></div></details>' +
        q.subs.map((sub, si) => {
          const off = kOffset(q, si);
          return '<div class="sub">' + (sub.t ? '<div class="sub-t">' + fmt(sub.t) + '</div>' : '') +
            '<div class="note">' + (a[si] && a[si].trim() ? fmt(a[si]) : '<span class="muted">（沒有作答）</span>') + '</div>' +
            '<div class="kps">' + sub.k.map((k, ki) => '<label class="kp"><input type="checkbox" data-gmark="' + esc(id) + '" data-k="' + (off + ki) + '"' + (m[off + ki] ? ' checked' : '') + '><span>' + fmt(k) + '</span></label>').join('') + '</div></div>';
        }).join('') + explainHtml(q) + '</article>';
    }).join('');
    h += '<div class="row"><button class="btn btn-primary" data-act="finish-grade">完成評分，看成績</button></div></main>';
    return h;
  }

  function finalize(s) {
    const items = [];
    for (const id of s.qids) {
      const q = Q[id];
      if (!q) continue;
      if (s.mode !== 'mock' && !isAnswered(s, q)) continue;
      const sc = scoreOf(s, q);
      items.push({ q: id, s: Math.round(sc * 1000) / 1000 });
      record(id, sc, s.mode);
    }
    const summary = { id: s.id, mode: s.mode, part: s.part, paper: s.paper, title: s.title, date: s.date, end: Date.now(), elapsed: Math.round(s.elapsed), limit: s.limit, n: items.length, pct: items.length ? sum(items.map((x) => x.s)) / items.length : 0, items, ans: s.ans, marks: s.marks, perm: s.perm };
    S.sessions.unshift(summary);
    S.sessions.slice(40).forEach((x) => { delete x.ans; delete x.marks; delete x.perm; });
    S.active = null;
    save();
    if (!items.length) { toast('沒有作答任何題目，這次不計分'); S.sessions.shift(); save(); go('home'); return; }
    ui.resultId = summary.id;
    go('result');
  }

  // ───────────────────────── 成績單 ─────────────────────────
  function renderResult() {
    const s = S.sessions.find((x) => x.id === ui.resultId);
    if (!s) return '<div class="empty">找不到這次的成績。<button class="btn btn-sm" data-go="history">回成績紀錄</button></div>';
    const g = {};
    s.items.forEach((it) => { const q = Q[it.q]; if (!q) return; (g[q.dom] = g[q.dom] || { s: 0, n: 0 }); g[q.dom].s += it.s; g[q.dom].n++; });
    const wrong = s.items.filter((it) => it.s < WRONG_BELOW);
    let h = '<div class="view-head"><p class="eyebrow">' + MODE[s.mode] + '・' + fmtDateTime(s.date) + '</p><h2>' + esc(s.title) + '</h2></div>';
    h += '<section class="panel"><div class="stats-row">' + stat(pct(s.pct, 1), '得分', statusPill(s.pct)) + stat(s.n + ' 題', '計分題數', '錯題 ' + wrong.length + ' 題已放進錯題本') +
      stat(fmtClock(s.elapsed), '用時', s.limit ? '限時 ' + fmtClock(s.limit) : '不限時') +
      stat(s.pct >= CARRY ? '可保留' : s.pct >= PASS_PART ? '過門檻' : '未過門檻', '對照及格規則', '≥50% 留在場上；≥65% 可保留') + '</div>' +
      '<div class="row">' + (wrong.length ? '<button class="btn btn-primary btn-sm" data-act="redo-wrong" data-id="' + s.id + '">重練這次的 ' + wrong.length + ' 題錯題</button>' : '') +
      '<button class="btn btn-sm" data-go="analysis">看弱項分析</button><button class="btn btn-sm btn-ghost" data-go="home">回總覽</button></div></section>';
    h += '<section class="panel"><h3>各領域得分</h3><div class="table-wrap"><table class="t"><thead><tr><th>領域</th><th class="num">題數</th><th class="num">得分</th><th>判定</th></tr></thead><tbody>' +
      Object.keys(DOMS).filter((d) => g[d]).map((d) => '<tr><td>' + DOMS[d].n + '</td><td class="num">' + g[d].n + '</td><td class="num">' + pct(g[d].s / g[d].n) + '</td><td>' + statusPill(g[d].s / g[d].n) + '</td></tr>').join('') +
      '</tbody></table></div></section>';
    const onlyWrong = ui.onlyWrong !== false;
    const list = onlyWrong ? wrong : s.items;
    h += '<section class="panel"><div class="panel-head"><h3>逐題檢討</h3><div class="seg"><label><input type="radio" name="rw" data-act="rw" value="1"' + (onlyWrong ? ' checked' : '') + '>只看錯題</label><label><input type="radio" name="rw" data-act="rw" value="0"' + (!onlyWrong ? ' checked' : '') + '>全部</label></div></div>' +
      (list.length ? list.map((it) => reviewItem(s, it)).join('') : '<p class="small muted">這次沒有錯題。</p>') + '</section>';
    return h;
  }
  function reviewItem(s, it) {
    const q = Q[it.q];
    if (!q) return '';
    const n = s.items.indexOf(it) + 1;
    let body = figHtml(q) + '<div class="stem">' + fmt(q.Q) + '</div>';
    if (q.kind === 'choice') {
      const a = s.ans ? s.ans[q.id] : undefined;
      body += '<div class="opts">' + q.opts.map((o, i) => '<div class="opt' + (i === q.answer ? ' is-right' : i === a ? ' is-wrong' : '') + '"><span class="L">' + (i === q.answer ? '✓' : i === a ? '✕' : '·') + '</span><span>' + fmt(o) + '</span></div>').join('') + '</div>';
      if (a == null) body += '<p class="small muted">（沒有作答）</p>';
    } else {
      const a = (s.ans && s.ans[q.id]) || [];
      const m = (s.marks && s.marks[q.id]) || [];
      body += q.subs.map((sub, si) => {
        const off = kOffset(q, si);
        return '<div class="sub">' + (sub.t ? '<div class="sub-t">' + fmt(sub.t) + '</div>' : '') + (a[si] ? '<div class="note">' + fmt(a[si]) + '</div>' : '') +
          '<div class="kps">' + sub.k.map((k, ki) => '<div class="kp"><span>' + (m[off + ki] ? '✓' : '○') + '</span><span>' + fmt(k) + '</span></div>').join('') + '</div></div>';
      }).join('');
    }
    body += explainHtml(q) + noteTools(q);
    return '<details class="qcard" style="margin-top:.6rem"><summary><span class="qnum">' + n + '.</span> ' + (it.s >= WRONG_BELOW ? '<span class="pill pill-good">' + pct(it.s) + '</span>' : '<span class="pill pill-bad">' + pct(it.s) + '</span>') + ' <span class="small">' + DOMS[q.dom].n + '</span> <span class="small muted">' + esc(q.Q.slice(0, 80)) + (q.Q.length > 80 ? '…' : '') + '</span></summary><div class="stack" style="margin-top:.8rem">' + body + '</div></details>';
  }

  // ───────────────────────── 主題練習 ─────────────────────────
  function practiceDefaults() {
    return { parts: ['mcq'], doms: [], sp: 'all', diff: [], era: 'all', pool: 'all', count: 20, timed: false };
  }
  function practicePool(c) {
    return B.questions.filter((q) => {
      if (c.parts.length && !c.parts.includes(q.part)) return false;
      if (c.doms.length && !c.doms.includes(q.dom)) return false;
      if (c.sp !== 'all' && !(q.sp === c.sp || (c.sp === 'dog' && q.sp === 'dogcat') || (c.sp === 'cat' && q.sp === 'dogcat'))) return false;
      if (c.diff.length && !c.diff.includes(String(q.diff))) return false;
      if (c.era === '2016' && !(q.yr >= 2016)) return false;
      if (c.era === '2021' && !(q.yr >= 2021)) return false;
      if (c.pool === 'unseen' && S.hist[q.id]) return false;
      if (c.pool === 'wrong' && !(S.srs[q.id] && S.srs[q.id].box < 5)) return false;
      if (c.pool === 'flagged' && !S.flags[q.id]) return false;
      if (c.pool === 'custom' && !q.custom) return false;
      if (c.tag && !q.tags.includes(c.tag)) return false;
      return true;
    });
  }
  function renderPractice() {
    const c = ui.practice || (ui.practice = practiceDefaults());
    const pool = practicePool(c);
    const box = (name, val, label, on) => '<label><input type="checkbox" data-pf="' + name + '" value="' + val + '"' + (on ? ' checked' : '') + '>' + label + '</label>';
    const radio = (name, val, label) => '<label><input type="radio" name="pf-' + name + '" data-pf="' + name + '" value="' + val + '"' + (String(c[name]) === String(val) ? ' checked' : '') + '>' + label + '</label>';
    let h = '<div class="view-head"><p class="eyebrow">Targeted practice</p><h2>主題練習</h2><p>每題作答後立刻對答案、看解析。選項順序預設隨機（設定可關），避免記位置。</p></div>';
    h += '<section class="panel"><div class="form-grid">' +
      '<div class="fieldset"><span class="field-label">部分</span><div class="seg">' + PART_ORDER.map((p) => box('parts', p, PARTS[p].name, c.parts.includes(p))).join('') + '</div></div>' +
      '<div class="fieldset"><span class="field-label">物種</span><div class="seg">' + [['all', '全部'], ['dog', '犬'], ['cat', '貓'], ['horse', '馬'], ['farm', '經濟動物'], ['exotic', '異寵'], ['general', '通用']].map(([v, n]) => radio('sp', v, n)).join('') + '</div></div>' +
      '<div class="fieldset" style="grid-column:1/-1"><span class="field-label">領域（不選＝全部；括號是 Blueprint 權重）</span><div class="seg">' + Object.keys(DOMS).map((d) => box('doms', d, DOMS[d].n + ' <span class="muted">' + DOMS[d].w + '%</span>', c.doms.includes(d))).join('') + '</div></div>' +
      '<div class="fieldset"><span class="field-label">難度</span><div class="seg">' + [1, 2, 3].map((d) => box('diff', d, DIFF[d], c.diff.includes(String(d)))).join('') + '</div></div>' +
      '<div class="fieldset"><span class="field-label">文獻年代</span><div class="seg">' + [['all', '全部'], ['2016', '2016 年後'], ['2021', '2021 年後']].map(([v, n]) => radio('era', v, n)).join('') + '</div></div>' +
      '<div class="fieldset"><span class="field-label">題目來源</span><div class="seg">' + [['all', '全部'], ['unseen', '沒做過的'], ['wrong', '錯題本'], ['flagged', '已標記'], ['custom', '自訂題目']].map(([v, n]) => radio('pool', v, n)).join('') + '</div></div>' +
      '<div class="fieldset"><span class="field-label">題數</span><div class="seg">' + [10, 20, 30, 50, 100].map((v) => radio('count', v, String(v))).join('') + '</div></div>' +
      '<div class="fieldset"><span class="field-label">計時</span><div class="seg">' + radio('timed', false, '不計時') + radio('timed', true, '依考場節奏') + '</div></div>' +
      '</div>' + (c.tag ? '<div class="row"><span class="pill pill-info">標籤：' + esc(c.tag) + '</span><button class="btn btn-sm btn-ghost" data-act="clear-tag">清除標籤</button></div>' : '') +
      '<div class="row"><button class="btn btn-primary" data-act="start-practice"' + (pool.length ? '' : ' disabled') + '>開始練習（' + Math.min(c.count, pool.length) + ' 題）</button><span class="small muted">符合條件 ' + pool.length + ' 題</span><button class="btn btn-sm btn-ghost" data-act="reset-practice">重設條件</button></div></section>';
    h += '<section class="panel"><div class="panel-head"><h3>搜尋題目</h3><span class="small muted">搜題幹、選項、解析與標籤</span></div>' +
      '<input class="input" id="search" type="search" placeholder="例如 desmocollin、lokivetmab、Sporothrix、flame follicle" value="' + esc(ui.search) + '">' + '<div id="search-results">' + searchResults() + '</div></section>';
    return h;
  }
  function searchResults() {
    const term = ui.search.trim().toLowerCase();
    if (term.length < 2) return '';
    const hits = B.questions.filter((q) => [q.Q, q.X, (q.opts || []).join(' '), q.tags.join(' '), q.subs ? q.subs.map((s) => s.t + ' ' + s.k.join(' ')).join(' ') : ''].join(' ').toLowerCase().includes(term));
    if (!hits.length) return '<p class="small muted" style="margin-top:.6rem">找不到「' + esc(ui.search) + '」。</p>';
    return '<div class="row" style="margin:.7rem 0"><span class="small">' + hits.length + ' 題</span><button class="btn btn-sm" data-act="practice-search">練習這些題目</button></div><div class="wl">' +
      hits.slice(0, 40).map((q) => wrongItem(q.id)).join('') + '</div>';
  }

  // ───────────────────────── 錯題本 ─────────────────────────
  function wrongItem(id) {
    const q = Q[id], r = S.srs[id];
    const boxes = r ? '<span class="boxes" title="熟練度 ' + r.box + '/5">' + [1, 2, 3, 4, 5].map((i) => '<i class="' + (r.box >= i ? 'on' : '') + '"></i>').join('') + '</span>' : '';
    return '<button class="wi" data-act="single" data-id="' + esc(id) + '"><div><div class="chips"><span class="chip">' + PARTS[q.part].name + '</span><span class="chip">' + DOMS[q.dom].n + '</span>' + (S.flags[id] ? '<span class="chip">★</span>' : '') + (S.notes[id] && S.notes[id].v ? '<span class="chip">有筆記</span>' : '') + '</div><div class="s">' + esc(q.Q.slice(0, 160)) + '</div></div>' +
      '<div class="small" style="text-align:right">' + (r ? boxes + '<div class="muted">錯 ' + r.wrong + ' 次' + (r.box < 5 ? '・' + (r.due <= Date.now() ? '今天到期' : fmtDate(r.due) + ' 到期') : '・已熟練') + '</div>' : '') + '</div></button>';
  }
  function renderWrong() {
    const lists = { due: wrongDue(), all: wrongActive(), mastered: mastered(), flagged: flagged() };
    const names = { due: '今天到期', all: '全部錯題', mastered: '已熟練', flagged: '已標記' };
    const tab = ui.wtab;
    const ids = lists[tab].slice().sort((a, b) => (S.srs[b] ? S.srs[b].wrong : 0) - (S.srs[a] ? S.srs[a].wrong : 0));
    let h = '<div class="view-head"><p class="eyebrow">Spaced repetition</p><h2>錯題本</h2><p>得分低於 60% 的題目會自動進來。之後每答對一次就往上升一格，複習間隔依序 1、3、7、14、30 天；升到第 5 格算熟練。再答錯就回到第 0 格。</p></div>';
    h += '<section class="panel"><div class="seg">' + Object.keys(names).map((k) => '<label><input type="radio" name="wtab" data-act="wtab" value="' + k + '"' + (tab === k ? ' checked' : '') + '>' + names[k] + ' <span class="badge">' + lists[k].length + '</span></label>').join('') + '</div>' +
      '<div class="row">' + (ids.length ? '<button class="btn btn-primary" data-act="review" data-tab="' + tab + '">複習這 ' + Math.min(ids.length, 50) + ' 題</button>' : '') + '</div>';
    if (!ids.length) h += '<div class="empty">' + (tab === 'due' ? '今天沒有到期的錯題。' : tab === 'flagged' ? '還沒有標記任何題目。作答時按「☆ 標記這題」或鍵盤 F。' : tab === 'mastered' ? '還沒有熟練的錯題。' : '錯題本是空的，先去做一份模擬考。') + '</div>';
    else {
      const byDom = {};
      ids.forEach((id) => (byDom[Q[id].dom] = byDom[Q[id].dom] || []).push(id));
      h += Object.keys(DOMS).filter((d) => byDom[d]).map((d) => '<details open><summary>' + DOMS[d].n + ' <span class="badge">' + byDom[d].length + '</span></summary><div class="wl" style="margin-top:.5rem">' + byDom[d].map(wrongItem).join('') + '</div></details>').join('');
    }
    h += '</section>';
    return h;
  }

  // ───────────────────────── 成績紀錄 ─────────────────────────
  function trendChart(part) {
    const list = S.sessions.filter((s) => isFullMock(s) && s.part === part).slice(0, 12).reverse();
    const P = PARTS[part];
    if (!list.length) return '<div class="trend"><div class="small"><b>' + P.name + '</b></div><div class="small muted" style="padding:1.2rem 0">還沒有這部分的全真模擬</div></div>';
    const W = 260, H = 120, L = 28, R = 34, T = 10, Bm = 18;
    const x = (i) => L + (list.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (list.length - 1));
    const y = (v) => T + (1 - v) * (H - T - Bm);
    const pts = list.map((s, i) => [x(i), y(s.pct)]);
    const last = list[list.length - 1];
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + P.name + '模擬成績走勢">';
    [0, 0.5, 1].forEach((v) => { svg += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 4) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + v * 100 + '</text>'; });
    svg += '<line class="ref" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0.65) + '" y2="' + y(0.65) + '"/><text x="' + (W - R + 3) + '" y="' + (y(0.65) + 3) + '">65</text>';
    if (pts.length > 1) {
      svg += '<path class="area" d="M' + pts[0][0] + ',' + y(0) + ' L' + pts.map((p) => p.join(',')).join(' L') + ' L' + pts[pts.length - 1][0] + ',' + y(0) + ' Z"/>';
      svg += '<polyline class="line" points="' + pts.map((p) => p.join(',')).join(' ') + '"/>';
    }
    pts.forEach((p, i) => {
      const s = list[i];
      svg += '<circle class="dot" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === pts.length - 1 ? 4.5 : 3) + '"/>';
      svg += '<circle class="hit" cx="' + p[0] + '" cy="' + p[1] + '" r="11" data-tip="' + esc(fmtDate(s.date) + '\n' + s.title + '\n' + pct(s.pct, 1)) + '" data-act="open-result" data-id="' + s.id + '"/>';
    });
    svg += '<text class="end" x="' + (pts[pts.length - 1][0]) + '" y="' + (pts[pts.length - 1][1] - 9) + '" text-anchor="middle">' + (Math.floor(last.pct * 1000) / 10) + '</text>';
    svg += '</svg>';
    return '<div class="trend"><div class="row" style="justify-content:space-between"><span class="small"><b>' + P.name + '</b></span>' + statusPill(last.pct) + '</div>' + svg + '<div class="small muted">最近 ' + list.length + ' 次・虛線 65% 為保留門檻</div></div>';
  }
  function renderHistory() {
    let h = '<div class="view-head"><p class="eyebrow">Score history</p><h2>成績紀錄</h2></div>';
    h += renderVerdict();
    h += '<section class="panel"><h3>全真模擬走勢</h3><div class="trends">' + PART_ORDER.map(trendChart).join('') + '</div></section>';
    h += '<section class="panel"><div class="panel-head"><h3>全部作答紀錄</h3><span class="small muted">' + S.sessions.length + ' 次</span></div>' + (S.sessions.length ? sessionTable(S.sessions) : '<div class="empty">還沒有紀錄。</div>') + '</section>';
    return h;
  }

  // ───────────────────────── 弱項分析 ─────────────────────────
  function bars(rows, opts) {
    opts = opts || {};
    const ticks = [0, 50, 65, 100];
    return '<div class="bars">' + rows.map((r) => {
      const st = statusOf(r.acc);
      return '<div class="bar-row"><div class="bar-label">' + r.label + (r.sub ? '<small>' + r.sub + '</small>' : '') + '</div>' +
        '<div class="bar-track" data-tip="' + esc(r.tip || '') + '"><div class="bar-fill ' + st + '" style="width:' + (r.acc == null ? 0 : Math.max(1.5, r.acc * 100)) + '%"></div><span class="bar-ref" style="left:50%"></span><span class="bar-ref" style="left:65%"></span></div>' +
        '<div class="bar-val">' + (r.acc == null ? '<span class="muted">未作答</span>' : pct(r.acc)) + '</div></div>';
    }).join('') + '<div class="bar-axis"><span></span><div class="ticks">' + ticks.map((t) => '<span style="left:' + t + '%">' + t + '</span>').join('') + '</div><span></span></div></div>';
  }
  function renderAnalysis() {
    const pri = priorities();
    const L = latest();
    const done = Object.keys(L).length;
    let h = '<div class="view-head"><p class="eyebrow">Weakness analysis</p><h2>弱項分析</h2><p>每題以「最近一次作答」計分。排序依「Blueprint 權重 × 失分率」：權重大又常錯的領域排最前面；作答少於 5 題的領域會往中間值靠，避免一兩題就下結論。</p></div>';
    if (!done) h += '<div class="empty">還沒有作答資料。先做一份模擬考或練 20 題，這裡就會出現分析。<button class="btn btn-primary btn-sm" data-go="mock">去模擬考</button></div>';
    const top = pri.filter((p) => p.n > 0).slice(0, 3);
    if (top.length) {
      h += '<section class="panel"><h3>建議複習順序</h3><div class="grid-2">' + top.map((p, i) => {
        const R = READ[p.d] || { books: [], vault: [] };
        return '<div class="stack" style="gap:.5rem"><div><span class="pill pill-info">第 ' + (i + 1) + ' 優先</span> <b>' + DOMS[p.d].n + '</b> <span class="small muted">' + pct(p.acc) + '・已做 ' + p.n + '/' + p.total + ' 題</span></div>' +
          '<div class="small"><b>教科書：</b>' + R.books.map(esc).join('；') + '</div>' +
          '<div class="small"><b>Vault 筆記：</b>' + R.vault.map((v) => '<span class="mono">[[' + esc(v) + ']]</span>').join(' ') + '</div>' +
          '<div class="row"><button class="btn btn-sm btn-primary" data-act="drill" data-dom="' + p.d + '">練這個領域 20 題</button>' + (wrongActive().some((id) => Q[id].dom === p.d) ? '<button class="btn btn-sm" data-act="drill-wrong" data-dom="' + p.d + '">只練錯題</button>' : '') + '</div></div>';
      }).join('') + '</div></section>';
    }
    h += '<section class="panel"><div class="panel-head"><h3>各領域正確率</h3><span class="legend"><span><i style="background:var(--good)"></i>≥65% 可保留</span><span><i style="background:var(--warn)"></i>50–65%</span><span><i style="background:var(--bad)"></i>&lt;50%</span><span>虛線＝50% 與 65%</span></span></div>' +
      bars(pri.map((p) => ({ label: DOMS[p.d].n, sub: 'Blueprint ' + DOMS[p.d].w + '%・' + p.n + '/' + p.total + ' 題', acc: p.acc, tip: DOMS[p.d].en + '\n正確率 ' + pct(p.acc, 1) + '\n已做 ' + p.n + ' / ' + p.total + ' 題\n優先指數 ' + p.pr.toFixed(1) }))) + '</section>';
    const gp = groupAcc((q) => q.part), gs = groupAcc((q) => (q.sp === 'dogcat' ? 'dog' : q.sp)), gd = groupAcc((q) => q.diff), ge = groupAcc((q) => (ERAS.find((e) => e.test(q.yr)) || {}).k);
    const cnt = (fn, k) => B.questions.filter((q) => fn(q) === k).length;
    h += '<div class="grid-2"><section class="panel"><h3>各部分</h3>' + bars(PART_ORDER.map((p) => ({ label: PARTS[p].name, sub: (gp[p] ? gp[p].n : 0) + '/' + byPart(p).length + ' 題', acc: gp[p] ? gp[p].acc : null, tip: PARTS[p].name + ' ' + pct(gp[p] && gp[p].acc, 1) }))) + '</section>' +
      '<section class="panel"><h3>文獻年代</h3>' + bars(ERAS.map((e) => ({ label: e.n, sub: (ge[e.k] ? ge[e.k].n : 0) + '/' + cnt((q) => (ERAS.find((x) => x.test(q.yr)) || {}).k, e.k) + ' 題', acc: ge[e.k] ? ge[e.k].acc : null, tip: e.n + ' ' + pct(ge[e.k] && ge[e.k].acc, 1) }))) + '<p class="small muted">新文獻題偏低＝期刊讀得不夠（Siak：只讀教科書不夠）。</p></section>' +
      '<section class="panel"><h3>物種</h3>' + bars(['dog', 'cat', 'horse', 'farm', 'exotic', 'general'].filter((k) => B.questions.some((q) => (q.sp === 'dogcat' ? 'dog' : q.sp) === k)).map((k) => ({ label: SPN[k], sub: (gs[k] ? gs[k].n : 0) + ' 題已做', acc: gs[k] ? gs[k].acc : null, tip: SPN[k] + ' ' + pct(gs[k] && gs[k].acc, 1) }))) + '</section>' +
      '<section class="panel"><h3>難度</h3>' + bars([1, 2, 3].map((k) => ({ label: DIFF[k], sub: (gd[k] ? gd[k].n : 0) + ' 題已做', acc: gd[k] ? gd[k].acc : null, tip: '難度' + DIFF[k] + ' ' + pct(gd[k] && gd[k].acc, 1) }))) + '<p class="small muted">Blueprint 預期：易題約 75%、中題約 50%、難題約 25% 的考生答對。</p></section></div>';
    // 弱點標籤
    const tg = {};
    for (const id in L) Q[id].tags.forEach((t) => { (tg[t] = tg[t] || { s: 0, n: 0 }); tg[t].s += L[id]; tg[t].n++; });
    const weakTags = Object.keys(tg).filter((t) => tg[t].n >= 2).map((t) => ({ t, acc: tg[t].s / tg[t].n, n: tg[t].n })).filter((x) => x.acc < CARRY).sort((a, b) => a.acc - b.acc || b.n - a.n).slice(0, 18);
    h += '<section class="panel"><div class="panel-head"><h3>常錯的主題標籤</h3><span class="small muted">至少做過 2 題、正確率低於 65%</span></div>' +
      (weakTags.length ? '<div class="chips">' + weakTags.map((x) => '<button class="btn btn-sm" data-act="drill-tag" data-tag="' + esc(x.t) + '" data-tip="' + esc(x.n + ' 題，正確率 ' + pct(x.acc)) + '">' + esc(x.t) + ' <span class="mono ' + (x.acc < PASS_PART ? '' : '') + '">' + pct(x.acc) + '</span></button>').join('') + '</div>' : '<p class="small muted">目前沒有明顯偏低的主題。</p>') + '</section>';
    const repeat = Object.keys(S.srs).filter((id) => Q[id] && S.srs[id].wrong >= 2).sort((a, b) => S.srs[b].wrong - S.srs[a].wrong).slice(0, 15);
    if (repeat.length) h += '<section class="panel"><h3>重複答錯的題目</h3><div class="wl">' + repeat.map(wrongItem).join('') + '</div></section>';
    return h;
  }

  // ───────────────────────── 設定 ─────────────────────────
  function renderSettings() {
    const st = S.settings;
    const counts = PART_ORDER.map((p) => PARTS[p].name + ' ' + byPart(p).filter((q) => !q.custom).length).join('・');
    let h = '<div class="view-head"><p class="eyebrow">Settings</p><h2>設定與備份</h2></div>';
    h += '<section class="panel"><h3>顯示與考試日期</h3><div class="form-grid">' +
      '<div class="fieldset"><label class="field-label" for="set-date">考試日期（AiCVD 通常 7–8 月；2027 年 credentials 死線 2027-01-31）</label><input class="input" id="set-date" type="date" value="' + esc(st.examDate) + '"></div>' +
      '<div class="fieldset"><span class="field-label">外觀</span><div class="seg">' + [['system', '跟隨系統'], ['light', '亮色'], ['dark', '暗色']].map(([v, n]) => '<label><input type="radio" name="set-theme" data-set="theme" value="' + v + '"' + (st.theme === v ? ' checked' : '') + '>' + n + '</label>').join('') + '</div></div>' +
      '<div class="fieldset"><span class="field-label">字級</span><div class="seg">' + [['normal', '標準'], ['large', '放大']].map(([v, n]) => '<label><input type="radio" name="set-size" data-set="size" value="' + v + '"' + (st.size === v ? ' checked' : '') + '>' + n + '</label>').join('') + '</div></div>' +
      '<div class="fieldset"><span class="field-label">練習時選項順序</span><div class="seg"><label><input type="radio" name="set-shuffle" data-set="shuffle" value="1"' + (st.shuffle ? ' checked' : '') + '>隨機</label><label><input type="radio" name="set-shuffle" data-set="shuffle" value="0"' + (!st.shuffle ? ' checked' : '') + '>固定</label></div><span class="small muted">全真模擬一律固定順序。</span></div>' +
      '</div></section>';
    h += '<section class="panel"><h3>備份與換裝置</h3><p class="small">成績、錯題、筆記都只存在這台裝置。換手機／電腦時：這裡匯出 → 另一台匯入（會合併兩邊紀錄，不會互相覆蓋）。</p>' +
      '<div class="row"><button class="btn btn-primary btn-sm" data-act="export">下載備份檔</button><button class="btn btn-sm" data-act="export-copy">複製備份文字</button>' +
      '<label class="btn btn-sm">匯入備份檔<input type="file" accept="application/json,.json" data-act="import-file" hidden></label></div>' +
      '<details><summary class="small">貼上備份文字匯入</summary><textarea class="input" id="import-text" placeholder="貼上備份 JSON"></textarea><div class="row" style="margin-top:.5rem"><button class="btn btn-sm" data-act="import-text">合併匯入</button></div></details>' +
      '<div class="row"><button class="btn btn-danger btn-sm" data-act="reset">清除所有作答紀錄</button></div>' +
      (ui.confirm === 'reset' ? '<div class="confirm">會刪除這台裝置上所有成績、錯題本、筆記與標記（題庫不受影響）。建議先下載備份。<div class="row"><button class="btn btn-danger btn-sm" data-act="reset-yes">全部清除</button><button class="btn btn-sm" data-act="cancel">取消</button></div></div>' : '') + '</section>';
    h += '<section class="panel"><h3>加入自己的題目</h3><p class="small">' + esc(TEXT.customIntro || '') + '目前 ' + customCount + ' 題。</p>' +
      '<details><summary class="small">格式說明與範例</summary><pre class="note mono" style="white-space:pre-wrap;overflow-x:auto">=== U-001 | part=mcq | dom=IMM | sp=dog | g=1 | diff=2 | yr=2021\ntags: pemphigus\nQ: The major autoantigen in canine pemphigus foliaceus is:\nA) Desmoglein 3\nB) Desmocollin-1 *\nC) BP180\nD) Envoplakin\nX: 中文解析…\nR: Bizikova P et al. Vet Immunol Immunopathol 2012\n\n=== U-002 | part=essay | dom=SF | sp=general\nQ: Describe the hair cycle.\nS: (a) Name the phases.\nK: anagen\nK: catagen\nK: telogen\n\npart：mcq / essay / image / histo\ndom：' + Object.keys(DOMS).join(' / ') + '\nsp：general / dog / cat / dogcat / horse / farm / exotic / human</pre></details>' +
      '<textarea class="input" id="custom-text" placeholder="貼上題目文字"></textarea><div class="row"><button class="btn btn-primary btn-sm" data-act="custom-add">解析並加入</button>' + (customCount ? '<button class="btn btn-sm btn-danger" data-act="custom-clear">刪除全部自訂題目</button>' : '') + '</div><div id="custom-msg" class="small"></div></section>';
    h += '<section class="panel"><h3>這台裝置</h3><div class="row"><button class="btn btn-sm" data-act="forget">忘記這台裝置的解密金鑰</button><span class="small muted">之後開啟需要重新輸入密碼</span></div></section>';
    h += '<section class="panel"><h3>關於題庫</h3><p class="small">內建 ' + B.questions.filter((q) => !q.custom).length + ' 題（' + counts + '）・題庫建置於 ' + fmtDateTime(B.builtAt) + '</p>' +
      '<p class="small">' + esc(TEXT.about || '') + '</p></section>';
    return h;
  }

  function exportData() { return JSON.stringify({ app: 'aicvd-mock', exported: new Date().toISOString(), data: S }); }
  function mergeData(inc) {
    if (!inc || typeof inc !== 'object') throw new Error('格式不對');
    const d = inc.data || inc;
    for (const id in d.hist || {}) {
      const mine = S.hist[id] || [];
      const seen = new Set(mine.map((x) => x.t));
      S.hist[id] = mine.concat(d.hist[id].filter((x) => !seen.has(x.t))).sort((a, b) => a.t - b.t).slice(-12);
    }
    for (const id in d.srs || {}) if (!S.srs[id] || (d.srs[id].last || 0) > (S.srs[id].last || 0)) S.srs[id] = d.srs[id];
    for (const id in d.notes || {}) { const n = d.notes[id]; if (n && (!S.notes[id] || (n.t || 0) > (S.notes[id].t || 0))) S.notes[id] = n; }
    for (const id in d.flags || {}) if (d.flags[id]) S.flags[id] = true;
    const ids = new Set(S.sessions.map((s) => s.id));
    (d.sessions || []).forEach((s) => { if (!ids.has(s.id)) S.sessions.push(s); });
    S.sessions.sort((a, b) => b.date - a.date);
    save();
  }

  // ───────────────────────── 自己的圖片 ─────────────────────────
  function revokeUrls() { ui.urls.forEach((u) => URL.revokeObjectURL(u)); ui.urls = []; }
  async function fillImages() {
    const slots = document.querySelectorAll('[data-myimgs]');
    for (const el of slots) {
      const id = el.getAttribute('data-myimgs');
      const list = (await idbGet('images', id)) || [];
      el.innerHTML = list.map((it, i) => {
        const u = URL.createObjectURL(it.blob); ui.urls.push(u);
        return '<figure><img src="' + u + '" alt="我附的圖：' + esc(it.name || '') + '"><button class="btn btn-sm" data-act="delimg" data-q="' + esc(id) + '" data-i="' + i + '">移除</button></figure>';
      }).join('');
    }
  }

  // ───────────────────────── 事件 ─────────────────────────
  function startList(ids, title, mode) {
    ids = ids.filter((id) => Q[id]);
    begin(newSession({ mode: mode || 'practice', part: 'mixed', title, qids: ids }));
  }
  async function onClick(e) {
    const goEl = e.target.closest('[data-go]');
    if (goEl) { go(goEl.getAttribute('data-go')); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.getAttribute('data-act');
    const s = S.active;
    switch (act) {
      case 'lock': stopTick(); try { sessionStorage.setItem('aicvd-locked', '1'); } catch (err) { /* 無法記錄 */ } window.location.reload(); break;
      case 'resume': go('run'); break;
      case 'pause': stopTick(); go('home'); break;
      case 'abandon': ui.confirm = 'abandon'; render(); break;
      case 'abandon-yes': S.active = null; save(); go('home'); break;
      case 'cancel': ui.confirm = null; render(); break;
      case 'mock-paper': startMock(el.dataset.part, el.dataset.paper); break;
      case 'mock-random': startMock(el.dataset.part, null); break;
      case 'choose': {
        const q = Q[s.qids[s.idx]];
        const oi = Number(el.dataset.oi);
        if (s.mode !== 'mock' && s.ans[q.id] != null) break;
        s.ans[q.id] = oi; save(); render();
        break;
      }
      case 'reveal': { const q = Q[s.qids[s.idx]]; s.shown[q.id] = true; s.marks[q.id] = s.marks[q.id] || []; save(); render(); break; }
      case 'prev': if (s.idx > 0) { s.idx--; save(); render(); window.scrollTo(0, 0); } break;
      case 'next': if (s.idx < s.qids.length - 1) { s.idx++; save(); render(); window.scrollTo(0, 0); } break;
      case 'jump': s.idx = Number(el.dataset.i); save(); render(); window.scrollTo(0, 0); break;
      case 'flag': {
        const id = ui.view === 'run' ? s.qids[s.idx] : el.closest('[data-gq]') ? el.closest('[data-gq]').dataset.gq : null;
        const target = id || (el.parentElement.querySelector('[data-q]') || {}).dataset.q;
        if (!target) break;
        if (S.flags[target]) delete S.flags[target]; else S.flags[target] = true;
        save(); render();
        break;
      }
      case 'submit': submit(false); break;
      case 'submit-yes': submit(true); break;
      case 'finish-grade': finalize(S.active); break;
      case 'open-result': ui.resultId = el.dataset.id; ui.onlyWrong = true; go('result'); break;
      case 'redo-wrong': { const ss = S.sessions.find((x) => x.id === el.dataset.id); startList(ss.items.filter((it) => it.s < WRONG_BELOW).map((it) => it.q), '重練：' + ss.title, 'review'); break; }
      case 'drill': ui.practice = Object.assign(practiceDefaults(), { parts: [], doms: [el.dataset.dom] }); drill(DOMS[el.dataset.dom].n); break;
      case 'drill-wrong': startList(wrongActive().filter((id) => Q[id].dom === el.dataset.dom), '錯題：' + DOMS[el.dataset.dom].n, 'review'); break;
      case 'drill-tag': ui.practice = Object.assign(practiceDefaults(), { parts: [], tag: el.dataset.tag }); drill('標籤：' + el.dataset.tag); break;
      case 'clear-tag': delete ui.practice.tag; render(); break;
      case 'start-practice': {
        const c = ui.practice;
        const pool = shuffle(practicePool(c)).slice(0, c.count);
        const ss = newSession({ mode: 'practice', part: c.parts.length === 1 ? c.parts[0] : 'mixed', title: '練習：' + (c.doms.length ? c.doms.map((d) => DOMS[d].n).join('、') : c.parts.map((p) => PARTS[p].name).join('、') || '全部'), qids: pool.map((q) => q.id) });
        if (c.timed) ss.limit = Math.round(sum(pool.map((q) => q.min)) * 60);
        begin(ss);
        break;
      }
      case 'reset-practice': ui.practice = practiceDefaults(); render(); break;
      case 'practice-search': {
        const term = ui.search.trim().toLowerCase();
        const hits = B.questions.filter((q) => [q.Q, q.X, (q.opts || []).join(' '), q.tags.join(' ')].join(' ').toLowerCase().includes(term)).map((q) => q.id);
        startList(shuffle(hits).slice(0, 50), '搜尋：' + ui.search.trim());
        break;
      }
      case 'single': startList([el.dataset.id], '單題：' + el.dataset.id, S.srs[el.dataset.id] ? 'review' : 'practice'); break;
      case 'review': {
        const tab = el.dataset.tab;
        const ids = tab === 'due' ? wrongDue() : tab === 'all' ? wrongActive() : tab === 'mastered' ? mastered() : flagged();
        startList(shuffle(ids).slice(0, 50), '錯題複習（' + { due: '今天到期', all: '全部錯題', mastered: '已熟練', flagged: '已標記' }[tab] + '）', 'review');
        break;
      }
      case 'export': {
        const blob = new Blob([exportData()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'aicvd-mock-backup-' + fmtDate(Date.now()).replace(/\//g, '') + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('已下載備份檔');
        break;
      }
      case 'export-copy':
        try { await navigator.clipboard.writeText(exportData()); toast('已複製備份文字'); }
        catch (err) { const ta = $('#import-text'); ta.value = exportData(); ta.closest('details').open = true; ta.select(); toast('無法直接複製，已把備份文字放進下方欄位，請手動複製'); }
        break;
      case 'import-text':
        try { mergeData(JSON.parse($('#import-text').value)); toast('已合併匯入'); render(); }
        catch (err) { toast('匯入失敗：內容不是有效的備份'); }
        break;
      case 'reset': ui.confirm = 'reset'; render(); break;
      case 'reset-yes': { const keep = S.settings; S = defaults(); S.settings = keep; save(); ui.confirm = null; toast('已清除作答紀錄'); render(); break; }
      case 'forget': await idbDel('kv', 'key'); toast('已忘記金鑰，下次開啟需要密碼'); break;
      case 'custom-add': {
        const text = $('#custom-text').value.trim();
        if (!text) break;
        const r = QParser.parseBank(text, '貼上的題目');
        const clash = r.questions.filter((q) => Q[q.id] && !Q[q.id].custom).map((q) => q.id);
        const msgs = r.errors.concat(clash.map((id) => id + '：和內建題號重複，請改題號（建議用 U- 開頭）'));
        if (msgs.length || !r.questions.length) { $('#custom-msg').innerHTML = '<div class="confirm">' + (msgs.length ? msgs.map(esc).join('<br>') : '沒有解析到題目') + '</div>'; break; }
        const old = (await idbGet('kv', 'custom')) || '';
        await idbPut('kv', 'custom', old + '\n\n' + text);
        const errs = await attachCustom();
        toast('已加入 ' + r.questions.length + ' 題' + (errs.length ? '（有 ' + errs.length + ' 個格式問題）' : ''));
        render();
        break;
      }
      case 'custom-clear': await idbDel('kv', 'custom'); await attachCustom(); toast('已刪除自訂題目'); render(); break;
      case 'delimg': {
        const list = (await idbGet('images', el.dataset.q)) || [];
        list.splice(Number(el.dataset.i), 1);
        await idbPut('images', el.dataset.q, list);
        fillImages();
        break;
      }
    }
  }
  function drill(title) {
    const c = ui.practice;
    const pool = practicePool(c);
    const unseen = shuffle(pool.filter((q) => !S.hist[q.id]));
    const wrongs = shuffle(pool.filter((q) => S.srs[q.id] && S.srs[q.id].box < 5));
    const rest = shuffle(pool.filter((q) => S.hist[q.id] && !(S.srs[q.id] && S.srs[q.id].box < 5)));
    const ids = [...new Set(wrongs.concat(unseen, rest).map((q) => q.id))].slice(0, 20);
    begin(newSession({ mode: 'practice', part: 'mixed', title: '加強：' + title, qids: ids }));
  }

  function onInput(e) {
    const t = e.target;
    const s = S.active;
    if (t.matches('[data-ans]') && s) {
      const q = Q[s.qids[s.idx]];
      const a = s.ans[q.id] || (s.ans[q.id] = []);
      a[Number(t.dataset.ans)] = t.value;
      clearTimeout(onInput._t); onInput._t = setTimeout(save, 400);
      return;
    }
    if (t.matches('[data-note]')) {
      S.notes[t.dataset.note] = { t: Date.now(), v: t.value };
      clearTimeout(onInput._n); onInput._n = setTimeout(save, 400);
      return;
    }
    if (t.id === 'search') {
      ui.search = t.value;
      $('#search-results').innerHTML = searchResults();
    }
  }
  async function onChange(e) {
    const t = e.target;
    const s = S.active;
    if (t.matches('[data-mark]') && s) {
      const q = Q[s.qids[s.idx]];
      const m = s.marks[q.id] || (s.marks[q.id] = []);
      m[Number(t.dataset.mark)] = t.checked;
      save();
      const out = $('#kp-score'); if (out) out.textContent = m.filter(Boolean).length + ' / ' + q.max;
      return;
    }
    if (t.matches('[data-gmark]') && s) {
      const id = t.dataset.gmark;
      const m = s.marks[id] || (s.marks[id] = []);
      m[Number(t.dataset.k)] = t.checked;
      save();
      $('[data-gscore="' + id + '"]').textContent = m.filter(Boolean).length + ' / ' + Q[id].max;
      const ids = s.grading || [];
      $('#grade-total').textContent = sum(ids.map((x) => (s.marks[x] || []).filter(Boolean).length)) + ' / ' + sum(ids.map((x) => Q[x].max)) + ' 分';
      return;
    }
    if (t.matches('[data-pf]')) {
      const c = ui.practice, k = t.dataset.pf;
      if (t.type === 'checkbox') {
        const arr = c[k];
        const i = arr.indexOf(t.value);
        if (t.checked && i < 0) arr.push(t.value); else if (!t.checked && i >= 0) arr.splice(i, 1);
      } else c[k] = k === 'count' ? Number(t.value) : k === 'timed' ? t.value === 'true' : t.value;
      render();
      return;
    }
    if (t.matches('[data-act="wtab"]')) { ui.wtab = t.value; render(); return; }
    if (t.matches('[data-act="rw"]')) { ui.onlyWrong = t.value === '1'; render(); return; }
    if (t.matches('[data-set]')) {
      const k = t.dataset.set;
      S.settings[k] = k === 'shuffle' ? t.value === '1' : t.value;
      save(); applyTheme(); render();
      return;
    }
    if (t.id === 'set-date') { S.settings.examDate = t.value; save(); render(); return; }
    if (t.matches('[data-act="import-file"]') && t.files[0]) {
      try { mergeData(JSON.parse(await t.files[0].text())); toast('已合併匯入備份'); render(); }
      catch (err) { toast('匯入失敗：檔案不是有效的備份'); }
      return;
    }
    if (t.matches('[data-act="addimg"]') && t.files.length) {
      const id = t.dataset.q;
      const list = (await idbGet('images', id)) || [];
      for (const f of t.files) list.push({ name: f.name, blob: f });
      try { await idbPut('images', id, list); toast('已附上圖片（只存在這台裝置）'); }
      catch (err) { toast('無法儲存圖片'); }
      fillImages();
    }
  }
  function onKey(e) {
    if (ui.view !== 'run' || !S.active) return;
    if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    const s = S.active, q = Q[s.qids[s.idx]];
    const k = e.key.toUpperCase();
    if (q.kind === 'choice' && /^[A-H1-8]$/.test(k)) {
      const pos = /\d/.test(k) ? Number(k) - 1 : k.charCodeAt(0) - 65;
      const order = s.perm[q.id] || q.opts.map((_, i) => i);
      if (pos < order.length) { const btn = document.querySelector('[data-act="choose"][data-oi="' + order[pos] + '"]'); if (btn && !btn.disabled) btn.click(); }
    } else if (e.key === 'ArrowRight') { const b = $('[data-act="next"]'); if (b && !b.disabled) b.click(); }
    else if (e.key === 'ArrowLeft') { const b = $('[data-act="prev"]'); if (b && !b.disabled) b.click(); }
    else if (k === 'F') { const b = $('[data-act="flag"]'); if (b) b.click(); }
  }
  // 提示框（長條圖、走勢點）
  function onOver(e) {
    const el = e.target.closest('[data-tip]');
    const tip = $('#tip');
    if (!el || !el.getAttribute('data-tip')) { tip.hidden = true; return; }
    tip.textContent = el.getAttribute('data-tip');
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const x = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, (e.clientX || r.left + r.width / 2) + 12));
    const y = Math.max(8, r.top - tip.offsetHeight - 8);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }

  // ───────────────────────── 啟動 ─────────────────────────
  async function start(bank) {
    B = bank;
    const meta = bank.meta || {};
    for (const p in meta.parts || {}) Object.assign(PARTS[p], meta.parts[p]);
    READ = meta.read || {};
    TIPS = meta.tips || [];
    TEXT = meta.text || {};
    index();
    await attachCustom();
    $('#gate').hidden = true;
    $('#app').hidden = false;
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mouseover', onOver);
    document.addEventListener('focusin', onOver);
    document.addEventListener('visibilitychange', () => { ui.last = Date.now(); if (document.visibilityState === 'hidden') save(); });
    window.addEventListener('beforeunload', save);
    if (S.active && !S.active.qids.every((id) => Q[id])) S.active = null;
    const h = (location.hash || '').slice(1);
    go(NAV.some(([k]) => k === h) ? h : 'home');
  }

  async function boot() {
    applyTheme();
    const env = JSON.parse(document.getElementById('bank-data').textContent);
    const msg = $('#gate-msg');
    if (!window.crypto || !crypto.subtle || typeof DecompressionStream === 'undefined') {
      msg.textContent = '這個瀏覽器不支援解密（需要 HTTPS 與較新的 Chrome／Safari 16.4+／Firefox 113+）。';
      $('#gate-btn').disabled = true;
      return;
    }
    let locked = false;
    try { locked = sessionStorage.getItem('aicvd-locked') === '1'; } catch (e) { /* 預覽環境 */ }
    try {
      const key = locked ? null : await idbGet('kv', 'key');
      if (key) { const bank = await openBank(key, env); return start(bank); }
    } catch (e) { idbDel('kv', 'key').catch(() => {}); }
    $('#gate-pass').focus();
    $('#gate-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#gate-btn');
      btn.disabled = true; btn.textContent = '解密中…'; msg.textContent = '';
      try {
        const key = await deriveKey($('#gate-pass').value, env);
        const bank = await openBank(key, env);
        if ($('#gate-remember').checked) await idbPut('kv', 'key', key).catch(() => toast('這個瀏覽器無法記住金鑰'));
        $('#gate-pass').value = '';
        try { sessionStorage.removeItem('aicvd-locked'); } catch (err) { /* 預覽環境 */ }
        start(bank);
      } catch (err) {
        msg.textContent = '密碼不對，無法解開題庫。';
        btn.disabled = false; btn.textContent = '解鎖題庫';
      }
    });
  }
  boot();
})();
