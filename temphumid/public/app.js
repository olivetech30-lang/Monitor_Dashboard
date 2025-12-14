const els = {
  statusPill: document.getElementById("statusPill"),
  tempValue: document.getElementById("tempValue"),
  humValue: document.getElementById("humValue"),
  tempTs: document.getElementById("tempTs"),
  humTs: document.getElementById("humTs"),
  historyBody: document.getElementById("historyBody"),
  historyCount: document.getElementById("historyCount"),
  refreshBtn: document.getElementById("refreshBtn"),
  clearUiBtn: document.getElementById("clearUiBtn"),
  pollMs: document.getElementById("pollMs"),
  historyLimit: document.getElementById("historyLimit"),
  applyBtn: document.getElementById("applyBtn"),
  navItems: Array.from(document.querySelectorAll(".nav-item")),
};

let pollIntervalMs = 2000;
let historyLimit = 200;
let latestSeenTs = null;

function fmtNum(n, digits = 1) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "--";
  return n.toFixed(digits);
}

function fmtTs(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function setStatus(state, text) {
  // state: ok | warn | bad
  const colors = {
    ok: "rgba(77,214,165,0.18)",
    warn: "rgba(255,211,106,0.14)",
    bad: "rgba(255,107,107,0.14)",
  };
  els.statusPill.textContent = text;
  els.statusPill.style.background = colors[state] || "rgba(255,255,255,0.06)";
  els.statusPill.style.color = "rgba(255,255,255,0.80)";
  els.statusPill.style.borderColor = "rgba(255,255,255,0.16)";
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderLatest(latest) {
  const t = latest?.temperature;
  const h = latest?.humidity;
  const ts = latest?.timestamp;

  els.tempValue.textContent = fmtNum(t, 1);
  els.humValue.textContent = fmtNum(h, 1);
  els.tempTs.textContent = fmtTs(ts);
  els.humTs.textContent = fmtTs(ts);
}

function renderHistory(rows) {
  els.historyCount.textContent = String(rows.length);

  if (!rows.length) {
    els.historyBody.innerHTML = `
      <tr>
        <td colspan="3" class="muted">No change events yet.</td>
      </tr>
    `;
    return;
  }

  // newest first
  const html = rows
    .slice()
    .reverse()
    .map(r => `
      <tr>
        <td>${fmtTs(r.timestamp)}</td>
        <td>${fmtNum(r.temperature, 1)}</td>
        <td>${fmtNum(r.humidity, 1)}</td>
      </tr>
    `)
    .join("");

  els.historyBody.innerHTML = html;
}

async function refreshLatest() {
  try {
    const data = await fetchJson("/api/latest");
    const latest = data.latest;

    // status
    if (!latest?.timestamp) {
      setStatus("warn", "● Waiting for sensor");
      renderLatest(latest);
      return;
    }

    renderLatest(latest);

    // If latest timestamp changed, optionally refresh history
    if (latestSeenTs !== latest.timestamp) {
      latestSeenTs = latest.timestamp;
      setStatus("ok", "● Live");
      // lightweight: only refresh history when something new arrives
      await refreshHistory();
    } else {
      setStatus("ok", "● Live");
    }
  } catch (e) {
    setStatus("bad", "● Offline");
  }
}

async function refreshHistory() {
  try {
    const data = await fetchJson(`/api/history?limit=${encodeURIComponent(historyLimit)}`);
    renderHistory(Array.isArray(data.history) ? data.history : []);
  } catch {
    // ignore
  }
}

function bindNav() {
  els.navItems.forEach(btn => {
    btn.addEventListener("click", () => {
      els.navItems.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const section = btn.dataset.section;
      const map = {
        temperature: "tempCard",
        humidity: "humCard",
        data: "dataCard",
        settings: "settingsCard",
      };
      const id = map[section];
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function bindControls() {
  els.refreshBtn.addEventListener("click", refreshHistory);
  els.clearUiBtn.addEventListener("click", () => renderHistory([]));

  els.applyBtn.addEventListener("click", () => {
    const ms = Number(els.pollMs.value);
    const lim = Number(els.historyLimit.value);

    if (Number.isFinite(ms) && ms >= 500) pollIntervalMs = ms;
    if (Number.isFinite(lim) && lim >= 10) historyLimit = lim;

    startPolling();
  });
}

let pollTimer = null;
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  // immediate refresh
  refreshLatest();
  pollTimer = setInterval(refreshLatest, pollIntervalMs);
}

(function init() {
  bindNav();
  bindControls();
  setStatus("warn", "● Connecting");
  startPolling();
})();