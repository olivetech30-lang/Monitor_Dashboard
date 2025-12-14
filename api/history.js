const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const limit = parseInt(req.query.limit) || 100;

    const { data, error } = await supabase
      .from('readings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Map Supabase rows to the format your app.js table expects
    const history = data.map(row => ({
      temperature: row.temperature,
      humidity: row.humidity,
      timestamp: row.created_at
    }));

    return res.status(200).json({ ok: true, history });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};