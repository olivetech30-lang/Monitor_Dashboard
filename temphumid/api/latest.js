a// api/latest.js
import { getStore } from "./_store.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const store = getStore();
  return res.status(200).json({ ok: true, latest: store.latest });
}
