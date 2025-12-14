// /api/history.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const supabase = createClient(
    'https://uappuwebcylzwndfaqxo.supabase.co',
    process.env.SUPABASE_KEY
  );

  try {
    const { data, error } = await supabase
      .from('readings')
      .select('timestamp, temperature, humidity')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};