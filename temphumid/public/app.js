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

// ------------------------------
// 1. UTILITY FUNCTIONS
// ------------------------------
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

// ------------------------------
// 2. STATUS UPDATER
// ------------------------------
function setStatus(state, text) {
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

// ------------------------------
// 3. API FETCH WITH ERROR HANDLING
// ------------------------------
async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`📡 ${url} response:`, data); // DEBUG LOG
    return data;
  } catch (e) {
    console.error(`❌ Fetch error (${url}):`, e);
    throw e;
  }
}

// ------------------------------
// 4. RENDER LATEST DATA (FIXED)
// ------------------------------
function renderLatest(latest) {
  // Handle cases where `latest` might be undefined/null
  const t = latest?.temperature ?? null;
  const h = latest?.humidity ?? null;
  const ts = latest?.timestamp ?? null;

  // Update DOM elements safely
  if (els.tempValue) els.tempValue.textContent = fmtNum(t, 1);
  if (els.humValue) els.humValue.textContent = fmtNum(h, 1);
  if (els.tempTs) els.tempTs.textContent = fmtTs(ts);
  if (els.humTs) els.humTs.textContent = fmtTs(ts);
}

// ------------------------------
// 5. RENDER HISTORY (FIXED)
// ------------------------------
function renderHistory(rows) {
  if (els.historyCount) els.historyCount.textContent = String(rows.length);

  if (!rows?.length) {
    if (els.historyBody) {
      els.historyBody.innerHTML = `
        <tr>
          <td colspan="3" class="muted">No change events yet.</td>
        </tr>
      `;
    }
    return;
  }

  // Always show newest entries first (API returns oldest-first)
  const reversedRows = [...rows].reverse();
  const html = reversedRows
    .map(r => `
      <tr>
        <td>${fmtTs(r.timestamp)}</td>
        <td>${fmtNum(r.temperature, 1)}</td>
        <td>${fmtNum(r.humidity, 1)}</td>
      </tr>
    `)
    .join("");

  if (els.historyBody) els.historyBody.innerHTML = html;
}

// ------------------------------
// 6. REFRESH LATEST DATA (CRITICAL FIX)
// ------------------------------
async function refreshLatest() {
  try {
    const data = await fetchJson("/api/latest");
    
    // ⚠️ API NOW RETURNS { ok, changed, latest: { ... } }
    const latest = data.latest; 

    // Status handling
    if (!latest?.timestamp) {
      setStatus("warn", "● Waiting for sensor");
      renderLatest(null); // Pass null to clear values
      return;
    }

    renderLatest(latest);

    // Track new data for history refresh
    if (latestSeenTs !== latest.timestamp) {
      latestSeenTs = latest.timestamp;
      setStatus("ok", `● Live (${fmtNum(latest.temperature, 1)}°C)`);
      await refreshHistory(); // Refresh history on new data
    } else {
      setStatus("ok", "● Live");
    }
  } catch (e) {
    setStatus("bad", "● Offline");
  }
}

// ------------------------------
// 7. REFRESH HISTORY
// ------------------------------
async function refreshHistory() {
  try {
    const data = await fetchJson(`/api/history?limit=${encodeURIComponent(historyLimit)}`);
    renderHistory(Array.isArray(data.history) ? data.history : []);
  } catch (e) {
    console.warn("History refresh skipped:", e);
  }
}

// ------------------------------
// 8. NAVIGATION HANDLER
// ------------------------------
function bindNav() {
  if (!els.navItems) return;

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
      const targetId = map[section];
      const target = document.getElementById(targetId);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ------------------------------
// 9. CONTROL HANDLERS
// ------------------------------
function bindControls() {
  if (els.refreshBtn) {
    els.refreshBtn.addEventListener("click", refreshHistory);
  }
  if (els.clearUiBtn) {
    els.clearUiBtn.addEventListener("click", () => {
      if (els.historyBody) renderHistory([]);
      setStatus("warn", "● Cleared");
    });
  }

  if (els.applyBtn) {
    els.applyBtn.addEventListener("click", () => {
      const ms = Number(els.pollMs?.value);
      const lim = Number(els.historyLimit?.value);

      if (ms >= 500) pollIntervalMs = ms;
      if (lim >= 10) historyLimit = lim;

      startPolling();
      setStatus("ok", "● Settings applied");
    });
  }
}

// ------------------------------
// 10. POLLING LOGIC
// ------------------------------
let pollTimer = null;
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  refreshLatest(); // Immediate refresh
  pollTimer = setInterval(refreshLatest, pollIntervalMs);
}

// ------------------------------
// 11. INITIALIZATION
// ------------------------------
(function init() {
  console.log("🚀 Application initializing...");

  // Validate critical DOM elements
  const requiredElements = [
    "statusPill", "tempValue", "humValue",
    "tempTs", "humTs", "historyBody"
  ];
  const missing = requiredElements.filter(id => !document.getElementById(id));
  
  if (missing.length > 0) {
    console.error("❌ Missing critical elements:", missing);
    return; // Stop if UI is broken
  }

  bindNav();
  bindControls();
  setStatus("warn", "● Connecting");
  startPolling();
})();
