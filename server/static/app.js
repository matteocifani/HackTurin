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
function setLive(ok) {
  const el = document.getElementById("live");
  if (!el) return;
  el.className = "live " + (ok ? "ok" : "ko");
  el.textContent = ok ? "aggiornato " + new Date().toLocaleTimeString("it-IT") : "server non raggiungibile";
}
function isoDaysAgo(days) { return new Date(Date.now() - days * 86400000).toISOString(); }

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
  return L.circleMarker([e.lat, e.lon], {
    radius: 4 + e.severity,
    color: sim ? "#444" : "#fff",
    weight: sim ? 1 : 2,
    dashArray: sim ? "2 2" : null,
    fillColor: (TYPES[e.type] || {}).color || "#888",
    fillOpacity: sim ? 0.5 : 0.95,
    className: pulse ? "pulse" : "",
  });
}

function popupHtml(e, full) {
  const src = isSim(e) ? '<span class="badge sim">dato SIMULATO</span>' : '<span class="badge helmet">casco</span>';
  let html = `<b>${esc(typeLabel(e.type))}</b> ${src}<br>${esc(fmtDate(e.ts))} · severità ${e.severity}/5`;
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
      if (markFresh) { st.fresh.add(e.id); setTimeout(() => { st.fresh.delete(e.id); }, 4000); }
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
        <td>${e.source === "demo_seed" ? '<span class="badge sim">SIMULATO</span>' : '<span class="badge helmet">casco</span>'}</td>
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
        for (const e of list) { st.events.set(e.id, e); st.maxId = Math.max(st.maxId, e.id); fresh.add(e.id); }
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
// Pannello "112 SIMULATO" "/emergenza"
// ======================================================================
function initEmergenza() {
  const st = { maxId: 0, audio: null, beepTimer: null, current: null };
  const overlay = document.getElementById("overlay");
  const list = document.getElementById("list");

  function listItem(e) {
    return `<div class="item"><b>${esc(typeLabel(e.type))}</b> — ${esc(fmtDate(e.ts))} — ${e.lat.toFixed(5)}, ${e.lon.toFixed(5)}
      — ${esc(e.device_id)} ${isSim(e) ? '<span class="badge sim">dato SIMULATO</span>' : ""} — stato ${esc(e.status)}</div>`;
  }

  function beep() {
    if (!st.audio) return;
    const ctx = st.audio;
    [0, 0.45, 0.9, 1.35].forEach((t, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = i % 2 ? 660 : 880;
      g.gain.value = 0.25;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.35);
    });
  }
  document.getElementById("audioBtn").addEventListener("click", ev => {
    st.audio = st.audio || new (window.AudioContext || window.webkitAudioContext)();
    st.audio.resume();
    beep();
    ev.target.textContent = "Audio attivo ✓";
  });

  function show(e) {
    st.current = e;
    const f = e.features || {};
    const val = (v, u) => (v === undefined || v === null ? "–" : `${v} ${u}`);
    document.getElementById("card").innerHTML = `
      <div class="fixed">SIMULAZIONE — nessuna chiamata reale al 112</div>
      <h2>🚨 ${esc(typeLabel(e.type))}</h2>
      <div style="font-size:20px">Persona immobile dopo la caduta, allarme non annullato.</div>
      <div class="grid">
        <div>Ora evento</div><div>${esc(new Date(e.ts).toLocaleString("it-IT"))}</div>
        <div>Coordinate</div><div>${e.lat.toFixed(5)}, ${e.lon.toFixed(5)} — posizione ${e.position_source === "simulated_route" ? "SIMULATA" : esc(e.position_source)}<br>
          <a href="/comune?focus=${e.id}" target="_blank">apri sulla mappa del Comune</a></div>
        <div>Dispositivo</div><div>${esc(e.device_id)} ${isSim(e) ? "(dato SIMULATO)" : ""}</div>
        <div>Picco impatto</div><div>${val(f.impact_peak_g, "g")}</div>
        <div>Rotazione testa</div><div>${val(f.rotation_deg, "°")}</div>
        <div>Immobilità</div><div>${val(f.still_s, "s")}</div>
        <div>Urto precedente</div><div>${f.shock_to_impact_ms >= 0 ? `${val(f.shock_peak_g, "g")}, ${f.shock_to_impact_ms} ms prima` : "nessuno"}</div>
        <div>Classificazione</div><div>${esc(e.classifier)} (indicativa)</div>
      </div>
      <button id="ackBtn">Presa in carico</button> <button id="closeBtn">Chiudi</button>`;
    overlay.classList.remove("show"); void overlay.offsetWidth; overlay.classList.add("show");
    clearInterval(st.beepTimer);
    beep(); st.beepTimer = setInterval(beep, 4000);
    document.getElementById("closeBtn").onclick = hide;
    document.getElementById("ackBtn").onclick = async () => {
      try { await api(`/api/events/${encodeURIComponent(e.event_id)}`, { method: "PATCH", body: JSON.stringify({ status: "IN_LAVORAZIONE" }) }); } catch { }
      hide();
    };
  }
  function hide() { overlay.classList.remove("show"); clearInterval(st.beepTimer); }

  async function init() {
    try {
      const em = await api("/api/emergencies?limit=5000");
      st.maxId = em.reduce((m, e) => Math.max(m, e.id), 0);   // le emergenze già presenti non fanno scattare l'allarme
      list.innerHTML = em.slice(-10).reverse().map(listItem).join("") || '<div class="note">Nessuna emergenza registrata.</div>';
      setLive(true);
    } catch { setLive(false); }
  }
  async function poll() {
    try {
      const em = await api(`/api/emergencies?after_id=${st.maxId}`);
      for (const e of em) {
        st.maxId = Math.max(st.maxId, e.id);
        list.insertAdjacentHTML("afterbegin", listItem(e));
        show(e);
      }
      setLive(true);
    } catch { setLive(false); }
  }
  init().then(() => setInterval(poll, POLL_MS));
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "public") initPublic();
  else if (page === "comune") initComune();
  else if (page === "emergenza") initEmergenza();
});
