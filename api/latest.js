import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uappuwebcylzwndfaqxo.supabase.co',
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  const { data } = await supabase
    .from('readings')
    .select('temperature, humidity, timestamp')
    .order('timestamp', { ascending: false })
    .limit(1);

  res.json(data?.[0] || { temperature: null, humidity: null, timestamp: null });
}