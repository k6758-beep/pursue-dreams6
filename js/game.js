/* =====================================================================
 *  《畢業之後：我的夢想冒險》遊戲引擎：game.js
 *  這支程式不寫死任何招生資訊，全部從 data/ 讀取：
 *    window.ADMISSION_DATA  管道、資格規則、日期     （data/admissions.js）
 *    window.CSU_WORLDS      未來城市與科系           （data/departments.js）
 *    window.STORY           劇情、NPC、裝備、結局    （js/story.js）
 * ===================================================================== */
(() => {
"use strict";
const D = window.ADMISSION_DATA, W = window.CSU_WORLDS, T = window.STORY;
const PATHS = D.paths, PMAP = Object.fromEntries(PATHS.map(p => [p.id, p]));
const SAVE_KEY = "grad-quest-v2";
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = s => document.querySelector(s);
const stage = $("#stage");
const wait = ms => new Promise(r => setTimeout(r, RM ? Math.min(ms, 80) : ms));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------------- 狀態與存檔 ---------------- */
const STAT_KEYS = [["goal", "🎯", "目標明確度"], ["intel", "🧭", "升學情報"], ["prep", "🎒", "準備程度"], ["time", "⏰", "時間意識"], ["explore", "🔍", "探索力"]];
const fresh = () => ({ v: 2, ch: 1, day: 30, name: "", p: {}, mind: "", stats: { goal: 0, intel: 0, prep: 0, time: 0, explore: 0 },
  frags: [], unlocked: [], known: false, fork: "", world: "", target: "", npc: "", rechose: false, later: false,
  willing: [], equip: [], main: "", backup: "", ending: "" });
let S = fresh();
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} };
const load = () => { try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return d && d.v === 2 ? d : null; } catch (e) { return null; } };
const wipe = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} };

/* ---------------- 資料層：條件比對與資格判斷 ---------------- */
function match(cond, p) {
  if (!cond) return true;
  return Object.entries(cond).every(([k, want]) => {
    if (k === "any") return want.some(c => match(c, p));
    if (k === "not") return !match(want, p);
    const have = p[k];
    if (Array.isArray(want)) return want.includes(have);
    if (want && typeof want === "object") {
      if ("any" in want) return Array.isArray(have) && have.some(x => want.any.includes(x));
      if ("not" in want) return Array.isArray(want.not) ? !want.not.includes(have) : have !== want.not;
    }
    return have === want;
  });
}
function elig(id) {
  const P = PMAP[id];
  for (const r of P.rules || []) if (match(r.when, S.p)) return { st: r.st, why: r.why };
  return P.otherwise || { st: "y", why: "" };
}
const ST_TXT = { g: "可以走", y: "需要確認", r: "目前不符合" };
const passable = () => PATHS.filter(P => elig(P.id).st !== "r").map(P => P.id);

/* 日期 */
const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const toDate = s => s ? new Date(s + "T00:00:00") : null;
const md = d => `${d.getMonth() + 1}/${d.getDate()}`;
const daysBetween = (a, b) => Math.round((b - a) / 864e5);
const evRange = e => e.to ? `${md(toDate(e.from))}～${md(toDate(e.to))}` : md(toDate(e.from));
const keyEvent = P => P.events.find(e => e.key) || P.events[0];
function nextEvent(P) {
  for (const e of P.events) {
    const s = toDate(e.from), en = toDate(e.to || e.from);
    if (TODAY < s) return { e, live: false, days: daysBetween(TODAY, s) };
    if (TODAY <= en) return { e, live: true, days: daysBetween(TODAY, en) };
  }
  return null;
}
const QR = window.QR_CODES || {};
const qrHTML = (url, cap) => QR[url] ? `<figure class="qr"><div class="qrimg">${QR[url]}</div><figcaption>${esc(cap)}</figcaption></figure>` : "";
const deptLink = d => d.url || window.CSU_DEPT_LINK || D.contact.site;
function guideQRs() {
  const list = [], seen = new Set(), add = (u, cap) => { if (u && QR[u] && !seen.has(u)) { seen.add(u); list.push([u, cap]); } };
  const m = PMAP[S.main], b = PMAP[S.backup];
  if (m) add(m.url, `主線・${m.road}`);
  if (b) add(b.url, `備案・${b.road}`);
  add(D.contact.line, "正修招生 LINE");
  if (list.length < 3) add(window.CSU_DEPT_LINK, "正修科系介紹");
  return list.slice(0, 3);
}
const allConfirmed = () => PATHS.every(P => P.status === "confirmed");

/* ---------------- HUD ---------------- */
function hud() {
  $("#hud").hidden = S.ch < 2 && !S.mind;
  $("#dayNum").textContent = S.day;
  $("#stats").innerHTML = STAT_KEYS.map(([k, ic, nm]) =>
    `<div class="stat" data-k="${k}" title="${nm}"><span aria-hidden="true">${ic}</span><span class="sr">${nm}</span>
      <div class="bar"><i style="width:${S.stats[k]}%"></i></div></div>`).join("");
  $("#fragN").textContent = S.frags.length;
  $("#btnDex").disabled = S.frags.length < T.unlockAt;
  $("#btnCity").disabled = S.ch < 3;
}
function statUp(o) {
  for (const [k, v] of Object.entries(o)) {
    S.stats[k] = Math.max(0, Math.min(100, S.stats[k] + v));
    const nm = STAT_KEYS.find(x => x[0] === k);
    if (v) toast(`${nm[1]} ${nm[2]} ${v > 0 ? "+" : ""}${v}`);
  }
  hud();
  for (const k of Object.keys(o)) { const el = document.querySelector(`.stat[data-k="${k}"]`); if (el) { el.classList.add("bump"); setTimeout(() => el.classList.remove("bump"), 900); } }
}
function toast(t) { const box = $("#toasts"); while (box.children.length >= 3) box.firstElementChild.remove(); const el = document.createElement("div"); el.className = "toast"; el.textContent = t; $("#toasts").append(el); setTimeout(() => el.remove(), 1900); }

/* ---------------- 對話與選擇 ---------------- */
function faceOf(who) {
  if (who === "me") return { face: "🙋", name: S.name || "你", color: "#BFE6FF" };
  if (who === "sys") return { face: "📣", name: "", color: "#FFD84A" };
  const n = T.npcs[who]; return n ? { face: n.face, name: n.name, color: n.color } : { face: "💬", name: "", color: "#ddd" };
}
function sayBox() { let b = stage.querySelector(".dlgwrap"); if (!b) { b = document.createElement("div"); b.className = "dlgwrap"; stage.append(b); } return b; }
async function say(lines) {
  for (const [who, raw] of lines) {
    const text = raw.replace(/\{name\}/g, S.name || "你");
    const f = faceOf(who), box = sayBox();
    box.innerHTML = `<div class="dlg tap ${who === "me" ? "me" : who === "sys" ? "sys" : ""}" role="button" tabindex="0" aria-label="繼續">
      ${f.name ? `<div class="who"><span class="face" style="background:${f.color}">${f.face}</span>${esc(f.name)}</div>` : ""}
      <div class="txt" aria-live="polite"></div><span class="next" aria-hidden="true">▼</span></div>`;
    const d = box.firstElementChild, tx = d.querySelector(".txt");
    d.focus({ preventScroll: true });
    await new Promise(res => {
      let i = 0, full = false, timer;
      const finish = () => { full = true; clearInterval(timer); tx.textContent = text; };
      if (RM) finish(); else timer = setInterval(() => { tx.textContent = text.slice(0, ++i); if (i >= text.length) finish(); }, 28);
      const go = e => { if (e.type === "keydown" && !["Enter", " "].includes(e.key)) return; e.preventDefault(); if (!full) finish(); else { d.removeEventListener("click", go); d.removeEventListener("keydown", go); res(); } };
      d.addEventListener("click", go); d.addEventListener("keydown", go);
    });
  }
}
function clearDlg() { const b = stage.querySelector(".dlgwrap"); if (b) b.remove(); }
async function choose(prompt, opts, cfg = {}) {
  if (prompt) await sayPrompt(cfg.who || "sys", prompt);
  const box = document.createElement("div"); box.className = "choices" + (cfg.two ? " two" : "");
  stage.append(box);
  const sel = new Set();
  box.innerHTML = opts.map((o, i) => `<button class="opt ${o.cls || ""}" data-i="${i}" ${cfg.multi ? 'aria-pressed="false"' : ""}>
    ${o.icon ? `<span class="ic" aria-hidden="true">${o.icon}</span>` : ""}<span>${esc(o.label)}${o.hint ? `<span class="hint">${esc(o.hint)}</span>` : ""}</span></button>`).join("")
    + (cfg.multi ? `<button class="cta" data-ok disabled>${esc(cfg.okLabel || "就這些，出發")}</button>` : "");
  box.querySelector("button").focus({ preventScroll: true });
  box.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "nearest" });
  return new Promise(res => {
    box.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-ok")) { box.remove(); clearDlg(); return res([...sel].map(i => opts[i].v)); }
      const i = +b.dataset.i;
      if (!cfg.multi) { box.remove(); clearDlg(); return res(opts[i].v); }
      const o = opts[i];
      if (sel.has(i)) sel.delete(i); else {
        if (o.v === "none") sel.clear(); else opts.forEach((x, j) => { if (x.v === "none") sel.delete(j); });
        sel.add(i);
      }
      box.querySelectorAll(".opt").forEach(el => { const on = sel.has(+el.dataset.i); el.classList.toggle("sel", on); el.setAttribute("aria-pressed", on); });
      box.querySelector("[data-ok]").disabled = !sel.size;
    });
  });
}
async function sayPrompt(who, text) { // 問題用：顯示後不必點擊
  const f = faceOf(who), box = sayBox();
  box.innerHTML = `<div class="dlg ${who === "sys" ? "sys" : who === "me" ? "me" : ""}">${f.name ? `<div class="who"><span class="face" style="background:${f.color}">${f.face}</span>${esc(f.name)}</div>` : ""}<div class="txt">${esc(text.replace(/\{name\}/g, S.name || "你"))}</div></div>`;
}
async function askText(prompt, ph, okLabel = "確定", skipLabel = "先跳過") {
  await sayPrompt("sys", prompt);
  const box = document.createElement("div"); box.className = "choices";
  box.innerHTML = `<input class="input" maxlength="20" placeholder="${esc(ph)}" aria-label="${esc(prompt)}"><div class="row-btns"><button class="cta" data-ok>${esc(okLabel)}</button><button class="cta ghost" data-skip>${esc(skipLabel)}</button></div>`;
  stage.append(box); const inp = box.querySelector("input"); inp.focus();
  return new Promise(res => {
    const done = v => { box.remove(); clearDlg(); res(v); };
    box.querySelector("[data-ok]").onclick = () => done(inp.value.trim());
    box.querySelector("[data-skip]").onclick = () => done("");
    inp.onkeydown = e => { if (e.key === "Enter") done(inp.value.trim()); };
  });
}
function tapBtn(html, cls = "cta") {
  const b = document.createElement("button"); b.className = cls; b.innerHTML = html; stage.append(b); b.focus({ preventScroll: true });
  return new Promise(r => b.onclick = () => { b.remove(); r(); });
}

/* ---------------- 畫面元件 ---------------- */
function setScene(html) { stage.innerHTML = `<div class="scene">${html}</div>`; window.scrollTo(0, 0); }
async function dayCard(day, sub) {
  S.day = day; hud();
  setScene(`<div class="board"><div class="label">距離畢業典禮</div><div class="big chalk-in">${day}<span class="unit">天</span></div><div class="sub">${esc(sub)}</div></div>`);
  await wait(1300);
}
function piecesHTML() { return `<div class="pieces">${Array.from({ length: Object.keys(T.fragments).length }, (_, i) => `<i class="${i < S.frags.length ? "on" : ""}"></i>`).join("")}</div>`; }
async function gainFragment(key) {
  if (S.frags.includes(key)) return;
  S.frags.push(key); save(); hud();
  await modal(`<div class="frag"><div class="icon">🧩</div><div class="num">情報碎片 ${S.frags.length}</div><p>${esc(T.fragments[key])}</p>${piecesHTML()}</div>`, "收下");
  if (S.frags.length === T.unlockAt) {
    await modal(`<div class="frag"><div class="icon">🗺️</div><div class="num">新功能解鎖</div><p>升學路線圖鑑</p><p class="small" style="font-family:var(--sans);font-size:15px;color:var(--ink-2)">畫面上方的 🗺️ 隨時可以打開。<br>走到哪、看到哪，道路會一條條亮起來。</p></div>`, "好");
  }
}
function unlock(ids) { let n = 0; for (const id of ids) if (PMAP[id] && !S.unlocked.includes(id)) { S.unlocked.push(id); n++; } if (n) { toast(`🗺️ 解鎖 ${n} 條道路`); save(); } }
function roadRow(id, opt = {}) {
  const P = PMAP[id], open = S.unlocked.includes(id) || opt.force;
  if (!open) return `<button class="road locked" data-road="${id}" disabled><span class="ic">🔒</span><span class="t"><b>？？？之路</b><span>繼續冒險就會解鎖</span></span></button>`;
  const e = S.known ? elig(id) : null;
  return `<button class="road ${opt.pop ? "pop" : ""}" style="--c:${P.color};${opt.delay ? `animation-delay:${opt.delay}ms` : ""}" data-road="${id}">
    <span class="ic">${P.icon}</span><span class="t"><b>${esc(P.road)}</b><span>${esc(P.name)}・${esc(P.exam.label)}</span></span>
    ${e ? `<span class="light ${e.st}" title="${ST_TXT[e.st]}" aria-label="${ST_TXT[e.st]}"></span>` : `<span class="light u" aria-hidden="true"></span>`}</button>`;
}

/* ---------------- Overlay：圖鑑、未來城市、通用 modal ---------------- */
const ov = $("#overlay");
function sheet(title, body, onClose) {
  ov.hidden = false;
  ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${title}</h2><button class="x" aria-label="關閉">✕</button></header><div class="sb">${body}</div></div>`;
  const close = () => { ov.hidden = true; ov.innerHTML = ""; onClose && onClose(); };
  ov.querySelector(".x").onclick = close;
  ov.onclick = e => { if (e.target === ov) close(); };
  ov.querySelector(".x").focus();
  return { el: ov.querySelector(".sb"), close };
}
function modal(html, btn = "好") {
  return new Promise(res => {
    ov.hidden = false;
    ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" style="background:transparent;border:none">${html}<div style="height:12px"></div><button class="cta">${esc(btn)}</button></div>`;
    ov.style.alignItems = "center";
    const b = ov.querySelector(".cta"); b.focus();
    b.onclick = () => { ov.hidden = true; ov.innerHTML = ""; ov.style.alignItems = ""; res(); };
  });
}
const estNote = () => allConfirmed() ? "" : `<div class="note-est">📅 ${esc(D.meta.cycle)}：${esc(D.meta.note)}</div>`;
function openDex(focusId) {
  const list = () => `${estNote()}<p class="small muted" style="margin:0 0 8px">已解鎖 ${S.unlocked.length}／${PATHS.length} 條道路${S.known ? "　🟢可以走 🟡需要確認 🔴目前不符合" : ""}</p>
    <div class="roads">${PATHS.map(P => roadRow(P.id)).join("")}</div>`;
  const s = sheet("🗺️ 升學路線圖鑑", list());
  const showList = () => { s.el.innerHTML = list(); };
  const showDetail = id => {
    const P = PMAP[id], e = S.known ? elig(id) : null, nx = nextEvent(P);
    s.el.innerHTML = `<button class="opt quiet" data-back style="margin-bottom:10px">← 回到所有道路</button>
      <div class="card" style="border-left:8px solid ${P.color}"><h3>${P.icon} ${esc(P.road)}</h3><div class="meta">${esc(P.name)}</div></div>
      ${e ? `<div class="status"><span class="light ${e.st}"></span><span><b>${ST_TXT[e.st]}</b>　${esc(e.why)}</span></div>` : ""}
      <div class="detail">
        <section><h4>適合誰</h4>${esc(P.who)}</section>
        <section><h4>基本條件</h4><ul>${P.conditions.map(c => `<li>${esc(c)}</li>`).join("")}</ul></section>
        <section><h4>要考試嗎？</h4><b>${esc(P.exam.label)}</b>　${esc(P.exam.detail)}</section>
        <section><h4>要準備什麼</h4><ul>${P.prep.map(c => `<li>${esc(c)}</li>`).join("")}</ul></section>
        <section><h4>重要時間 ${P.status !== "confirmed" ? `<span class="badge" style="color:var(--note)">推估</span>` : ""}</h4>
          ${P.events.map(ev => { const past = toDate(ev.to || ev.from) < TODAY, isNext = nx && nx.e === ev;
            return `<div class="ev ${isNext ? "next" : ""} ${past ? "past" : ""}"><span class="dt">${evRange(ev)}</span><span>${esc(ev.what)}${ev.confirmed ? `<span class="badge">已公告</span>` : ""}${isNext ? `<span class="badge">${nx.live ? `進行中・剩 ${nx.days} 天` : `還有 ${nx.days} 天`}</span>` : ""}</span></div>`; }).join("")}</section>
        <section><h4>可能遇到的問題</h4><ul>${P.pitfalls.map(c => `<li>${esc(c)}</li>`).join("")}</ul></section>
        <section><h4>在正修</h4>${esc(P.csu)}</section>
      </div>
      <div style="height:14px"></div><a class="cta" style="text-align:center;text-decoration:none" href="${esc(P.url)}" target="_blank" rel="noopener">查看完整資訊</a>
      ${QR[P.url] ? `<div class="qrrow" style="margin-top:12px">${qrHTML(P.url, "用手機掃描，看完整資訊")}</div>` : ""}`;
    s.el.querySelector("[data-back]").onclick = showList;
    s.el.scrollTop = 0; ov.querySelector(".sheet").scrollTop = 0;
  };
  s.el.addEventListener("click", ev => { const b = ev.target.closest("[data-road]"); if (b && !b.disabled) showDetail(b.dataset.road); });
  if (focusId) showDetail(focusId);
}
function worldHTML(w) {
  return `<p class="muted" style="margin:0 0 8px">${w.icon} ${esc(w.line)}</p><div class="roads">${w.depts.map(d =>
    `<div class="dept"><b>${esc(d.name)}</b>${d.check ? ` <span class="chip warn">資料確認中</span>` : ""}<p>${esc(d.learn)}</p><div class="jobs">${d.jobs.map(j => `<span class="chip">${esc(j)}</span>`).join("")}</div>
     <div style="margin-top:6px"><a href="${esc(deptLink(d))}" target="_blank" rel="noopener" class="small">看這個系</a></div></div>`).join("")}</div>`;
}
function openCity() {
  const grid = () => `<p class="small muted" style="margin:0 0 10px">點一個世界，看看正修在那裡有哪些科系。</p><div class="worlds">${W.map(w =>
    `<button class="world ${S.world === w.id ? "on" : ""}" data-w="${w.id}"><span class="ic">${w.icon}</span><b>${esc(w.name)}</b><span>${w.depts.length} 個科系</span></button>`).join("")}</div>
    <div style="height:14px"></div><a class="cta ghost" style="display:block;text-align:center;text-decoration:none" href="${esc(D.contact.site)}" target="_blank" rel="noopener">到正修科技大學招生網</a>`;
  const s = sheet("🏙️ 未來城市", grid());
  s.el.addEventListener("click", e => {
    const b = e.target.closest("[data-w]"), back = e.target.closest("[data-back]"), pick = e.target.closest("[data-pick]");
    if (back) { s.el.innerHTML = grid(); return; }
    if (pick) { S.world = pick.dataset.pick; save(); toast("🎯 已設成夢想方向"); s.el.innerHTML = grid(); return; }
    if (b) { const w = W.find(x => x.id === b.dataset.w); s.el.innerHTML = `<button class="opt quiet" data-back style="margin-bottom:10px">← 回到未來城市</button><h3 style="margin:0 0 4px;font-family:var(--hand);font-size:22px">${w.icon} ${esc(w.name)}</h3>${worldHTML(w)}
      <div style="height:12px"></div>${S.ch >= 3 ? `<button class="cta" data-pick="${w.id}">${S.world === w.id ? "✔ 這是我的夢想方向" : "設成我的夢想方向"}</button>` : ""}`; }
  });
}
function openFrags() {
  sheet("🧩 情報碎片", `${piecesHTML()}<div class="roads" style="margin-top:12px">${S.frags.length ? S.frags.map((k, i) => `<div class="card"><span class="meta">碎片 ${i + 1}</span><div style="font-family:var(--hand);font-size:19px">${esc(T.fragments[k])}</div></div>`).join("") : `<p class="muted">還沒有碎片。和同學、學長姐聊聊天就會出現。</p>`}</div>
    ${S.frags.length < T.unlockAt ? `<p class="small muted">再收集 ${T.unlockAt - S.frags.length} 片，就能解鎖升學路線圖鑑。</p>` : ""}`);
}

/* ---------------- 身分 ---------------- */
function idName() {
  const p = S.p;
  let n = p.vgen === "yes" ? "高職附設普通科" : { gen: "高中普通科", comp: "綜合高中", voc: "高職" }[p.type] || "高中職";
  if (p.type === "comp") n += p.track === "pro" ? "（專門學程）" : p.track === "aca" ? "（學術學程）" : "";
  if (p.art === "yes") n += "（藝術群）";
  return n + (p.grad === "past" ? "・已畢業" : "・應屆");
}
async function askStage(stg, who) {
  for (const q of D.questions.filter(q => q.stage === stg)) {
    if (q.when && !match(q.when, S.p)) continue;
    if (q.multi) { S.p[q.id] = await choose(q.text, q.opts.map(o => ({ ...o })), { multi: true, who, okLabel: "好了" }); continue; }
    const j = await choose(q.text, q.opts.map((o, i) => ({ ...o, v: i })), { who });
    const o = q.opts[j]; S.p[q.id] = o.v; if (o.set) Object.assign(S.p, o.set);
  }
}

/* ===================================================================
 *  章節
 * =================================================================== */
async function title() {
  S = load() || fresh();
  hud(); $("#hud").hidden = true;
  setScene(`<div class="board"><div class="label">距離畢業典禮</div><div class="big chalk-in">30<span class="unit">天</span></div>
    <div class="chatter">${T.openingChatter.map(c => `<div class="line"><b>${esc(T.npcs[c.who].name)}</b>${esc(c.text)}</div>`).join("")}</div></div>`);
  const lines = stage.querySelectorAll(".chatter .line");
  for (const l of lines) { await wait(650); l.classList.add("on"); }
  await wait(500);
  stage.insertAdjacentHTML("beforeend", `<h1 class="title h1">畢業之後：我的夢想冒險<span class="tag">高中職畢業生的升學 RPG</span></h1>
    <p class="ask-big">你呢？<br>畢業之後，你要去哪裡？</p>`);
  const resumable = load();
  const box = document.createElement("div"); stage.append(box);
  box.innerHTML = resumable && resumable.ch > 1 && resumable.ch < 9
    ? `<button class="cta" data-go="resume">繼續冒險（DAY ${resumable.day}）</button><button class="cta ghost" data-go="new">重新開始冒險</button>`
    : resumable && resumable.ch >= 9 ? `<button class="cta" data-go="guide">查看我的畢業冒險攻略</button><button class="cta ghost" data-go="new">重新開始冒險</button>`
    : `<button class="cta" data-go="new">開始我的冒險</button>`;
  box.querySelector("button").focus();
  const go = await new Promise(r => box.onclick = e => { const b = e.target.closest("[data-go]"); if (b) r(b.dataset.go); });
  if (go === "new") { wipe(); S = fresh(); }
  if (go === "guide") { S = resumable; hud(); return guideCard(); }
  run();
}

const CHAPTERS = [null, ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8];
async function run() {
  hud();
  while (S.ch < CHAPTERS.length) { await CHAPTERS[S.ch](); S.ch++; save(); }
  S.ch = 9; save(); guideCard();
}

/* DAY 30：建立你的角色 */
async function ch1() {
  await dayCard(30, "建立你的角色");
  S.p = {}; S.unlocked = [];
  await say([["sys", "在出發之前，先確認你的身分。"]]);
  S.name = await askText("同學都叫你什麼？", "例如：阿翔、小魚", "就叫我這個", "隨便啦");
  await askStage("create");
  const m = await choose("說真的，畢業之後要去哪，你現在比較像哪一種？", T.mindsets.map(x => ({ v: x.id, icon: x.icon, label: x.label, hint: `「${x.quote}」` })));
  const M = T.mindsets.find(x => x.id === m); S.mind = m;
  S.stats = { ...M.stats };
  if (m === "A" || m === "E") S.target = await askText(m === "A" ? "想去的學校或科系是？（可以不填）" : "爸媽希望你讀的是？（可以不填）", "例如：正修 數位多媒體設計系");
  hud(); $("#hud").hidden = false;
  setScene(`<div class="card center"><div class="meta">角色建立完成</div><h3 style="font-family:var(--hand);font-size:26px;margin:6px 0">${M.icon} ${esc(S.name || "你")}</h3>
    <div>${esc(idName())}</div><div class="meta" style="margin-top:4px">「${esc(M.title)}」</div>
    <div class="sbars" style="display:grid;gap:6px;margin-top:12px;text-align:left">${STAT_KEYS.map(([k, ic, nm]) => `<div style="display:grid;grid-template-columns:100px 1fr 30px;gap:8px;align-items:center;font-size:14px"><span>${ic} ${nm}</span><div style="height:8px;background:#ECE9DB;border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${S.stats[k]}%;background:var(--board-2)"></i></div><span>${S.stats[k]}</span></div>`).join("")}</div></div>`);
  await say([["sys", "數值不是分數，只是你出發時的樣子。"], ["sys", "接下來的 30 天，你做的每個選擇，都會讓它長大。"]]);
}

/* DAY 25：班群 */
async function ch2() {
  await dayCard(25, "有人已經決定學校了");
  setScene(`<div class="phone"><div class="bar"><span class="room">三年八班 🎓（42）</span><span>22:47</span></div><div class="msgs" id="msgs"></div></div>`);
  const msgs = $("#msgs");
  const add = (who, text, mine) => { const f = faceOf(who); const el = document.createElement("div"); el.className = "msg" + (mine ? " mine" : "");
    el.innerHTML = `${mine ? "" : `<span class="face" style="background:${f.color}">${f.face}</span>`}<div>${mine ? "" : `<div class="n">${esc(f.name)}</div>`}<div class="b">${esc(text)}</div></div>`;
    msgs.append(el); msgs.scrollTop = msgs.scrollHeight; requestAnimationFrame(() => el.classList.add("on")); };
  for (const m of T.groupChat) { await wait(800); add(m.who, m.text); }
  await wait(600);
  const who = await choose("你點開了誰的訊息？", T.groupChat.map(m => ({ v: m.who, icon: T.npcs[m.who].face, label: T.npcs[m.who].name, hint: m.text })));
  S.npc = who;
  const g = T.groupChat.find(m => m.who === who);
  add("me", "欸，你剛剛說的…", true); await wait(700); add(who, g.reply); await wait(900);
  const r = await choose("你想回他什麼？", [
    { v: "same", icon: "🤝", label: "其實我也差不多" },
    { v: "ask", icon: "❓", label: "那你打算怎麼辦？" },
    { v: "idk", icon: "🤷", label: "我也不知道欸" }]);
  add("me", { same: "其實我也差不多啦", ask: "那你打算怎麼辦？", idk: "我也不知道欸" }[r], true); await wait(700);
  add(who, r === "ask" ? "我也不知道……要不要一起去問問看？" : "哈，原來不是只有我。");
  await wait(900);
  statUp(r === "ask" ? { explore: 6, intel: 4 } : { explore: 6 });
  await say([["sys", `你和${T.npcs[who].name}聊到很晚。`], ["sys", "原來，每個人對「畢業之後」的想法都不一樣。"]]);
  statUp({ time: 5 });
}

/* DAY 20：第一次遇到升學問題＋岔路 */
async function ch3() {
  await dayCard(20, "第一次遇到升學管道問題");
  setScene(`<div class="board" style="padding:16px"><div class="sub">放學的走廊</div><div style="font-size:52px;margin-top:6px">🧢</div></div>`);
  await say([["senior", "欸，學弟妹！聽說你們快畢業了？"], ["senior", "我以前以為成績好就可以。"], ["senior", "結果差點錯過報名時間，超危險。"]]);
  await gainFragment("grade");
  const a = await choose("學長問你：你知道高中職畢業，可以走幾條路到科大嗎？", [
    { v: 1, icon: "1️⃣", label: "大概一兩條吧" }, { v: 2, icon: "📝", label: "應該只有考試吧" }, { v: 3, icon: "🤷", label: "不知道" }], { who: "senior" });
  await say([["senior", a === 3 ? "沒關係，我當時也不知道。" : "哈，我以前也這樣想。"], ["senior", `其實光是到正修，就有大概 ${PATHS.length} 條路。`], ["senior", "要先往哪裡走，你自己選。"]]);
  setScene(`<div class="board" style="padding:16px"><div class="sub">前面有三條路</div><div style="font-size:44px;margin-top:6px">🛣️</div></div>`);
  const f = await choose("", [
    { v: "blue", cls: "blue", icon: "🟦", label: "我已經知道我要去哪裡" },
    { v: "green", cls: "green", icon: "🟩", label: "我想先探索" },
    { v: "yellow", cls: "yellow", icon: "🟨", label: "我想看看別人怎麼選" }]);
  S.fork = f; save();
  if (f === "blue") await forkBlue(); else if (f === "green") await forkGreen(); else await forkYellow();
  setScene(`<div class="board" style="padding:16px"><div class="sub">🔔 下課鐘響</div></div>`);
  await say([["sys", "不管走了哪條岔路，下課鐘響，大家又回到同一條走廊。"]]);
}
async function forkBlue() {
  if (!S.target) S.target = await askText("你想去的學校或科系是？（可以不填）", "例如：正修 餐飲管理系");
  await say([["senior", S.target ? `${S.target}？不錯欸。` : "有目標就很好。"], ["senior", "那你知道要走哪條路到那裡嗎？"]]);
  const r = await choose("", [{ v: "exam", icon: "📝", label: "考試啊，不然咧" }, { v: "idk", icon: "🤷", label: "不知道耶" }, { v: "many", icon: "🛣️", label: "應該不只一條吧？" }]);
  await say([["senior", r === "many" ? "對！你很敏銳。" : "考試是其中一條，但不是唯一一條。"], ["senior", "同一個系，可能有申請、甄選、繁星、單招……看你是什麼身分、準備了什麼。"]]);
  statUp({ goal: 10, intel: 8 });
  await gainFragment("manyRoads");
}
async function forkGreen() {
  await say([["sys", "你推開走廊盡頭的門，眼前是一座「未來城市」。"]]);
  for (let round = 0; round < 3; round++) {
    const wid = await choose(round ? "還想去哪個世界看看？" : "你想先逛哪個世界？", W.map(w => ({ v: w.id, icon: w.icon, label: w.name, hint: w.line })), { two: true });
    const w = W.find(x => x.id === wid);
    setScene(`<h3 class="title" style="font-size:24px;margin-bottom:8px">${w.icon} ${esc(w.name)}</h3>${worldHTML(w)}`);
    const d = await choose("", [{ v: "pick", icon: "✨", label: "這個世界有點意思", hint: "設成我的夢想方向" }, ...(round < 2 ? [{ v: "more", icon: "🚶", label: "再看看別的世界" }] : [])]);
    if (d === "pick" || round === 2) { S.world = wid; break; }
    setScene(`<div class="board" style="padding:16px"><div class="sub">🏙️ 未來城市</div></div>`);
  }
  statUp({ explore: 15, goal: 6 });
  await gainFragment("explore");
}
async function forkYellow() {
  await say([["sys", "你在學生餐廳遇到幾個回來看老師的學長姐。"]]);
  for (const s of T.seniorStories) {
    setScene(`<div class="card"><div style="font-size:40px">${s.face}</div><div class="meta">${esc(s.who)}</div><p style="font-family:var(--hand);font-size:21px;margin:6px 0 0">「${esc(s.text)}」</p></div>`);
    unlock(s.paths);
    await tapBtn("下一位");
  }
  statUp({ intel: 12, explore: 5 });
  await gainFragment("others");
}

/* DAY 15：背包檢查＋不同身分不同路 */
async function ch4() {
  await dayCard(15, "不同的人，有不同的路");
  setScene(`<div class="board" style="padding:16px"><div style="font-size:52px">🎒</div><div class="sub">背包檢查</div></div>`);
  await say([["senior", "來，把你的背包倒出來看看。"], ["senior", "成績、證照、比賽、特別的經歷，這些都會決定你能走哪幾條路。"]]);
  await askStage("backpack", "senior");
  S.known = true;
  await gainFragment("identity");
  const ids = PATHS.map(P => P.id);
  unlock(ids.filter(id => elig(id).st !== "r"));
  setScene(`<p class="center muted" style="margin:0">${esc(idName())}・你的升學路線</p><div class="roads">${ids.map((id, i) => roadRow(id, { force: true, pop: true, delay: i * 160 })).join("")}</div>`);
  stage.querySelectorAll("[data-road]").forEach(b => b.onclick = () => openDex(b.dataset.road));
  await wait(ids.length * 160 + 400);
  const g = ids.filter(id => elig(id).st === "g").length, y = ids.filter(id => elig(id).st === "y").length;
  statUp({ intel: 20 });
  await say([["senior", `你現在有 ${g} 條路可以直接走，${y} 條要再確認。`], ["senior", "紅燈不是你不行，是那條路現在不屬於你。有些路以後還會打開，例如考到乙級證照。"], ["sys", "點任何一條路，都能看它的細節。"]]);
  await say([["yu", "欸…如果我最後沒拿到畢業證書怎麼辦？"], ["senior", D.meta.sameEducationNote]]);
  await gainFragment("sameEdu");
}

/* DAY 10：倒數計時＋時間排序 */
async function ch5() {
  await dayCard(10, "有些事要提前準備");
  setScene(`<div class="board" style="padding:16px"><div style="font-size:48px">🏀</div></div>`);
  const r = await choose("欸，週末去打球啦！升學的事之後再說～", [{ v: "later", icon: "👌", label: "好啊，之後再決定" }, { v: "check", icon: "📅", label: "我先看一下時間" }], { who: "datou" });
  S.later = r === "later";
  if (S.later) await say([["sys", "你繼續往前走。"], ["sys", "只是你突然發現，前面的路開始出現倒數計時。"]]);
  else await say([["sys", "你打開手機行事曆，把升學的時間一個一個找出來。"]]);
  const mine = passable().map(id => ({ P: PMAP[id], n: nextEvent(PMAP[id]) })).filter(x => x.n).sort((a, b) => a.n.days - b.n.days).slice(0, 5);
  setScene(`${estNote()}<div class="countdown">${mine.length ? mine.map(({ P, n }) => `<div class="cd ${n.days <= 30 ? "hot" : ""}"><div class="d">${n.days}<small> 天</small></div><div class="w">${P.icon} ${esc(P.road)}<span>${n.live ? "進行中・剩下" : "距離"}「${esc(n.e.what)}」（${evRange(n.e)}）</span></div></div>`).join("") : `<div class="cd"><div class="w">本學年度的時程都已經過了，下一年度的日期公告後會更新。</div></div>`}</div>`);
  await say([["sys", S.later ? "原來時間真的會影響選擇。" : "原來有些路，比想像中早很多就開始了。"]]);
  statUp({ time: S.later ? 22 : 18 });
  await timelineGame();
  await gainFragment("timing");
}
async function timelineGame() {
  let pool = passable().map(id => PMAP[id]);
  if (pool.length < 3) pool = pool.concat(PATHS.filter(P => !pool.includes(P)));
  const evs = pool.slice(0, 6).map(P => ({ P, e: keyEvent(P) })).filter((x, i, a) => a.findIndex(y => y.e.from === x.e.from) === i);
  const pick = shuffle(evs).slice(0, 4), order = pick.slice().sort((a, b) => toDate(a.e.from) - toDate(b.e.from));
  setScene(`<h3 class="title" style="font-size:22px">⏰ 時間排序挑戰</h3><p class="center muted small" style="margin:4px 0 10px">照時間先後，依序點下去</p>
    <div class="tl">${pick.map((x, i) => `<button class="tlbtn" data-i="${i}"><span class="o"></span><span>${x.P.icon} ${esc(x.e.what)}<small>${esc(x.P.road)}</small></span></button>`).join("")}</div>`);
  let step = 0, miss = 0;
  await new Promise(res => stage.querySelector(".tl").addEventListener("click", e => {
    const b = e.target.closest(".tlbtn"); if (!b || b.classList.contains("done")) return;
    const x = pick[+b.dataset.i];
    if (toDate(x.e.from).getTime() === toDate(order[step].e.from).getTime()) {
      b.classList.add("done"); b.querySelector(".o").textContent = ++step;
      b.querySelector("small").textContent = `${x.P.road}・${evRange(x.e)}`;
      if (step === order.length) res();
    } else { miss++; b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope"); }
  }));
  await wait(400);
  await say([["sys", miss === 0 ? "全對！你對時間很有感覺。" : "排好了！就算一開始搞錯也沒關係，現在你知道順序了。"]]);
  statUp({ time: Math.max(4, 12 - miss * 3) });
}

/* DAY 5：重新檢視＋願意付出＋推薦道路 */
async function ch6() {
  await dayCard(5, "重新檢視自己的選擇");
  const M = T.mindsets.find(x => x.id === S.mind);
  setScene(`<div class="card"><div class="meta">25 天前的你</div><div style="font-family:var(--hand);font-size:22px">${M.icon} 「${esc(M.quote)}」</div></div>`);
  const r = await choose("現在的你，想法有變嗎？", [{ v: "same", icon: "📌", label: "沒變，我更確定了" }, { v: "change", icon: "🔄", label: "有變，我想重新選" }, { v: "thinking", icon: "💭", label: "我還在想" }]);
  if (r === "change") {
    S.rechose = true;
    const wid = await choose("那你現在比較想往哪個世界走？", W.map(w => ({ v: w.id, icon: w.icon, label: w.name })), { two: true });
    S.world = wid; statUp({ explore: 10, goal: 8 });
    await say([["sys", "改變想法不是倒退，是你看得更清楚了。"]]);
  } else if (r === "same") { statUp({ goal: 10 }); } else { statUp({ explore: 5 }); await say([["sys", "還在想也很好，至少你現在知道自己在想什麼。"]]); }
  S.willing = await choose("為了走到想去的地方，這些事你願意做哪些？（可複選）", D.willing.map(w => ({ v: w.id, icon: w.icon, label: w.label })), { multi: true, okLabel: "就這些" });
  statUp({ prep: 6 + S.willing.length * 2 });
  const rec = recommend().slice(0, 3);
  unlock(rec);
  setScene(`<p class="center muted" style="margin:0">最適合你探索的道路</p><div class="roads">${rec.map((id, i) => roadRow(id, { pop: true, delay: i * 200 })).join("")}</div>`);
  stage.querySelectorAll("[data-road]").forEach(b => b.onclick = () => openDex(b.dataset.road));
  await wait(800);
  await say([["datou", "欸我聽說，就算前面都沒上，8 月還有單獨招生跟進修部？"], ["sys", "大頭難得說對了一次。"]]);
  await gainFragment("later");
}
function recommend() {
  const fit = id => { const t = PMAP[id].tags || []; return t.length && S.willing.length ? t.filter(x => S.willing.includes(x)).length / t.length : 0; };
  return passable().map(id => ({ id, s: (elig(id).st === "g" ? 2 : 1) + fit(id) * 3 })).sort((a, b) => b.s - a.s).map(x => x.id);
}

/* DAY 1：出發前，你願意帶什麼？＋最後策略 */
async function ch7() {
  await dayCard(1, "做最後的升學策略");
  setScene(`<div class="board" style="padding:16px"><div style="font-size:48px">🎒</div><div class="sub">出發前，你願意帶什麼？</div></div>`);
  S.equip = await choose("", T.equipment.map(e => ({ v: e.id, icon: e.icon, label: e.label, hint: `裝備：${e.item}` })), { multi: true, okLabel: "裝進背包" });
  const add = {}; for (const id of S.equip) for (const [k, v] of Object.entries(T.equipment.find(e => e.id === id).stat)) add[k] = (add[k] || 0) + v;
  statUp(add);
  const rec = recommend();
  setScene(`<div class="board" style="padding:16px"><div class="sub">最後一晚，你在筆記本上寫下……</div></div>`);
  S.main = await choose("我的主線道路是？", [...rec.map(id => ({ v: id, icon: PMAP[id].icon, label: PMAP[id].road, hint: `${PMAP[id].name}・${ST_TXT[elig(id).st]}` })), { v: "", icon: "🔭", label: "我還想再探索，先不決定", cls: "quiet" }]);
  unlock(S.main ? [S.main] : []);
  if (S.main && rec.length > 1) {
    S.backup = await choose("如果主線沒走通，備案是？", [...rec.filter(id => id !== S.main).slice(0, 4).map(id => ({ v: id, icon: PMAP[id].icon, label: PMAP[id].road })), { v: "", icon: "⏭️", label: "先不設備案", cls: "quiet" }]);
  }
  if (S.main) statUp({ goal: 10, prep: 6 });
}

/* DAY 0：畢業典禮與結局 */
function decideEnding() {
  if (S.rechose || (S.later && ["C", "D"].includes(S.mind))) return "C";
  if (!S.main) return "D";
  if (S.mind === "A" || (S.target && S.stats.goal >= 60)) return "A";
  if (S.equip.length >= 4 && S.stats.time >= 50) return "E";
  return S.world ? "B" : "E";
}
async function ch8() {
  S.day = 0; hud();
  S.ending = decideEnding(); unlock(PATHS.map(P => P.id)); save();
  setScene(`<div class="ceremony"><div class="gate">🏫</div><div style="font-family:var(--hand);font-size:22px;margin-top:6px">畢業典禮</div><div class="crowd">🎓🧑‍🎓👩‍🎓🎓🧑‍🎓👩‍🎓</div></div>
    <div id="fins" style="display:grid;gap:8px">${T.finale.map(t => `<p class="fin">${esc(t)}</p>`).join("")}<p class="fin strong">${esc(T.finaleStrong)}</p></div>`);
  for (const p of stage.querySelectorAll(".fin")) { await wait(1100); p.classList.add("on"); }
  await wait(900);
  if (S.npc) await say([[S.npc, T.farewell[S.npc]]]);
  clearDlg();
  const E = T.endings[S.ending];
  setScene(`<div class="ending"><div class="k">ENDING ${S.ending}</div><h2>${esc(E.title)}</h2><p style="margin:6px 0 0">${esc(E.line)}</p></div>
    <p class="motto">${esc(T.motto)}</p>`);
}

/* 🏆 我的畢業冒險攻略 */
function guideData() {
  const E = T.endings[S.ending] || T.endings.D, M = T.mindsets.find(x => x.id === S.mind) || T.mindsets[5];
  const w = W.find(x => x.id === S.world), main = PMAP[S.main], backup = PMAP[S.backup];
  const nx = main ? nextEvent(main) : null;
  return { E, M, w, main, backup, nx,
    rows: [
      ["我的角色", `${idName()}\n${M.title}`],
      ["夢想方向", w ? `${w.icon} ${w.name}` : "還在探索中"],
      ["我的目標", S.target || "還沒設定，沒關係"],
      ["升學情報", `解鎖 ${S.unlocked.length}／${PATHS.length} 條道路、${S.frags.length} 片情報`],
      ["升學道路", main ? `主線：${main.icon} ${main.road}（${main.name}）${backup ? `\n備案：${backup.icon} ${backup.road}` : ""}` : "繼續探索中"],
      ["下一步", nx ? `${nx.live ? "進行中" : `${nx.days} 天後`}：${main.road}「${nx.e.what}」（${evRange(nx.e)}）` : main ? "本學年度時程已過，留意下一年度簡章" : "先打開圖鑑，挑一條路看看"],
      ["我的裝備", S.equip.length ? S.equip.map(id => { const e = T.equipment.find(x => x.id === id); return `${e.icon} ${e.item}`; }).join("、") : "輕裝出發"]
    ] };
}
function guideCard() {
  hud(); $("#hud").hidden = false;
  const g = guideData();
  setScene(`<div class="guide" id="guide"><h2>🏆 我的畢業冒險攻略</h2><p class="center" style="margin:0 0 8px;color:var(--ink-2)">${esc(S.name || "我")}・ENDING ${S.ending}「${esc(g.E.title)}」</p>
    ${g.rows.map(([k, v]) => `<div class="row"><b>${k}</b><span>${esc(v).replace(/\n/g, "<br>")}</span></div>`).join("")}
    <div class="row"><b>我的能力</b><div class="sbars">${STAT_KEYS.slice(0, 4).map(([k, ic, nm]) => `<div class="sb"><span>${ic} ${nm}</span><div class="bar"><i style="width:${S.stats[k]}%"></i></div><span>${S.stats[k]}</span></div>`).join("")}</div></div>
    <p class="close">${esc(g.E.line)}</p>
    ${guideQRs().length ? `<div class="qrrow">${guideQRs().map(([u, c]) => qrHTML(u, c)).join("")}</div>` : ""}
    <p class="foot">${esc(D.meta.cycle)}${allConfirmed() ? "" : "・日期含推估"}　正修招生 LINE ${esc(D.contact.lineId)}・${esc(D.contact.tel)}</p></div>
    <div style="height:6px"></div>
    <button class="cta" id="dl">下載攻略卡圖片</button>
    <div class="row-btns" style="margin-top:10px"><button class="cta ghost" id="dex">🗺️ 升學路線圖鑑</button><button class="cta ghost" id="city">🏙️ 探索正修科技大學</button></div>
    <button class="cta ghost" id="again" style="margin-top:10px">重新開始冒險</button>`);
  $("#dl").onclick = downloadCard; $("#dex").onclick = () => openDex(S.main || undefined); $("#city").onclick = openCity;
  $("#again").onclick = () => { if (confirm("確定要重新開始嗎？目前的攻略會被清除。")) { wipe(); S = fresh(); title(); } };
}
/* 攻略卡轉圖片（Canvas） */
async function downloadCard() {
  const g = guideData(), Wd = 1080, pad = 70, c = document.createElement("canvas"), x = c.getContext("2d");
  const hand = getComputedStyle(document.body).getPropertyValue("--hand"), sans = getComputedStyle(document.body).getPropertyValue("--sans");
  const wrap = (t, maxW, font) => { x.font = font; const out = []; for (const para of String(t).split("\n")) { let line = ""; for (const ch of para) { if (x.measureText(line + ch).width > maxW) { out.push(line); line = ch; } else line += ch; } out.push(line); } return out; };
  const blocks = g.rows.map(([k, v]) => ({ k, lines: wrap(v, Wd - pad * 2 - 220, `34px ${sans}`) }));
  const closeLines = wrap(g.E.line, Wd - pad * 2 - 40, `44px ${hand}`);
  const qrs = guideQRs(), imgs = await Promise.all(qrs.map(([u]) => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(QR[u]); })));
  const qrH = qrs.length ? 330 : 0;
  const H = qrH + 300 + blocks.reduce((s, b) => s + b.lines.length * 50 + 34, 0) + 4 * 62 + 60 + closeLines.length * 64 + 200;
  c.width = Wd; c.height = H;
  x.fillStyle = "#1D3A2E"; x.fillRect(0, 0, Wd, H);
  x.fillStyle = "#FFD84A"; x.fillRect(30, 30, Wd - 60, H - 60);
  x.fillStyle = "#FFFEF8"; x.fillRect(46, 46, Wd - 92, H - 92);
  x.fillStyle = "#1F2A25"; x.textAlign = "center"; x.font = `bold 64px ${hand}`; x.fillText("🏆 我的畢業冒險攻略", Wd / 2, 150);
  x.font = `34px ${sans}`; x.fillStyle = "#4F5D56"; x.fillText(`${S.name || "我"}・ENDING ${S.ending}「${g.E.title}」`, Wd / 2, 214);
  let y = 290; x.textAlign = "left";
  for (const b of blocks) {
    x.fillStyle = "#4F5D56"; x.font = `bold 30px ${sans}`; x.fillText(b.k, pad, y);
    x.fillStyle = "#1F2A25"; x.font = `34px ${sans}`; b.lines.forEach((l, i) => x.fillText(l, pad + 220, y + i * 50));
    y += b.lines.length * 50 + 14; x.strokeStyle = "#DAD6C5"; x.setLineDash([8, 8]); x.beginPath(); x.moveTo(pad, y); x.lineTo(Wd - pad, y); x.stroke(); y += 40;
  }
  x.setLineDash([]);
  for (const [k, ic, nm] of STAT_KEYS.slice(0, 4)) {
    x.fillStyle = "#1F2A25"; x.font = `32px ${sans}`; x.fillText(`${ic} ${nm}`, pad, y);
    x.fillStyle = "#ECE9DB"; x.fillRect(pad + 300, y - 24, 520, 22); x.fillStyle = "#24483A"; x.fillRect(pad + 300, y - 24, 5.2 * S.stats[k], 22);
    x.fillStyle = "#1F2A25"; x.fillText(String(S.stats[k]), pad + 850, y); y += 62;
  }
  y += 40; x.textAlign = "center"; x.font = `44px ${hand}`; closeLines.forEach(l => { x.fillText(l, Wd / 2, y); y += 64; });
  if (qrs.length) {
    const sz = 200, gap = 56, tot = qrs.length * sz + (qrs.length - 1) * gap; let qx = (Wd - tot) / 2; y += 10;
    qrs.forEach(([u, cap], i) => { if (imgs[i]) x.drawImage(imgs[i], qx, y, sz, sz); x.font = `24px ${sans}`; x.fillStyle = "#4F5D56";
      wrap(cap, sz + 30, `24px ${sans}`).forEach((l, k) => x.fillText(l, qx + sz / 2, y + sz + 34 + k * 30)); qx += sz + gap; });
    y += qrH;
  }
  x.font = `26px ${sans}`; x.fillStyle = "#4F5D56"; x.fillText(`${D.meta.cycle}　正修招生 LINE ${D.contact.lineId}`, Wd / 2, H - 90);
  const a = document.createElement("a"); a.download = "我的畢業冒險攻略.png"; a.href = c.toDataURL("image/png"); a.click();
}

/* ---------------- 啟動 ---------------- */
$("#btnDex").onclick = () => openDex();
$("#btnCity").onclick = openCity;
$("#btnFrag").onclick = openFrags;
document.addEventListener("keydown", e => { if (e.key === "Escape" && !ov.hidden) { const x = ov.querySelector(".x"); if (x) x.click(); } });
async function boot() {
  if (!D || !W || !T) { stage.innerHTML = `<div class="card">資料檔沒有載入成功。請確認 data/admissions.js、data/departments.js、js/story.js 都有上傳。</div>`; return; }
  await title();
}
boot();
})();
