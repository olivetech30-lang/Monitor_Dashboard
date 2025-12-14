import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uappuwebcylzwndfaqxo.supabase.co',
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  const { data } = await supabase
    .from('readings')
    .select('timestamp, temperature, humidity')
    .order('timestamp', { ascending: false })
    .limit(50);

  res.json(data || []);
}