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


// ... (all code above remains the same until bindNav)

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
        // Show main dashboard cards
        const tempCard = document.getElementById("tempCard");
        const humCard = document.getElementById("humCard");
        const settingsCard = document.getElementById("settingsCard");

        if (tempCard) tempCard.style.display = "block";
        if (humCard) humCard.style.display = "block";
        if (settingsCard) settingsCard.style.display = "block";

        document.querySelector('.main').scrollTo(0, 0);
      } else if (section === "history") {
        const historySection = document.getElementById("historySection");
        if (historySection) {
          historySection.style.display = "block";
          refreshHistoryFull();

          const refreshBtn = document.getElementById("refreshHistoryBtn");
          const clearBtn = document.getElementById("clearUiBtn");

          if (refreshBtn) {
            refreshBtn.onclick = refreshHistoryFull;
          }
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
        // Handle temperature, humidity, settings
        const map = {
          temperature: "tempCard",
          humidity: "humCard",
          settings: "settingsCard",
        };
        const targetId = map[section];
        const target = document.getElementById(targetId);
        if (target) {
          target.style.display = "block";
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });
}

// ... (rest unchanged until init)

// ------------------------------
// 10. INIT
// ------------------------------
(function init() {
  console.log("🚀 ClimateCloud Dashboard initializing...");

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

  // ✅ Auto-click Dashboard AFTER DOM is ready
  const dashboardBtn = document.querySelector('.nav-item[data-section="dashboard"]');
  if (dashboardBtn) {
    dashboardBtn.click();
  }
})();