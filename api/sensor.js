// api/sensor.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_SENSOR_ID = '00000000-0000-0000-0000-000000000001';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse JSON body
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    
    const { temperature, humidity } = body;
    
    // Validate
    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: 'Missing temperature or humidity' });
    }
    
    const tempNum = parseFloat(temperature);
    const humidNum = parseFloat(humidity);
    
    if (isNaN(tempNum) || isNaN(humidNum)) {
      return res.status(400).json({ error: 'Temperature and humidity must be numbers' });
    }

    // Insert into readings table
    const { data: newReading, error: insertError } = await supabase
      .from('readings')
      .insert({
        sensor_id: DEFAULT_SENSOR_ID,
        temperature: parseFloat(tempNum.toFixed(2)),
        humidity: parseFloat(humidNum.toFixed(2))
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return res.status(500).json({ error: 'Database insert failed' });
    }

    res.status(200).json({
      success: true,
      data: newReading
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}