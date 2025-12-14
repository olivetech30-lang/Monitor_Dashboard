import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Default sensor ID (you can modify this to support multiple sensors)
const DEFAULT_SENSOR_ID = '00000000-0000-0000-0000-000000000001';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { temperature, humidity } = req.body;
    
    // Validate input
    if (typeof temperature !== 'number' || typeof humidity !== 'number') {
      return res.status(400).json({ error: 'Invalid temperature or humidity values' });
    }

    // First, get the previous reading
    const { data: previousReading } = await supabase
      .from('readings')
      .select('temperature, humidity')
      .eq('sensor_id', DEFAULT_SENSOR_ID)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    // Insert new reading
    const { data: newReading, error: insertError } = await supabase
      .from('readings')
      .insert({
        sensor_id: DEFAULT_SENSOR_ID,
        temperature,
        humidity
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Check if values changed significantly (more than 0.1 degrees/percent)
    const hasChanged = !previousReading || 
      Math.abs(previousReading.temperature - temperature) > 0.1 ||
      Math.abs(previousReading.humidity - humidity) > 0.1;

    if (hasChanged) {
      let changeType = 'both';
      if (previousReading) {
        const tempChanged = Math.abs(previousReading.temperature - temperature) > 0.1;
        const humidityChanged = Math.abs(previousReading.humidity - humidity) > 0.1;
        
        if (tempChanged && !humidityChanged) changeType = 'temperature';
        else if (!tempChanged && humidityChanged) changeType = 'humidity';
      }

      // Log the change
      await supabase
        .from('value_changes')
        .insert({
          sensor_id: DEFAULT_SENSOR_ID,
          temperature,
          humidity,
          previous_temperature: previousReading?.temperature || null,
          previous_humidity: previousReading?.humidity || null,
          change_type: changeType
        });
    }

    res.status(200).json({
      success: true,
      message: 'Data saved successfully',
      changed: hasChanged,
      data: newReading
    });

  } catch (error) {
    console.error('Error processing sensor data:', error);
    res.status(500).json({ error: 'Failed to process sensor data' });
  }
}