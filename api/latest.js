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
    const { data: latestReading, error } = await supabase
      .from('readings')
      .select('*')
      .eq('sensor_id', DEFAULT_SENSOR_ID)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).json({
      success: true,
      data: latestReading || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching latest reading:', error);
    res.status(500).json({ error: 'Failed to fetch latest reading' });
  }
}