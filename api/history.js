// /api/history.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const supabase = createClient(
    'https://uappuwebcylzwndfaqxo.supabase.co',
    process.env.SUPABASE_KEY
  );

  if (!process.env.SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing API key' });
  }

  try {
    const { data, error } = await supabase
      .from('readings')
      .select('recorded_at, temperature, humidity')
      .order('recorded_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('History fetch error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error('Unexpected error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};