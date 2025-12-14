// api/sensor.js
import { getStore, addHistoryPoint } from "./_store.js";

function isNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body ?? {};
    const temperature = body.temperature;
    const humidity = body.humidity;
    const deviceId = typeof body.deviceId === "string" ? body.deviceId : "esp32-s3";
    const nowIso = new Date().toISOString();

    if (!isNumber(temperature) || !isNumber(humidity)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid payload. Expected JSON: { temperature: number, humidity: number }",
      });
    }

    const store = getStore();
    const prevT = store.latest.temperature;
    const prevH = store.latest.humidity;

    // Update latest always
    store.latest = { temperature, humidity, timestamp: nowIso, deviceId };

    // Log only on change (including first value)
    const changed = prevT === null || prevH === null || prevT !== temperature || prevH !== humidity;
    if (changed) {
      addHistoryPoint({ timestamp: nowIso, temperature, humidity, deviceId });
    }

    return res.status(200).json({ ok: true, changed, latest: store.latest });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
