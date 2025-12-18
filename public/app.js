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
// 6. REFRESH HISTORY (FULL TABLE)
// ------------------------------
async function refreshHistoryFull() {
  try {
    const res = await fetch('/api/history');
    const rows = await res.json();
    const tbody = document.getElementById('historyBodyFull');
    const countEl = document.getElementById('historyCountFull');

    if (!rows?.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="muted">No change events recorded yet.</td></tr>`;
      countEl.textContent = '0';
      return;
    }

    countEl.textContent = rows.length;
    tbody.innerHTML = rows
      .reverse()
      .map(r => `
        <tr>
          <td>${fmtTs(r.recorded_at)}</td>
          <td>${fmtNum(r.temperature, 1)}</td>
          <td>${fmtNum(r.humidity, 1)}</td>
        </tr>
      `)
      .join('');
  } catch (e) {
    console.error('History fetch failed:', e);
    const tbody = document.getElementById('historyBodyFull');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="3" class="muted">Failed to load history</td></tr>`;
    }
  }
}

// ------------------------------
// 7. NAVIGATION HANDLER (SPA)
// ------------------------------
function bindNav() {
  els.navItems.forEach(btn => {
    btn.addEventListener("click", () => {
      // Update active nav
      els.navItems.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Hide all sections
      const allSections = ["tempCard", "humCard", "settingsCard", "historySection"];
      allSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });

      // Show selected section
      const section = btn.dataset.section;

      if (section === "dashboard") {
        // Show main dashboard
        const tempCard = document.getElementById("tempCard");
        const humCard = document.getElementById("humCard");
        const settingsCard = document.getElementById("settingsCard");
        if (tempCard) tempCard.style.display = "block";
        if (humCard) humCard.style.display = "block";
        if (settingsCard) settingsCard.style.display = "block";
        document.querySelector('.main').scrollTo(0, 0);
      } else if (section === "history") {
        // Show history
        const historySection = document.getElementById("historySection");
        if (historySection) {
          historySection.style.display = "block";
          refreshHistoryFull();

          const refreshBtn = document.getElementById("refreshHistoryBtn");
          const clearBtn = document.getElementById("clearUiBtn");
          if (refreshBtn) refreshBtn.onclick = refreshHistoryFull;
          if (clearBtn) {
            clearBtn.onclick = () => {
              const tbody = document.getElementById("historyBodyFull");
              if (tbody) {
                tbody.innerHTML = `<tr><td colspan="3" class="muted">Cleared.</td></tr>`;
              }
            };
          }
        }
      } else {
        // Show single card (temp/hum/settings)
        const map = {
          temperature: "tempCard",
          humidity: "humCard",
          settings: "settingsCard",
        };
        const target = document.getElementById(map[section]);
        if (target) {
          target.style.display = "block";
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });
}

// ------------------------------
// 8. SETTINGS HANDLER
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
// 9. POLLING
// ------------------------------
let pollTimer = null;
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  refreshLatest();
  pollTimer = setInterval(refreshLatest, pollIntervalMs);
}

// ------------------------------
// 10. INIT
// ------------------------------
(function init() {
  console.log("🚀 ClimateCloud Dashboard initializing...");

  // ✅ ONLY require elements that ALWAYS exist
  const requiredElements = [
    "statusPill", "tempValue", "humValue", "tempTs", "humTs"
  ];

  const missing = requiredElements.filter(id => !document.getElementById(id));
  if (missing.length > 0) {
    console.error("❌ Missing elements:", missing);
    return;
  }

  bindNav();
  bindSettings();
  setStatus("warn", "● Connecting");
  startPolling();

  // Auto-open Dashboard on load
  const dashboardBtn = document.querySelector('.nav-item[data-section="dashboard"]');
  if (dashboardBtn) dashboardBtn.click();
})();

// ------------------------------
// FLASH CONTROLLER
// ------------------------------

const flashEls = {
  delayValue: document.getElementById("flashDelay"),
  status: document.getElementById("flashStatus"),
  slider: document.getElementById("delaySlider"),
  fasterBtn: document.getElementById("fasterBtn"),
  slowerBtn: document.getElementById("slowerBtn"),
};

const MIN_DELAY = 50;
const MAX_DELAY = 2000;
let flashDelay = 500;

function updateFlashController(delay) {
  flashDelay = delay;
  if (flashEls.delayValue) flashEls.delayValue.textContent = delay;
  if (flashEls.slider) flashEls.slider.value = delay;
}

// Poll for delay changes
async function pollFlashDelay() {
  try {
    const res = await fetch('/api/delay');
    const data = await res.json();
    updateFlashController(data.delay || 500);
    if (flashEls.status) flashEls.status.textContent = "Connected";
  } catch (e) {
    if (flashEls.status) flashEls.status.textContent = "Disconnected";
  }
}

// Handle slider changes
if (flashEls.slider) {
  flashEls.slider.addEventListener('input', async () => {
    const newDelay = parseInt(flashEls.slider.value);
    updateFlashController(newDelay);
    try {
      await fetch('/api/delay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delay: newDelay })
      });
      if (flashEls.status) flashEls.status.textContent = "Connected";
    } catch (e) {
      if (flashEls.status) flashEls.status.textContent = "Error";
    }
  });
}

// Handle button clicks
if (flashEls.fasterBtn) {
  flashEls.fasterBtn.addEventListener('click', () => {
    const newDelay = Math.max(MIN_DELAY, flashDelay - 50);
    updateFlashController(newDelay);

    
    fetch('/api/delay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delay: newDelay })
    });
  });
}

if (flashEls.slowerBtn) {
  flashEls.slowerBtn.addEventListener('click', () => {
    const newDelay = Math.min(MAX_DELAY, flashDelay + 50);
    updateFlashController(newDelay);
    fetch('/api/delay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delay: newDelay })
    });
  });
}

// Handle preset buttons
document.querySelectorAll('.btn[data-delay]').forEach(btn => {
  btn.addEventListener('click', () => {
    const delay = parseInt(btn.dataset.delay);
    updateFlashController(delay);
    fetch('/api/delay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delay })
    });
  });
});

// Start polling
setInterval(pollFlashDelay, 3000);




