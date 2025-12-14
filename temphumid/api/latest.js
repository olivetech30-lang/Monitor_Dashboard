// api/latest.js (CommonJS)
const { getStore } = require("./_store");

module.exports = (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  const store = getStore();
  return res.status(200).json({ ok: true, latest: store.latest });
};