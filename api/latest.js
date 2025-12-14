// /api/latest.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const supabase = createClient(
    'https://uappuwebcylzwndfaqxo.supabase.co',
    process.env.SUPABASE_KEY
  );

  try {
    const { data, error } = await supabase
      .from('readings')
      .select('temperature, humidity, timestamp')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json(data?.[0] || { temperature: null, humidity: null, timestamp: null });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};