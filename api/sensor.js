// /api/sensor.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Allow only POST
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  // Parse body manually (Vercel doesn't auto-parse)
  let data;
  try {
    data = JSON.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { temperature, humidity } = data;

  // Validate
  if (typeof temperature !== 'number' || typeof humidity !== 'number') {
    return res.status(400).json({ error: 'temperature and humidity must be numbers' });
  }

  // Supabase setup — using YOUR project
  const supabase = createClient(
    'https://uappuwebcylzwndfaqxo.supabase.co',
    process.env.SUPABASE_KEY
  );

  // Critical: Check if key is missing
  if (!process.env.SUPABASE_KEY) {
    console.error('❌ SUPABASE_KEY is not set in Vercel environment variables!');
    return res.status(500).json({ error: 'Missing API key' });
  }

  try {
    // Fetch last reading
    const { data: lastReadings, error: fetchErr } = await supabase
      .from('readings')
      .select('temperature, humidity')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.error('Supabase fetch error:', fetchErr.message);
      return res.status(500).json({ error: 'DB fetch failed' });
    }

    const last = lastReadings?.[0];
    const changed = !last ||
      Math.abs(parseFloat(last.temperature) - temperature) > 0.1 ||
      Math.abs(parseFloat(last.humidity) - humidity) > 0.1;

    if (changed) {
      const { error: insertErr } = await supabase
        .from('readings')
        .insert([{ temperature, humidity }]);

      if (insertErr) {
        console.error('Supabase insert error:', insertErr.message);
        return res.status(500).json({ error: 'DB insert failed' });
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};