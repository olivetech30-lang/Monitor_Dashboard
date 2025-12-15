// /api/sensor.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  let data;
  try {
    data = JSON.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { temperature, humidity } = data;

  if (typeof temperature !== 'number' || typeof humidity !== 'number') {
    return res.status(400).json({ error: 'temperature and humidity must be numbers' });
  }

  const supabase = createClient(
    'https://uappuwebcylzwndfaqxo.supabase.co',
    process.env.SUPABASE_KEY
  );

  if (!process.env.SUPABASE_KEY) {
    console.error('❌ SUPABASE_KEY is missing');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    // Fetch last reading using recorded_at
    const { data: lastReadings, error: fetchErr } = await supabase
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
        .insert([{ temperature, humidity }]); // recorded_at auto-filled by now()

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