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
    // ONLY get temperature and humidity from ESP32
    const { temperature, humidity } = req.body;
    
    // Validate input
    if (typeof temperature !== 'number' || typeof humidity !== 'number') {
      return res.status(400).json({ error: 'Invalid temperature or humidity values' });
    }

    // Get previous reading
    const { data: previousReading, error: fetchError } = await supabase
      .from('readings')
      .select('temperature, humidity')
      .eq('sensor_id', DEFAULT_SENSOR_ID)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.warn('Error fetching previous reading:', fetchError.message);
    }

    // Insert new reading
    const { data: newReading, error: insertError } = await supabase
      .from('readings')
      .insert({
        sensor_id: DEFAULT_SENSOR_ID,
        temperature: parseFloat(temperature.toFixed(2)),
        humidity: parseFloat(humidity.toFixed(2))
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    // Check for significant change (> 0.1)
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

      // Log the change to value_changes table
      const { error: changeError } = await supabase
        .from('value_changes')
        .insert({
          sensor_id: DEFAULT_SENSOR_ID,
          temperature: parseFloat(temperature.toFixed(2)),
          humidity: parseFloat(humidity.toFixed(2)),
          previous_temperature: previousReading?.temperature || null,
          previous_humidity: previousReading?.humidity || null,
          change_type: changeType
        });

      if (changeError) {
        console.error('Error logging change:', changeError);
      }
    }

    res.status(200).json({
      success: true,
      changed: hasChanged,
      data: newReading,
      message: 'Data saved successfully'
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Failed to process sensor data',
      details: error.message
    });
  }
}