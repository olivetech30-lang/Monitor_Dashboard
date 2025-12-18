// /api/sensor.js
const { createClient } = require('@supabase/supabase-js');

// Helper to read raw body from stream
function getRawBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      resolve(body);
    });
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // Read raw body manually
  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (e) {
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  // Clean and parse
  const cleanBody = rawBody.trim().replace(/\0/g, '');
  if (!cleanBody) {
    return res.status(400).json({ error: 'Empty body' });
  }

  let data;
  try {
    data = JSON.parse(cleanBody);
  } catch (e) {
    console.error('Invalid JSON received:', cleanBody);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { temperature, humidity } = data;
  if (typeof temperature !== 'number' || typeof humidity !== 'number') {
    return res.status(400).json({ error: 'temperature and humidity must be numbers' });
  }

  // Supabase
  const supabase = createClient(
    'https://uappuwebcylzwndfaqxo.supabase.co',
    process.env.SUPABASE_KEY
  );

  if (!process.env.SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE_KEY' });
  }

  try {
    const {  lastReadings } = await supabase
      .from('readings')
      .select('temperature, humidity')
      .order('recorded_at', { ascending: false })
      .limit(1);

    const last = lastReadings?.[0];
    const changed = !last ||
      Math.abs(parseFloat(last.temperature) - temperature) > 0.1 ||
      Math.abs(parseFloat(last.humidity) - humidity) > 0.1;

    if (changed) {
      const { error } = await supabase
        .from('readings')
        .insert([{ temperature, humidity }]);

      if (error) {
        console.error('Supabase insert error:', error.message);
        return res.status(500).json({ error: 'Database error' });
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
};