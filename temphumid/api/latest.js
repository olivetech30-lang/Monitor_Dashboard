export default function handler(req, res) {
    res.status(200).json({ temp: global.latest?.temp ?? null, humid: global.latest?.humid ?? null });
}
