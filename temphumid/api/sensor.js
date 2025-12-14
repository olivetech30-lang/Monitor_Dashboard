let latest = { temp: null, humid: null, timestamp: null };
let history = [];

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { temp, humid } = req.body;
    if (typeof temp !== 'number' || typeof humid !== 'number') {
        return res.status(400).json({ error: 'Invalid data' });
    }
    
    const now = new Date().toISOString();
    latest = { temp, humid, timestamp: now };  // Now accessible globally
    
    const lastLog = history[history.length - 1];
    if (!lastLog || Math.abs(lastLog.temp - temp) >= 0.2 || Math.abs(lastLog.humid - humid) >= 1) {
        history.push({ temp, humid, timestamp: now });
        if (history.length > 1000) history.shift();
    }
    
    res.status(200).json({ success: true });
}
