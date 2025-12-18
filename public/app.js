

const els = {
  statusPill: document.getElementById("statusPill"),
  tempValue: document.getElementById("tempValue"),
  humValue: document.getElementById("humValue"),
  tempTs: document.getElementById("tempTs"),
  humTs: document.getElementById("humTs"),
 // historyBody: document.getElementById("historyBody"),
 // historyCount: document.getElementById("historyCount"),
 // refreshBtn: document.getElementById("refreshBtn"),
  //clearUiBtn: document.getElementById("clearUiBtn"),
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
    console.log(`📡 ${url} response:`, data);
    return data;
  } catch (e) {
    console.error(`❌ Fetch error (${url}):`, e);
    throw e;
  }
}

// ------------------------------
// 4. RENDER LATEST DATA
// ------------------------------
function renderLatest(latest) {
  if (!latest) {
    if (els.tempValue) els.tempValue.textContent = "--";
    if (els.humValue) els.humValue.textContent = "--";
    if (els.tempTs) els.tempTs.textContent = "—";
    if (els.humTs) els.humTs.textContent = "—";
    return;
  }

  // Use recorded_at (your actual column name)
  const ts = latest.recorded_at || latest.timestamp;
  const t = latest.temperature;
  const h = latest.humidity;

  if (els.tempValue) els.tempValue.textContent = fmtNum(t, 1) + " °C";
  if (els.humValue) els.humValue.textContent = fmtNum(h, 1) + " %";
  if (els.tempTs) els.tempTs.textContent = fmtTs(ts);
  if (els.humTs) els.humTs.textContent = fmtTs(ts);
}


// 6. REFRESH LATEST DATA (FIXED)
// ------------------------------
async function refreshLatest() {
  try {
    // ✅ Your API returns flat object — no .latest wrapper
    const latest = await fetchJson("/api/latest");

    if (!latest?.recorded_at) {
      setStatus("warn", "● Waiting for sensor");
      renderLatest(null);
      return;
    }

    renderLatest(latest);

    if (latestSeenTs !== latest.recorded_at) {
      latestSeenTs = latest.recorded_at;
      setStatus("ok", `● Live (${fmtNum(latest.temperature, 1)}°C)`);
    //  await refreshHistory();
    } else {
      setStatus("ok", "● Live");
    }
  } catch (e) {
    setStatus("bad", "● Offline");
  }
}


// ------------------------------
// 8. NAVIGATION HANDLER (UPDATED)
// ------------------------------
function bindNav() {
  // Handle main sections (Temp/Humidity/Settings)
  els.navItems.forEach(btn => {
    if (btn.dataset.section) {
      btn.addEventListener("click", () => {
        els.navItems.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const section = btn.dataset.section;
        const map = {
          temperature: "tempCard",
          humidity: "humCard",
          settings: "settingsCard",
        };
        const targetId = map[section];
        const target = document.getElementById(targetId);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  });

  // Handle "History" button (opens new window)
  const historyBtn = document.getElementById("openHistoryBtn");
  if (historyBtn) {
    historyBtn.addEventListener("click", () => {
      // Remove active from all
      els.navItems.forEach(b => b.classList.remove("active"));
      historyBtn.classList.add("active");
      
      // Open history in new tab
      window.open('/history.html', 'climatecloud_history', 'width=1000,height=700');
    });
  }
}

// ------------------------------
// 10. POLLING LOGIC
// ------------------------------
let pollTimer = null;
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  refreshLatest();
  pollTimer = setInterval(refreshLatest, pollIntervalMs);
}

// ------------------------------
// 11. INITIALIZATION
// ------------------------------
(function init() {
  console.log("🚀 ClimateCloud Dashboard initializing...");

  const requiredElements = [
    "statusPill", "tempValue", "humValue",
    "tempTs", "humTs", "historyBody"
  ];
  const missing = requiredElements.filter(id => !document.getElementById(id));
  
  if (missing.length > 0) {
    console.error("❌ Missing critical elements:", missing);
    return;
  }

  bindNav();
  bindControls();
  setStatus("warn", "● Connecting");
  startPolling();
})();
