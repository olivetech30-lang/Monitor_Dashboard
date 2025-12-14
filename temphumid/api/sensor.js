// api/sensor.js (CommonJS)
const { getStore, addHistoryPoint } = require("./_store");

function isNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Vercel usually parses JSON into req.body if Content-Type is application/json.
    // But to be robust, parse string bodies too.
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const temperature = body.temperature;
    const humidity = body.humidity;
    const deviceId = typeof body.deviceId === "string" ? body.deviceId : "esp32-s3";
    const nowIso = new Date().toISOString();

    if (!isNumber(temperature) || !isNumber(humidity)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid payload. Expected { temperature: number, humidity: number }",
        got: body
      });
    }

    const store = getStore();
    const prevT = store.latest.temperature;
    const prevH = store.latest.humidity;

    store.latest = { temperature, humidity, timestamp: nowIso, deviceId };

    const changed =
      prevT === null || prevH === null || prevT !== temperature || prevH !== humidity;

    if (changed) {
      addHistoryPoint({ timestamp: nowIso, temperature, humidity, deviceId });
    }

    return res.status(200).json({ ok: true, changed, latest: store.latest });
  } catch (err) {
    // Return the message so you can see it in the ESP32 response body too
    return res.status(500).json({ ok: false, error: "Server error", message: String(err?.message || err) });
  }
};