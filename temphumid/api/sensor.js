const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // Allow browser and ESP32 access
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { temperature, humidity, deviceId = "esp32-s3" } = req.body;

    // 1. Insert data into your 'readings' table
    const { data, error } = await supabase
      .from('readings')
      .insert([{ temperature, humidity, device_id: deviceId }])
      .select()
      .single();

    if (error) throw error;

    // 2. Return success to ESP32
    return res.status(200).json({ 
      ok: true, 
      latest: { 
        temperature: data.temperature, 
        humidity: data.humidity, 
        timestamp: data.created_at 
      } 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};