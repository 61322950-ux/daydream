/* 白日梦 App —— 界面状态机 / 背景 / 声音 / 档案 / 分享 */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---------- 存储 ----------
  const J_KEY = 'daydream.journal.v1';
  const AI_KEY = 'daydream.ai.v1';
  const loadJ = () => { try { return JSON.parse(localStorage.getItem(J_KEY)) || []; } catch { return []; } };
  const saveJ = (j) => { try { localStorage.setItem(J_KEY, JSON.stringify(j.slice(0, 50))); } catch {} };
  const loadAI = () => { try { return JSON.parse(localStorage.getItem(AI_KEY)) || {}; } catch { return {}; } };
  const saveAI = (c) => { try { localStorage.setItem(AI_KEY, JSON.stringify(c)); } catch {} };

  let journal = loadJ();

  // ---------- 背景画布 ----------
  const bg = $('#bg');
  const bctx = bg.getContext('2d');
  let blobs = [], stars = [], W = 0, H = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function sizeBg() {
    W = bg.width = innerWidth * devicePixelRatio;
    H = bg.height = innerHeight * devicePixelRatio;
    bg.style.width = innerWidth + 'px'; bg.style.height = innerHeight + 'px';
  }

  function setPalette(palette) {
    document.documentElement.style.setProperty('--bg', palette.bg);
    if (palette.text) document.documentElement.style.setProperty('--text', palette.text);
    blobs = palette.blobs.map((c, i) => ({
      c, r: (0.35 + Math.random() * 0.3),
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00035, vy: (Math.random() - 0.5) * 0.00035,
      ph: i * 1.7,
    }));
    stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + 0.4, ph: Math.random() * 6.28 }));
  }

  let t0 = performance.now();
  function drawBg(now) {
    const t = (now - t0) / 1000;
    bctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#12102e';
    bctx.fillRect(0, 0, W, H);
    bctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      const x = (b.x + t * b.vx) % 1.2 - 0.1, y = (b.y + t * b.vy) % 1.2 - 0.1;
      const r = b.r * Math.max(W, H) * (1 + 0.08 * Math.sin(t * 0.3 + b.ph));
      const g = bctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r);
      g.addColorStop(0, hexA(b.c, 0.5)); g.addColorStop(1, hexA(b.c, 0));
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, W, H);
    }
    bctx.globalCompositeOperation = 'source-over';
    for (const s of stars) {
      bctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 0.8 + s.ph);
      bctx.fillStyle = '#ffffff';
      bctx.beginPath(); bctx.arc(s.x * W, s.y * H, s.s * devicePixelRatio, 0, 6.29); bctx.fill();
    }
    bctx.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(drawBg);
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---------- 声音 ----------
  const Snd = {
    ctx: null, master: null, on: false,
    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      // 铺底双振荡器
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
      lp.connect(this.master);
      [110, 164.8].forEach((f, i) => {
        const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = i ? 6 : -4;
        const g = this.ctx.createGain(); g.gain.value = 0.05;
        o.connect(g); g.connect(lp); o.start();
      });
      // 慢速 LFO 让低通呼吸
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.05;
      const lg = this.ctx.createGain(); lg.gain.value = 180;
      lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      // 风声（带通噪声）
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.6;
      const ng = this.ctx.createGain(); ng.gain.value = 0.025;
      noise.connect(bp); bp.connect(ng); ng.connect(this.master); noise.start();
    },
    toggle() {
      this.ensure();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.on = !this.on;
      this.master.gain.linearRampToValueAtTime(this.on ? 0.55 : 0, this.ctx.currentTime + 0.8);
      $('#sndBtn').classList.toggle('on', this.on);
      return this.on;
    },
    chime() {
      if (!this.ctx) return;
      [660, 990].forEach((f, i) => {
        const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.12 / (i + 1), this.ctx.currentTime + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.6);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(); o.stop(this.ctx.currentTime + 1.7);
      });
    },
  };

  // ---------- 状态 ----------
  const S = { dream: null, idx: 0, revealing: false, extrasLeft: 0, mode: 'home' };

  function applyPalette(mood) {
    const p = Engine.PALETTES[mood] || Engine.PALETTES['漂流'];
    setPalette(p);
  }

  // ---------- 文本呈现 ----------
  function showBeat(text, done) {
    const box = $('#beatText');
    box.innerHTML = '';
    const parts = text.split(/(?<=[。！？])/).filter(s => s.trim());
    parts.forEach((p, i) => {
      const span = document.createElement('span');
      span.className = 'line';
      span.textContent = p;
      span.style.transitionDelay = (i * 0.9) + 's';
      box.appendChild(span);
      requestAnimationFrame(() => requestAnimationFrame(() => span.classList.add('in')));
    });
    S.revealing = true;
    const total = parts.length * 900 + 600;
    setTimeout(() => { S.revealing = false; if (done) done(); }, reduced ? 50 : total);
  }
  function fastForward() {
    document.querySelectorAll('#beatText .line').forEach(el => { el.style.transitionDelay = '0s'; el.classList.add('in'); });
    S.revealing = false;
  }

  // ---------- 梦境流程 ----------
  async function startDream() {
    const seed = $('#seedInput').value.trim();
    const cfg = loadAI();
    let dream = null;
    $('#home').hidden = true;
    $('#dream').hidden = false;
    $('#badge').textContent = '入梦中…';
    if (cfg.on && cfg.key) {
      try { dream = await aiDream(cfg, seed); } catch (e) { toast('AI 没接上，这梦由本地引擎做'); }
    }
    if (!dream) dream = Engine.buildDream({ seed, journal });
    S.dream = dream; S.idx = -1; S.extrasLeft = 2;
    S.mode = 'dream';
    $('#badge').textContent = dream.ai ? 'AI 入梦 · ' + dream.mood : '本地引擎 · ' + dream.mood + '气压';
    applyPalette(dream.mood);
    advance();
  }

  function advance() {
    if (S.revealing) { fastForward(); return; }
    S.idx++;
    const beats = S.dream.beats;
    if (S.idx < beats.length) {
      const last = S.idx === beats.length - 1 && S.extrasLeft <= 0;
      $('#flowBtn').textContent = last ? '醒来' : '顺流';
      showBeat(beats[S.idx]);
    } else if (S.extrasLeft > 0) {
      S.extrasLeft--;
      $('#flowBtn').textContent = S.extrasLeft === 0 ? '醒来' : '顺流';
      showBeat(Engine.spareBeat(S.dream));
    } else {
      wake();
    }
  }

  function goLucid() {
    $('#lucidRow').hidden = false;
    $('#lucidInput').focus();
  }

  function submitLucid() {
    const v = $('#lucidInput').value.trim();
    if (!v) { $('#lucidInput').focus(); return; }
    $('#lucidRow').hidden = true;
    $('#lucidInput').value = '';
    if (S.revealing) fastForward();
    S.dream.beats.splice(S.idx + 1, 0, '你说：「' + v + '」——' + Engine.lucidBeat());
    document.body.classList.add('jolt');
    setTimeout(() => document.body.classList.remove('jolt'), 1600);
    S.extrasLeft = Math.max(S.extrasLeft, 1);
    advance();
  }

  function wake() {
    S.mode = 'wake';
    const d = S.dream;
    journal.unshift(d.record);
    saveJ(journal);
    $('#wakeSoundLine').textContent = d.wakeSound + '。你睁开眼。';
    $('#artifactText').textContent = '手心里多了一件东西——' + d.artifact;
    $('#wakeTitle').textContent = d.title;
    $('#wake').hidden = false;
    $('#dream').hidden = true;
    Snd.chime();
  }

  function again() {
    $('#wake').hidden = true;
    $('#home').hidden = false;
    S.mode = 'home';
    S.dream = null;
    renderHomeHint();
  }

  // ---------- AI 模式（可选增强） ----------
  const AI_PROMPT = `你是"白日梦引擎"，把用户放进一场梦里，不是讲一个梦。规则：
- 第二人称、现在时。
- 3～4拍，每拍100～200字，拍与拍之间直接切场景，不解释转场，梦从不解释自己。
- 每拍至多一件不可能的事，且所有人当它很平常；梦不为自己的物理道歉。
- 具象压倒抽象；允许一句话独占一段；通感至多一处。
- 禁止总结主题、上价值、"这就像人生"。
- 现实里的时间地点可以渗进梦里，但要用得轻。
只输出JSON，不要输出其他文字：{"title":"八字以内的梦名","mood":"温柔|漂流|荒诞|循环|清醒","beats":["第1拍","第2拍","第3拍"],"artifact":"一件具体、没用、舍不得扔的醒物（一句话）","hook":"一句没讲完的钩子"}`;

  async function aiDream(cfg, seed) {
    const seep = Engine.seepNow();
    const reality = `${seep.bucketText}${seep.h}点${seep.minText}分 星期${seep.week}`;
    const recent = journal.slice(0, 3).map(r => ({ title: r.title, imagery: r.imagery, hook: r.hook }));
    const user = JSON.stringify({ seed: seed || null, reality, recent });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      const res = await fetch((cfg.base || 'https://open.bigmodel.cn/api/paas/v4') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
        body: JSON.stringify({
          model: cfg.model || 'glm-4-flash',
          messages: [{ role: 'system', content: AI_PROMPT }, { role: 'user', content: user }],
          temperature: 0.95,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const txt = data.choices[0].message.content;
      const m = txt.match(/\{[\s\S]*\}/);
      const j = JSON.parse(m[0]);
      if (!Array.isArray(j.beats) || j.beats.length < 2) throw new Error('bad format');
      const mood = Engine.PALETTES[j.mood] ? j.mood : '漂流';
      return {
        title: j.title || '没起名的梦', mood,
        beats: j.beats, artifact: j.artifact || '一件想不起来名目的东西，但你知道是它。',
        wakeSound: pick(['手机在桌上震了一下', '远处的车声漫过来', '风扇转了一格']),
        ai: true,
        record: { ts: Date.now(), title: j.title || '没起名的梦', mood, seed: seed || null, scenes: [], imagery: j.hook ? [j.hook] : [], hook: j.hook || '' },
        _ctx: { seep, unusedAnchors: [], unusedImps: [] },
      };
    } finally { clearTimeout(timer); }
  }

  // ---------- 档案 ----------
  function renderJournal() {
    const list = $('#journalList');
    if (!journal.length) {
      list.innerHTML = '<p class="empty">档案是空的。第一场梦还没发生。</p>';
      return;
    }
    list.innerHTML = journal.map((r) => `
      <div class="j-item">
        <div class="j-title">${esc(r.title)}<span class="j-mood">${esc(r.mood)}</span></div>
        <div class="j-meta">${new Date(r.ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'short' })}${r.seed ? ' · 种子「' + esc(r.seed) + '」' : ''}</div>
        ${(r.imagery || []).filter(Boolean).map(i => `<span class="chip">${esc(i)}</span>`).join('')}
        ${r.hook ? `<div class="j-hook">钩子：${esc(r.hook)}</div>` : ''}
      </div>`).join('');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- 分享卡片 ----------
  function shareCard() {
    const d = S.dream;
    const p = Engine.PALETTES[d.mood] || Engine.PALETTES['漂流'];
    const cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 1440;
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 1080, 1440);
    g.addColorStop(0, p.bg); g.addColorStop(1, p.blobs[0]);
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1440);
    [[720, 380, 420, p.blobs[1]], [240, 980, 480, p.blobs[2]]].forEach(([x, y, r, col]) => {
      const rg = c.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, hexA(col, 0.55)); rg.addColorStop(1, hexA(col, 0));
      c.fillStyle = rg; c.fillRect(0, 0, 1080, 1440);
    });
    c.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(c, 90, 320, 900, 800, 36); c.fill();
    c.fillStyle = p.text || '#fff';
    c.textAlign = 'left';
    c.font = '600 84px "Songti SC","Noto Serif SC",serif';
    c.fillText(d.title, 140, 480);
    c.font = '40px "Songti SC","Noto Serif SC",serif';
    const body = firstSentences(d.beats[1] || d.beats[0], 90);
    wrapText(c, body, 140, 590, 800, 68);
    c.font = '44px "Songti SC","Noto Serif SC",serif';
    c.fillStyle = hexA(p.blobs[1] || '#c98a6b', 1);
    wrapText(c, '醒物：' + d.artifact, 140, 1010, 800, 64);
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.font = '32px sans-serif';
    const dt = new Date();
    c.fillText(`白日梦 · ${dt.getMonth() + 1}月${dt.getDate()}日 · 气压：${d.mood}`, 140, 1290);
    const a = document.createElement('a');
    a.download = `白日梦-${d.title}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
  }

  function firstSentences(s, max) {
    const parts = s.split(/(?<=[。！？])/);
    let out = '';
    for (const p of parts) { if ((out + p).length > max) break; out += p; }
    return out || s.slice(0, max);
  }
  function wrapText(c, text, x, y, w, lh) {
    let line = '', yy = y;
    for (const ch of text) {
      if (c.measureText(line + ch).width > w) { c.fillText(line, x, yy); line = ch; yy += lh; }
      else line += ch;
    }
    if (line) c.fillText(line, x, yy);
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // ---------- 杂项 ----------
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2600);
  }

  function renderHomeHint() {
    const seep = Engine.seepNow();
    const mood = Engine.moodFor(seep, null, journal);
    const hint = `现在是星期${seep.week}${seep.bucketText}${seep.h}点${seep.minText}分——这场梦会是「${mood}」气压。`;
    $('#seepHint').textContent = hint;
    const last = journal[0];
    $('#history').textContent = journal.length
      ? (journal.length === 1 ? '这是你来过的第1次' : `你已经来过${journal.length}次了`) + (last ? `，上一场是「${last.title}」` : '')
      : '什么都不填也行。梦自己会找路。';
  }

  // ---------- 绑定 ----------
  function bind() {
    $('#startBtn').addEventListener('click', startDream);
    $('#seedInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') startDream(); });
    $('#flowBtn').addEventListener('click', advance);
    $('#lucidBtn').addEventListener('click', goLucid);
    $('#lucidGo').addEventListener('click', submitLucid);
    $('#lucidInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitLucid(); });
    $('#wakeBtn').addEventListener('click', wake);
    $('#againBtn').addEventListener('click', again);
    $('#cardBtn').addEventListener('click', shareCard);
    $('#sndBtn').addEventListener('click', () => Snd.toggle());
    $('#journalBtn').addEventListener('click', () => { renderJournal(); $('#journal').classList.add('open'); });
    $('#journalClose').addEventListener('click', () => $('#journal').classList.remove('open'));
    $('#journalClear').addEventListener('click', () => {
      if (confirm('把所有梦都还给夜？清空后，旧梦的角色不会再路过。')) {
        journal = []; saveJ(journal); renderJournal(); renderHomeHint();
      }
    });
    $('#gearBtn').addEventListener('click', () => { fillSettings(); $('#settings').classList.add('open'); });
    $('#settingsClose').addEventListener('click', () => { persistSettings(); $('#settings').classList.remove('open'); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { $('#journal').classList.remove('open'); $('#settings').classList.remove('open'); }
      if ((e.key === ' ' || e.key === 'Enter') && S.mode === 'dream' && !$('#lucidRow').offsetParent && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault(); advance();
      }
    });
  }

  function fillSettings() {
    const c = loadAI();
    $('#aiOn').checked = !!c.on;
    $('#aiKey').value = c.key || '';
    $('#aiModel').value = c.model || '';
    $('#aiBase').value = c.base || '';
  }
  function persistSettings() {
    saveAI({ on: $('#aiOn').checked, key: $('#aiKey').value.trim(), model: $('#aiModel').value.trim(), base: $('#aiBase').value.trim() });
  }

  // ---------- 启动 ----------
  sizeBg();
  addEventListener('resize', () => { sizeBg(); if (reduced) requestAnimationFrame(drawBg); });
  setPalette({ bg: '#141031', text: '#e9ecff', blobs: ['#4b5bab', '#7a6bb3', '#3b8686', '#6b4b8a'] });
  requestAnimationFrame(drawBg);
  bind();
  renderHomeHint();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
