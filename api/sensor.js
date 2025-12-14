import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uappuwebcylzwndfaqxo.supabase.co',
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { temperature, humidity } = req.body;
  if (typeof temperature !== 'number' || typeof humidity !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // Fetch last reading
  const { data: last } = await supabase
    .from('readings')
    .select('temperature, humidity')
    .order('timestamp', { ascending: false })
    .limit(1);

  // Only log if changed
  const changed = !last?.[0] ||
    Math.abs(last[0].temperature - temperature) > 0.1 ||
    Math.abs(last[0].humidity - humidity) > 0.1;

  if (changed) {
    const { error } = await supabase
      .from('readings')
      .insert([{ temperature, humidity }]);
      
    if (error) return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ success: true });
}