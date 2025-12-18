const API_URL = '/api/delay';
const delayValueEl = document.getElementById('delay-value');
const slider = document.getElementById('delay-slider');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');

// Clamp helper
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// Fetch current delay on load
async function loadCurrentDelay() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const delay = clamp(data.delay, 500, 5000);
    delayValueEl.textContent = delay;
    slider.value = delay;
  } catch (err) {
    console.error('Failed to load delay:', err);
  }
}

// Update delay via API
async function updateDelay(newDelay) {
  const clamped = clamp(newDelay, 500, 5000);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delay: clamped })
    });
    if (res.ok) {
      delayValueEl.textContent = clamped;
      slider.value = clamped;
    }
  } catch (err) {
    console.error('Failed to update delay:', err);
  }
}

// Event listeners
slider.addEventListener('input', () => updateDelay(slider.valueAsNumber));
decreaseBtn.addEventListener('click', () => updateDelay(slider.valueAsNumber - 100));
increaseBtn.addEventListener('click', () => updateDelay(slider.valueAsNumber + 100));

// Initialize
document.addEventListener('DOMContentLoaded', loadCurrentDelay);