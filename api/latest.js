const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const supabase = createClient(
    'https://uappuwebcylzwndfaqxo.supabase.co',
    process.env.SUPABASE_KEY
  );

  const { data, error } = await supabase
    .from('readings')
    .select('temperature, humidity, recorded_at')  // ✅ recorded_at
    .order('recorded_at', { ascending: false })   // ✅ recorded_at
    .limit(1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data?.[0] || { temperature: null, humidity: null, recorded_at: null });
};