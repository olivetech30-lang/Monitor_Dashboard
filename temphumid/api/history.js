// api/history.js
import { getStore } from "./_store.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const store = getStore();
  const limitRaw = req.query?.limit;
  let limit = 200;
  if (typeof limitRaw === "string") {
    const parsed = Number.parseInt(limitRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) limit = parsed;
  }

  const history = store.history.slice(-limit);
  return res.status(200).json({ ok: true, count: history.length, history });
}
