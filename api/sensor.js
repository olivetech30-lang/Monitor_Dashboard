// /api/sensor.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // Clean and parse body
  let cleanBody = req.body;
  if (typeof cleanBody === 'string') {
    cleanBody = cleanBody.trim().replace(/\0/g, '');
  }

  if (!cleanBody) {
    return res.status(400).json({ error: 'Empty request body' });
  }

  let data;
  try {
    data = JSON.parse(cleanBody);
  } catch (e) {
    console.error('JSON parse error. Raw body:', req.body);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { temperature, humidity } = data;
  if (typeof temperature !== 'number' || typeof humidity !== 'number') {
    return res.status(400).json({ error: 'temperature and humidity must be numbers' });
  }

  // Connect to Supabase
  const supabase = createClient(
    'https://uappuwebcylzwndfaqxo.supabase.co',
    process.env.SUPABASE_KEY
  );

  if (!process.env.SUPABASE_KEY) {
    console.error('❌ SUPABASE_KEY missing in Vercel env vars');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    // Fetch last reading to detect change
    const {  lastReadings, error: fetchErr } = await supabase
      .from('readings')
      .select('temperature, humidity')
      .order('recorded_at', { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.error('Supabase fetch error:', fetchErr.message);
      return res.status(500).json({ error: 'Database fetch failed' });
    }

    const last = lastReadings?.[0];
    const hasChanged = !last ||
      Math.abs(parseFloat(last.temperature) - temperature) > 0.1 ||
      Math.abs(parseFloat(last.humidity) - humidity) > 0.1;

    if (hasChanged) {
      const { error: insertErr } = await supabase
        .from('readings')
        .insert([{ temperature, humidity }]);

      if (insertErr) {
        console.error('Supabase insert error:', insertErr.message);
        return res.status(500).json({ error: 'Database insert failed' });
      }
    } 

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};