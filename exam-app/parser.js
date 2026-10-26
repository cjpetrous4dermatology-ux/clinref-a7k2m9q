/* AiCVD 模擬考題庫：題目文字格式解析器（Node 與瀏覽器共用）
 *
 * 一題的格式：
 *   === M-IMM-001 | part=mcq | dom=IMM | sp=dog | g=1 | diff=2 | yr=2016 | paper=A | min=2
 *   tags: lokivetmab, IL-31
 *   FIG: svg-name                 （可省略；對應 figures 內的 SVG）
 *   IMG: 影像文字描述…            （可省略；沒有圖時用文字描述影像）
 *   Q: 題幹（可多行）
 *   A) 選項
 *   B) 正確選項 *                 （行尾加 * 表示正確答案）
 *   C) 選項
 *   D) 選項
 *   S: (a) 子題                   （申論／影像／病理：子題；配分＝底下 K 的條數）
 *   K: 評分要點                   （每一條 1 分，屬於前一個 S）
 *   X: 解析（可多行）
 *   R: 參考文獻（可多行，每行一筆）
 *
 * 以 # 開頭的行是註解。以 @ 開頭的行設定之後各題的預設欄位，例如：
 *   @ part=mcq | dom=IMM | paper=A
 */
(function (root) {
  'use strict';

  var PARTS = ['mcq', 'essay', 'image', 'histo'];
  var DOMAINS = ['SF', 'IMM', 'MIC', 'PAR', 'OTO', 'IMO', 'GEN', 'NEB', 'PHA', 'CLP', 'DPA', 'RES', 'CR'];
  var SPECIES = ['general', 'dog', 'cat', 'dogcat', 'horse', 'farm', 'exotic', 'human'];

  function readKV(bits, into) {
    bits.forEach(function (kv) {
      var m = kv.trim().match(/^(\w+)\s*=\s*(.*)$/);
      if (m) into[m[1]] = m[2].trim();
    });
    return into;
  }

  function parseHeader(line, file, lineNo, defs) {
    var body = line.replace(/^===\s*/, '');
    var bits = body.split('|').map(function (s) { return s.trim(); });
    var q = { id: bits.shift(), src: file + ':' + lineNo };
    readKV(Object.keys(defs).map(function (k) { return k + '=' + defs[k]; }), q);
    readKV(bits, q);
    q.g = q.g ? Number(q.g) : 1;
    q.diff = q.diff ? Number(q.diff) : 2;
    q.yr = q.yr && q.yr !== '-' ? Number(q.yr) : null;
    if (q.min) q.min = Number(q.min);
    return q;
  }

  function finish(q, errors) {
    if (!q) return null;
    ['Q', 'X'].forEach(function (k) { if (q[k] != null) q[k] = q[k].trim(); });
    var where = q.id + ' (' + q.src + ')';
    if (PARTS.indexOf(q.part) < 0) errors.push(where + ': part 不正確 "' + q.part + '"');
    if (DOMAINS.indexOf(q.dom) < 0) errors.push(where + ': dom 不正確 "' + q.dom + '"');
    if (q.sp && SPECIES.indexOf(q.sp) < 0) errors.push(where + ': sp 不正確 "' + q.sp + '"');
    if (!q.Q) errors.push(where + ': 缺少題幹 Q:');
    if (q.opts.length) {
      q.kind = 'choice';
      if (q.opts.length < 2) errors.push(where + ': 選項太少');
      var n = q.opts.filter(function (o) { return o.ok; }).length;
      if (n !== 1) errors.push(where + ': 必須剛好 1 個正確選項（目前 ' + n + '）');
      q.answer = q.opts.findIndex(function (o) { return o.ok; });
      q.opts = q.opts.map(function (o) { return o.t; });
      q.max = 1;
      delete q.subs;
    } else {
      q.kind = 'points';
      q.subs = q.subs.filter(function (s) { return s.t || s.k.length; });
      if (!q.subs.length) errors.push(where + ': 沒有選項也沒有評分要點 K:');
      var total = 0;
      q.subs.forEach(function (s) {
        if (!s.k.length) errors.push(where + ': 子題「' + s.t.slice(0, 30) + '」沒有評分要點');
        total += s.k.length;
      });
      q.max = total;
      delete q.opts;
    }
    q.R = q.R ? q.R.filter(Boolean) : [];
    if (!q.min) q.min = { mcq: 2, essay: 9, image: 6, histo: 7 }[q.part] || 5;
    // 沒寫 yr 時，從參考文獻抓最新的年份（教科書沒有年份就算經典）
    if (!q.yr && q.R.length) {
      var ys = (q.R.join(' ').match(/\b(19[5-9]\d|20[0-4]\d)\b/g) || []).map(Number);
      if (ys.length) q.yr = Math.max.apply(null, ys);
    }
    q.tags = q.tags ? q.tags.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
    delete q.src;
    return q;
  }

  function parseBank(text, file) {
    file = file || 'bank';
    var lines = text.replace(/\r\n?/g, '\n').split('\n');
    var out = [], errors = [], q = null, last = null, defs = {};
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^@/.test(line)) { readKV(line.replace(/^@\s*/, '').split('|'), defs); continue; }
      if (/^===/.test(line)) {
        var done = finish(q, errors);
        if (done) out.push(done);
        q = parseHeader(line, file, i + 1, defs);
        q.opts = []; q.subs = []; q.R = []; q.Q = null; q.X = null;
        last = null;
        continue;
      }
      if (!q) continue;
      if (/^#/.test(line)) continue;
      var m;
      if ((m = line.match(/^tags:\s*(.*)$/i))) { q.tags = m[1]; last = null; continue; }
      if ((m = line.match(/^FIG:\s*(.*)$/))) { q.fig = m[1].trim(); last = null; continue; }
      if ((m = line.match(/^IMG:\s*(.*)$/))) { q.img = (q.img ? q.img + '\n' : '') + m[1]; last = 'img'; continue; }
      if ((m = line.match(/^Q:\s*(.*)$/))) { q.Q = m[1]; last = 'Q'; continue; }
      if ((m = line.match(/^([A-H])\)\s*(.*)$/))) {
        var t = m[2], ok = /\s\*$/.test(t) || t === '*';
        q.opts.push({ t: t.replace(/\s*\*$/, ''), ok: ok });
        last = 'opt'; continue;
      }
      if ((m = line.match(/^S:\s*(.*)$/))) {
        q.subs.push({ t: m[1].replace(/\s*\[\d+\]\s*$/, ''), k: [] });
        last = 'S'; continue;
      }
      if ((m = line.match(/^K:\s*(.*)$/))) {
        if (!q.subs.length) q.subs.push({ t: '', k: [] });
        q.subs[q.subs.length - 1].k.push(m[1]);
        last = 'K'; continue;
      }
      if ((m = line.match(/^X:\s*(.*)$/))) { q.X = m[1]; last = 'X'; continue; }
      if ((m = line.match(/^R:\s*(.*)$/))) { q.R.push(m[1]); last = 'R'; continue; }
      if (line === '') {
        if (last === 'Q') q.Q += '\n';
        else if (last === 'X') q.X += '\n';
        continue;
      }
      // 續行
      if (last === 'Q') q.Q += (/\n$/.test(q.Q) ? '' : ' ') + line;
      else if (last === 'X') q.X += (/\n$/.test(q.X) ? '' : ' ') + line;
      else if (last === 'img') q.img += ' ' + line;
      else if (last === 'R') q.R.push(line);
      else if (last === 'opt') q.opts[q.opts.length - 1].t += ' ' + line;
      else if (last === 'S') q.subs[q.subs.length - 1].t += ' ' + line;
      else if (last === 'K') { var ks = q.subs[q.subs.length - 1].k; ks[ks.length - 1] += ' ' + line; }
      else errors.push(q.id + ': 無法辨識的行 ' + file + ':' + (i + 1) + ' → ' + line.slice(0, 60));
    }
    var fin = finish(q, errors);
    if (fin) out.push(fin);
    return { questions: out, errors: errors };
  }

  var api = { parseBank: parseBank, PARTS: PARTS, DOMAINS: DOMAINS, SPECIES: SPECIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QParser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
