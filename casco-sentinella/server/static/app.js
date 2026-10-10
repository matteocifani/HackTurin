// Casco Sentinella — logica web condivisa dalle tre pagine (SPEC §8).
// Ogni pagina dichiara <body data-page="public|comune|emergenza">.
"use strict";

const POLL_MS = 2000;              // aggiornamento eventi (SPEC §8)
const TORINO = [45.07, 7.69];

const TYPES = {
  BUCA:                        { label: "Buca / dissesto",            color: "#e6a100" },
  CADUTA_DA_DISSESTO:          { label: "Caduta da dissesto",         color: "#e8590c" },
  CADUTA_SENZA_CAUSA_RILEVATA: { label: "Caduta senza causa rilevata", color: "#7048e8" },
  IMPATTO_VIOLENTO:            { label: "Impatto violento",           color: "#c92a2a" },
};
const STATUSES = ["NUOVO", "VERIFICATO", "IN_LAVORAZIONE", "RISOLTO", "FALSO_POSITIVO"];
const ALARM_LABEL = { NONE: "—", SENT: "Inviato", CANCELED: "Annullato", MOVEMENT_RESUMED: "Si è rialzato" };

// ---------------- utilità ----------------
async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtDate(ts) {
  return new Date(ts).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function typeLabel(t) { return (TYPES[t] || { label: t }).label; }
function isSim(e) { return e.simulated; }
// Fonte sempre dichiarata (SPEC v0.3 §3.4): casco reale, simulatore ("SIM") o storico simulato.
const SOURCE_BADGE = {
  helmet:    '<span class="badge helmet">Casco</span>',
  simulator: '<span class="badge simtool">SIM · simulatore</span>',
  demo_seed: '<span class="badge sim">Storico simulato</span>',
};
function sourceBadge(e) { return SOURCE_BADGE[e.source] || `<span class="badge">${esc(e.source)}</span>`; }
function setLive(ok) {
  const el = document.getElementById("live");
  if (!el) return;
  el.className = "live " + (ok ? "ok" : "ko");
  el.textContent = ok ? "aggiornato " + new Date().toLocaleTimeString("it-IT") : "server non raggiungibile";
}
function isoDaysAgo(days) { return new Date(Date.now() - days * 86400000).toISOString(); }

// Notifica discreta di nuovo evento: riquadro in basso a destra, sparisce dopo 6 s
const SOURCE_TEXT = { helmet: "casco", simulator: "SIM · simulatore", demo_seed: "storico simulato" };
function toast(e) {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts"; box.className = "toasts";
    box.setAttribute("aria-live", "polite");
    document.body.appendChild(box);
  }
  while (box.children.length >= 4) box.firstElementChild.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.style.setProperty("--type-color", (TYPES[e.type] || {}).color || "#6c737c");
  t.innerHTML = `<div class="t-title">Nuovo evento · ${esc(typeLabel(e.type))}</div>
    <div class="t-sub">${esc(new Date(e.ts).toLocaleTimeString("it-IT"))} · severità ${e.severity}/5 · ${esc(SOURCE_TEXT[e.source] || e.source)}${e.emergency ? " · allarme inviato" : ""}</div>`;
  box.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 250); }, 6000);
}

function makeMap(id) {
  const map = L.map(id).setView(TORINO, 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  return map;
}

// Marker: dati simulati più chiari e tratteggiati, eventi del casco pieni con bordo bianco.
function eventMarker(e, pulse) {
  const sim = isSim(e);
  const m = L.circleMarker([e.lat, e.lon], {
    radius: 4 + e.severity,
    color: sim ? "#444" : "#fff",
    weight: sim ? 1 : 2,
    dashArray: sim ? "2 2" : null,
    fillColor: (TYPES[e.type] || {}).color || "#888",
    fillOpacity: sim ? 0.5 : 0.95,
    className: pulse ? "pulse" : "",
  });
  if (e.source === "simulator") m.bindTooltip("SIM", { permanent: true, direction: "right", className: "sim-tag", offset: [6, 0] });
  return m;
}

function popupHtml(e, full) {
  let html = `<b>${esc(typeLabel(e.type))}</b> ${sourceBadge(e)}<br>${esc(fmtDate(e.ts))} · severità ${e.severity}/5`;
  if (e.alarm_state !== "NONE") html += `<br>Allarme: ${esc(ALARM_LABEL[e.alarm_state])}`;
  if (full) {
    html += `<br>Stato: ${esc(e.status)} · #${e.id}`;
    html += `<br>${e.lat.toFixed(5)}, ${e.lon.toFixed(5)} <i>(posizione ${e.position_source === "simulated_route" ? "SIMULATA" : esc(e.position_source)})</i>`;
  }
  return html;
}

// ======================================================================
// Pagina pubblica "/"
// ======================================================================
function initPublic() {
  const map = makeMap("map");
  const markers = L.layerGroup().addTo(map);
  const heat = L.heatLayer([], { radius: 22, blur: 18, maxZoom: 16 }).addTo(map);
  const st = { events: new Map(), maxId: 0, days: 30, types: new Set(Object.keys(TYPES)), fresh: new Set() };

  // filtri per tipo + contatori (fanno anche da legenda)
  const box = document.getElementById("types");
  for (const [t, info] of Object.entries(TYPES)) {
    box.insertAdjacentHTML("beforeend",
      `<label class="row counter"><input type="checkbox" data-type="${t}" checked>
       <span class="dot" style="background:${info.color}"></span>${esc(info.label)}<span class="n" id="n-${t}">0</span></label>`);
  }
  box.addEventListener("change", ev => {
    const t = ev.target.dataset.type;
    ev.target.checked ? st.types.add(t) : st.types.delete(t);
    render();
  });
  document.getElementById("period").addEventListener("change", ev => { st.days = +ev.target.value; loadAll(); });
  document.getElementById("showHeat").addEventListener("change", ev => ev.target.checked ? heat.addTo(map) : heat.remove());
  document.getElementById("showMarkers").addEventListener("change", ev => ev.target.checked ? markers.addTo(map) : markers.remove());

  const sinceMs = () => Date.now() - st.days * 86400000;
  const visible = e => e.status !== "FALSO_POSITIVO" && new Date(e.ts).getTime() >= sinceMs();

  function render() {
    markers.clearLayers();
    const pts = [];
    const counts = Object.fromEntries(Object.keys(TYPES).map(t => [t, 0]));
    for (const e of st.events.values()) {
      counts[e.type] = (counts[e.type] || 0) + 1;
      if (!st.types.has(e.type)) continue;
      eventMarker(e, st.fresh.has(e.id)).bindPopup(popupHtml(e, false)).addTo(markers);
      pts.push([e.lat, e.lon, e.severity / 5]);   // heatmap pesata per severità
    }
    heat.setLatLngs(pts);
    for (const t in counts) { const el = document.getElementById("n-" + t); if (el) el.textContent = counts[t]; }
    document.getElementById("total").textContent = [...st.events.values()].length;
  }

  function absorb(list, markFresh) {
    for (const e of list) {
      st.maxId = Math.max(st.maxId, e.id);
      if (!visible(e)) { st.events.delete(e.id); continue; }
      st.events.set(e.id, e);
      if (markFresh) { st.fresh.add(e.id); setTimeout(() => { st.fresh.delete(e.id); }, 4000); toast(e); }
    }
  }

  async function loadAll() {
    try {
      const list = await api(`/api/events?public=1&from=${encodeURIComponent(isoDaysAgo(st.days))}`);
      st.events.clear();
      absorb(list, false);
      render(); setLive(true);
    } catch { setLive(false); }
  }
  async function poll() {
    try {
      const list = await api(`/api/events?public=1&after_id=${st.maxId}`);
      if (list.length) { absorb(list, true); render(); }
      setLive(true);
    } catch { setLive(false); }
  }
  loadAll().then(() => {
    setInterval(poll, POLL_MS);
    setInterval(loadAll, 30000);   // riallinea i cambi di stato fatti dal Comune
  });
}

// ======================================================================
// Dashboard Comune "/comune"
// ======================================================================
function initComune() {
  const map = makeMap("map");
  const layer = L.layerGroup().addTo(map);
  const helmetLayer = L.layerGroup().addTo(map);
  const st = { events: new Map(), maxId: 0, markers: new Map(), sort: { key: "id", asc: false }, sig: "" };
  const tbody = document.querySelector("#events tbody");
  const filt = { type: document.getElementById("fType"), status: document.getElementById("fStatus"), source: document.getElementById("fSource") };

  for (const [t, i] of Object.entries(TYPES)) filt.type.insertAdjacentHTML("beforeend", `<option value="${t}">${esc(i.label)}</option>`);
  for (const s of STATUSES) filt.status.insertAdjacentHTML("beforeend", `<option value="${s}">${s}</option>`);
  Object.values(filt).forEach(f => f.addEventListener("change", renderAll));

  document.querySelectorAll("#events th[data-key]").forEach(th => th.addEventListener("click", () => {
    const k = th.dataset.key;
    st.sort = { key: k, asc: st.sort.key === k ? !st.sort.asc : false };
    renderTable();
  }));

  function passes(e) {
    return (!filt.type.value || e.type === filt.type.value)
      && (!filt.status.value || e.status === filt.status.value)
      && (!filt.source.value || e.source === filt.source.value);
  }

  function renderMap(fresh = new Set()) {
    layer.clearLayers(); st.markers.clear();
    for (const e of st.events.values()) {
      if (!passes(e)) continue;
      const m = eventMarker(e, fresh.has(e.id)).bindPopup(popupHtml(e, true)).addTo(layer);
      st.markers.set(e.id, m);
    }
  }

  function renderTable(fresh = new Set()) {
    const { key, asc } = st.sort;
    const rows = [...st.events.values()].filter(passes).sort((a, b) => {
      const va = key === "ts" ? new Date(a.ts).getTime() : a[key], vb = key === "ts" ? new Date(b.ts).getTime() : b[key];
      return (va < vb ? -1 : va > vb ? 1 : 0) * (asc ? 1 : -1);
    });
    document.querySelectorAll("#events th[data-key]").forEach(th => {
      th.classList.toggle("sorted", th.dataset.key === key); th.classList.toggle("asc", th.dataset.key === key && asc);
    });
    tbody.innerHTML = rows.map(e => `
      <tr data-id="${e.id}" class="${fresh.has(e.id) ? "new" : ""}">
        <td>${e.id}</td><td>${esc(fmtDate(e.ts))}</td>
        <td><span class="dot" style="background:${TYPES[e.type]?.color}"></span> ${esc(typeLabel(e.type))}</td>
        <td class="sev">${e.severity}</td>
        <td><select data-eid="${esc(e.event_id)}">${STATUSES.map(s => `<option${s === e.status ? " selected" : ""}>${s}</option>`).join("")}</select></td>
        <td>${sourceBadge(e)}</td>
        <td>${esc(ALARM_LABEL[e.alarm_state])}</td>
        <td>${esc(e.device_id)}</td>
      </tr>`).join("");
    document.getElementById("shown").textContent = `${rows.length} eventi`;
  }

  function renderAll(fresh) { renderMap(fresh); renderTable(fresh); }

  function focus(id) {
    const e = st.events.get(id), m = st.markers.get(id);
    if (!e) return;
    map.setView([e.lat, e.lon], 17);
    if (m) m.openPopup();
  }

  tbody.addEventListener("click", ev => {
    if (ev.target.tagName === "SELECT" || ev.target.tagName === "OPTION") return;
    const tr = ev.target.closest("tr");
    if (tr) focus(+tr.dataset.id);
  });
  tbody.addEventListener("change", async ev => {
    const sel = ev.target;
    if (sel.tagName !== "SELECT") return;
    try {
      const upd = await api(`/api/events/${encodeURIComponent(sel.dataset.eid)}`, { method: "PATCH", body: JSON.stringify({ status: sel.value }) });
      st.events.set(upd.id, upd);
      renderMap(); loadStats();
    } catch { alert("Cambio stato non riuscito: server non raggiungibile?"); }
  });

  async function loadAll() {
    try {
      const list = await api("/api/events");
      const sig = list.map(e => e.id + e.status).join("|");
      if (sig === st.sig) return;          // niente di cambiato: non ridisegno (non disturba chi sta usando la tabella)
      st.sig = sig;
      st.events = new Map(list.map(e => [e.id, e]));
      st.maxId = list.reduce((m, e) => Math.max(m, e.id), st.maxId);
      renderAll();
    } catch { setLive(false); }
  }
  async function poll() {
    try {
      const list = await api(`/api/events?after_id=${st.maxId}`);
      if (list.length) {
        const fresh = new Set();
        for (const e of list) { st.events.set(e.id, e); st.maxId = Math.max(st.maxId, e.id); fresh.add(e.id); toast(e); }
        st.sig = "";
        renderAll(fresh); loadStats();
      }
      setLive(true);
    } catch { setLive(false); }
  }

  async function loadStats() {
    try {
      const s = await api("/api/stats");
      document.getElementById("hot").innerHTML = s.top_hotspots.map(h =>
        `<li data-lat="${h.lat}" data-lon="${h.lon}">punteggio <b>${h.score}</b> · ${h.count} eventi <span class="note">(${h.lat.toFixed(4)}, ${h.lon.toFixed(4)})</span></li>`).join("")
        || "<li>nessun dato</li>";
      document.getElementById("byType").innerHTML = Object.entries(TYPES).map(([t, i]) =>
        `<div class="counter"><span class="dot" style="background:${i.color}"></span>${esc(i.label)}<span class="n">${s.by_type[t] || 0}</span></div>`).join("");
    } catch { /* lo segnala già il polling */ }
  }
  document.getElementById("hot").addEventListener("click", ev => {
    const li = ev.target.closest("li[data-lat]");
    if (li) map.setView([+li.dataset.lat, +li.dataset.lon], 17);
  });

  async function loadDevices() {
    try {
      const devs = await api("/api/devices");
      helmetLayer.clearLayers();
      document.getElementById("devices").innerHTML = devs.map(d => `
        <div class="device ${d.online ? "online" : ""}">
          <b>${esc(d.device_id)}</b> — ${d.online ? "ONLINE" : "offline"} (${d.seconds_ago}s fa)<br>
          MCU: ${d.mcu_ok ? esc(d.mcu_state ?? "ok") : "non risponde"} · IMU ${d.imu_hz ?? "–"} Hz · coda ${d.queue_len} · fw ${esc(d.fw ?? "–")}
        </div>`).join("") || '<div class="note">Nessun casco ha mai inviato heartbeat.</div>';
      for (const d of devs) {
        if (d.lat == null || d.lon == null) continue;
        L.marker([d.lat, d.lon], {
          icon: L.divIcon({ className: "helmet-icon" + (d.online ? "" : " offline"), html: "C", iconSize: [22, 22] }),
          zIndexOffset: 1000,
        }).bindTooltip(`${esc(d.device_id)} — posizione SIMULATA`).addTo(helmetLayer);
      }
    } catch { /* idem */ }
  }

  loadAll().then(() => {
    const f = +new URLSearchParams(location.search).get("focus");
    if (f) focus(f);
    loadStats(); loadDevices();
    setInterval(poll, POLL_MS);
    setInterval(loadDevices, POLL_MS);
    setInterval(loadAll, 20000);
  });
}

// ======================================================================
// Pannello "/emergenza": console di dispatch SIMULATA
// ======================================================================
const FALL_TYPES = ["CADUTA_DA_DISSESTO", "IMPATTO_VIOLENTO", "CADUTA_SENZA_CAUSA_RILEVATA"];
// Nota per tipo: la classificazione è indicativa, mai una diagnosi (SPEC §4)
const TYPE_NOTE = {
  IMPATTO_VIOLENTO: "Impatto compatibile con un urto, non accertato.",
  CADUTA_DA_DISSESTO: "Caduta preceduta da un urto (possibile buca o dissesto), non accertato.",
  CADUTA_SENZA_CAUSA_RILEVATA: "Caduta senza urto precedente rilevato (es. scivolata), causa non accertata.",
};
const STATUS_LABEL = { NUOVO: "Nuova", VERIFICATO: "Verificata", IN_LAVORAZIONE: "Presa in carico", RISOLTO: "Chiusa", FALSO_POSITIVO: "Falso positivo" };

function initEmergenza() {
  const st = { events: new Map(), maxId: 0, selected: null, unread: new Set(), days: 1, audio: null, map: null };
  const queueEl = document.getElementById("queue");
  const detail = document.getElementById("detail");
  const pad = n => String(n).padStart(2, "0");
  const fmtTime = ts => new Date(ts).toLocaleTimeString("it-IT");
  const fmtFull = ts => new Date(ts).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const isHigh = e => e.emergency === true;
  const prioBadge = e => isHigh(e) ? '<span class="prio alta">ALTA</span>' : '<span class="prio media">MEDIA</span>';
  const srcTag = e => e.source === "simulator" ? '<span class="srctag" title="Evento generato dal simulatore">SIM</span>'
    : e.source === "demo_seed" ? '<span class="srctag" title="Dato storico simulato">STORICO SIM.</span>' : "";

  function elapsed(ts) {
    let s = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    const t = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    return d ? `${d} g ${t}` : t;
  }

  // ---- avviso acustico: tono breve e discreto, al massimo 3 volte ----
  const audioBtn = document.getElementById("audioBtn");
  audioBtn.addEventListener("click", () => {
    const on = audioBtn.getAttribute("aria-pressed") !== "true";
    audioBtn.setAttribute("aria-pressed", String(on));
    audioBtn.textContent = "Avviso acustico: " + (on ? "attivo" : "disattivato");
    if (on) { st.audio = st.audio || new (window.AudioContext || window.webkitAudioContext)(); st.audio.resume(); tone(1); }
  });
  function tone(times) {
    if (!st.audio || audioBtn.getAttribute("aria-pressed") !== "true") return;
    const ctx = st.audio;
    for (let i = 0; i < Math.min(times, 3); i++) {
      const t0 = ctx.currentTime + i * 1.1;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 740;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.12, t0 + 0.02);
      g.gain.linearRampToValueAtTime(0, t0 + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(t0); o.stop(t0 + 0.2);
    }
  }

  // ---- coda ----
  const inRange = e => new Date(e.ts).getTime() >= Date.now() - st.days * 86400000;
  function renderQueue() {
    const list = [...st.events.values()].filter(inRange).sort((a, b) => new Date(b.ts) - new Date(a.ts));
    document.getElementById("qcount").textContent = list.length;
    queueEl.innerHTML = list.map(e => `
      <li><button class="q-item ${isHigh(e) ? "alta" : ""} ${st.selected === e.id ? "selected" : ""}" data-id="${e.id}"
          aria-current="${st.selected === e.id}">
        ${prioBadge(e)}
        <span class="q-time">${esc(fmtTime(e.ts))}</span>
        <span class="q-type">${esc(typeLabel(e.type))}</span>
        <span class="q-meta">${st.unread.has(e.id) ? '<span class="q-new">NUOVA · </span>' : ""}${esc(STATUS_LABEL[e.status] || e.status)} ${srcTag(e)}</span>
      </button></li>`).join("") || '<li class="d-empty">Nessuna segnalazione nel periodo.</li>';
  }
  queueEl.addEventListener("click", ev => {
    const b = ev.target.closest("button[data-id]");
    if (b) select(+b.dataset.id);
  });

  // ---- scheda della segnalazione ----
  function select(id) {
    st.selected = id; st.unread.delete(id);
    renderQueue(); renderDetail();
  }
  function alarmOutcome(e) {
    const s = e.features ? e.features.still_s : null;
    const still = s == null ? "—" : `${s} s`;
    if (e.alarm_state === "SENT") return `Allarme inviato automaticamente dopo ${still} di immobilità; non annullato dall'utente.`;
    if (e.alarm_state === "CANCELED") return `Allarme annullato dall'utente durante il conto alla rovescia (immobilità ${still}).`;
    if (e.alarm_state === "MOVEMENT_RESUMED") return `Allarme non inviato: la persona si è mossa dopo la caduta (immobilità ${still}).`;
    return "Nessun allarme.";
  }
  function renderDetail() {
    const e = st.events.get(st.selected);
    if (st.map) { st.map.remove(); st.map = null; }
    if (!e) { detail.innerHTML = '<p class="d-empty">Nessuna segnalazione selezionata.</p>'; return; }
    const f = e.features || {};
    const num = (v, u, dec = 1) => (v == null ? "—" : `${Number(v).toFixed(dec)} ${u}`);
    const pre = f.shock_to_impact_ms >= 0 ? `${num(f.shock_peak_g, "g")} · ${f.shock_to_impact_ms} ms prima` : "nessuno";
    const ns = e.lat >= 0 ? "N" : "S", ew = e.lon >= 0 ? "E" : "W";
    const source = e.source === "simulator" ? "<dd><b>Evento generato dal simulatore</b></dd>"
      : e.source === "demo_seed" ? "<dd><b>Dato storico simulato</b> (script di seed)</dd>" : "<dd>Casco (dispositivo reale)</dd>";
    detail.innerHTML = `
      <div class="d-title">${prioBadge(e)}<h2>${esc(typeLabel(e.type))}</h2>
        <span class="d-status">Stato: ${esc(STATUS_LABEL[e.status] || e.status)}</span>${srcTag(e)}</div>
      <p class="d-note">${esc(TYPE_NOTE[e.type] || "")} Classificazione automatica indicativa (${esc(e.classifier)}).</p>
      <div class="d-cols">
        <section class="d-section">
          <h3>Segnalazione</h3>
          <dl class="d-kv">
            <dt>ID evento</dt><dd class="mono">${esc(e.event_id)}</dd>
            <dt>Ora evento</dt><dd class="mono">${esc(fmtFull(e.ts))}</dd>
            <dt>Ora ricezione</dt><dd class="mono">${esc(fmtFull(e.received_at))}</dd>
            <dt>Tempo trascorso</dt><dd class="d-elapsed" id="elapsed">${elapsed(e.ts)}</dd>
          </dl>
        </section>
        <section class="d-section">
          <h3>Esito dell'allarme</h3>
          <p style="margin:0">${esc(alarmOutcome(e))}</p>
          <h3 style="margin-top:14px">Fonte</h3>
          <dl class="d-kv"><dt>Dispositivo</dt><dd class="mono">${esc(e.device_id)}</dd><dt>Origine</dt>${source}</dl>
        </section>
        <section class="d-section">
          <h3>Posizione (WGS84)</h3>
          <div class="d-coords">${Math.abs(e.lat).toFixed(6)}° ${ns}, ${Math.abs(e.lon).toFixed(6)}° ${ew}</div>
          <div class="note" style="color:var(--d-muted)">Posizione ${e.position_source === "simulated_route" ? "simulata (percorso predefinito, nessun GPS)" : esc(e.position_source)}
            · <a href="/comune?focus=${e.id}" target="_blank" style="color:var(--d-text)">apri nella dashboard Comune</a></div>
          <div id="minimap" class="d-minimap" role="img" aria-label="Mappa della posizione segnalata"></div>
        </section>
        <section class="d-section">
          <h3>Dati del sensore</h3>
          <table class="d-sensor">
            <tr><th scope="row">Picco impatto</th><td>${num(f.impact_peak_g, "g")}</td></tr>
            <tr><th scope="row">Rotazione della testa</th><td>${num(f.rotation_deg, "°", 0)}</td></tr>
            <tr><th scope="row">Immobilità misurata</th><td>${num(f.still_s, "s")}</td></tr>
            <tr><th scope="row">Urto precedente</th><td>${esc(pre)}</td></tr>
          </table>
          <div class="d-actions">
            <button class="act" id="takeBtn" ${["IN_LAVORAZIONE", "RISOLTO"].includes(e.status) ? "disabled" : ""}>Presa in carico</button>
            <button id="closeBtn" ${e.status === "RISOLTO" ? "disabled" : ""}>Chiudi</button>
          </div>
        </section>
      </div>`;
    st.map = L.map("minimap").setView([e.lat, e.lon], 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(st.map);
    L.marker([e.lat, e.lon]).addTo(st.map);
    document.getElementById("takeBtn").onclick = () => setStatus(e, "IN_LAVORAZIONE");
    document.getElementById("closeBtn").onclick = () => setStatus(e, "RISOLTO");
  }
  async function setStatus(e, status) {
    try {
      const upd = await api(`/api/events/${encodeURIComponent(e.event_id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
      st.events.set(upd.id, upd);
      renderQueue(); renderDetail();
    } catch { alert("Cambio stato non riuscito: server non raggiungibile?"); }
  }

  // ---- dati ----
  const typeParam = `type=${FALL_TYPES.join(",")}`;
  async function loadAll() {
    try {
      const list = await api(`/api/events?${typeParam}`);
      const sel = st.events.get(st.selected);
      st.events = new Map(list.map(e => [e.id, e]));
      st.maxId = list.reduce((m, e) => Math.max(m, e.id), st.maxId);
      renderQueue();
      const now = st.events.get(st.selected);
      if (sel && now && sel.status !== now.status) renderDetail();   // ridisegno la scheda solo se è cambiato lo stato
      setLive(true);
    } catch { setLive(false); }
  }
  async function poll() {
    try {
      const list = await api(`/api/events?${typeParam}&after_id=${st.maxId}`);
      let high = null;
      for (const e of list) {
        st.maxId = Math.max(st.maxId, e.id);
        st.events.set(e.id, e);
        st.unread.add(e.id);
        if (e.emergency) high = e;
      }
      if (high) { tone(3); select(high.id); }        // priorità alta: tono discreto e scheda in primo piano
      else if (list.length) renderQueue();
      setLive(true);
    } catch { setLive(false); }
  }
  document.getElementById("range").addEventListener("change", ev => { st.days = +ev.target.value; renderQueue(); });

  setInterval(() => {
    document.getElementById("clock").textContent = new Date().toLocaleTimeString("it-IT");
    const el = document.getElementById("elapsed"), e = st.events.get(st.selected);
    if (el && e) el.textContent = elapsed(e.ts);
  }, 1000);

  loadAll().then(() => {
    // all'apertura seleziono la segnalazione ad alta priorità più recente ancora aperta
    const open = [...st.events.values()]
      .filter(e => isHigh(e) && inRange(e) && !["RISOLTO", "FALSO_POSITIVO"].includes(e.status))
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
    if (open) select(open.id);
    setInterval(poll, POLL_MS);
    setInterval(loadAll, 20000);   // riallinea i cambi di stato fatti da /comune
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "public") initPublic();
  else if (page === "comune") initComune();
  else if (page === "emergenza") initEmergenza();
});
