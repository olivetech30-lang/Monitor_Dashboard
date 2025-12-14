const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const { data, error } = await supabase
      .from('readings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Format data so app.js understands it
    const latest = data ? {
      temperature: data.temperature,
      humidity: data.humidity,
      timestamp: data.created_at
    } : { temperature: null, humidity: null, timestamp: null };

    return res.status(200).json({ ok: true, latest });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};