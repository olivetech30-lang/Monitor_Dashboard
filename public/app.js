const els = {
  statusPill: document.getElementById("statusPill"),
  tempValue: document.getElementById("tempValue"),
  humValue: document.getElementById("humValue"),
  tempTs: document.getElementById("tempTs"),
  humTs: document.getElementById("humTs"),
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
// 3. API FETCH
// ------------------------------
async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// ------------------------------
// 4. RENDER LATEST DATA
// ------------------------------
function renderLatest(latest) {
  if (!latest) {
    els.tempValue.textContent = "-- °C";
    els.humValue.textContent = "-- %";
    els.tempTs.textContent = "—";
    els.humTs.textContent = "—";
    return;
  }

  const ts = latest.recorded_at || latest.timestamp;
  els.tempValue.textContent = fmtNum(latest.temperature, 1) + " °C";
  els.humValue.textContent = fmtNum(latest.humidity, 1) + " %";
  els.tempTs.textContent = fmtTs(ts);
  els.humTs.textContent = fmtTs(ts);
}

// ------------------------------
// 5. REFRESH LATEST DATA
// ------------------------------
async function refreshLatest() {
  try {
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
    } else {
      setStatus("ok", "● Live");
    }
  } catch (e) {
    setStatus("bad", "● Offline");
    renderLatest(null);
  }
}

// ------------------------------
// 6. NAVIGATION HANDLER
// ------------------------------
function bindNav() {
  els.navItems.forEach(btn => {
    btn.addEventListener("click", () => {
      // Update active state
      els.navItems.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const section = btn.dataset.section;

      // Handle History: open new tab
      if (section === "history") {
        window.open('/history.html', 'climatecloud_history', 'width=1000,height=700');
        return;
      }

      // Handle other sections
      const sectionMap = {
        temperature: "tempCard",
        humidity: "humCard",
        settings: "settingsCard",
      };

      const targetId = sectionMap[section];
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

// ------------------------------
// 7. SETTINGS HANDLER
// ------------------------------
function bindSettings() {
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
// 8. POLLING
// ------------------------------
let pollTimer = null;
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  refreshLatest();
  pollTimer = setInterval(refreshLatest, pollIntervalMs);
}

// ------------------------------
// 9. INIT
// ------------------------------
(function init() {
  console.log("🚀 ClimateCloud Dashboard initializing...");

  // Only require elements that always exist
  const requiredElements = [
    "statusPill", "tempValue", "humValue",
    "tempTs", "humTs"
  ];

  const missing = requiredElements.filter(id => !document.getElementById(id));
  if (missing.length > 0) {
    console.error("❌ Missing critical elements:", missing);
    return;
  }

  bindNav();
  bindSettings();
  setStatus("warn", "● Connecting");
  startPolling();
})();