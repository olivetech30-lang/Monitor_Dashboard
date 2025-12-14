import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_SENSOR_ID = '00000000-0000-0000-0000-000000000001';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = 100 } = req.query;

    const { data: changes, error } = await supabase
      .from('value_changes')
      .select('*')
      .eq('sensor_id', DEFAULT_SENSOR_ID)
      .order('recorded_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      throw error;
    }

    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).json({
      success: true,
      data: changes || [],
      count: changes?.length || 0
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}