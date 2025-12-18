// /api/delay.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Return current delay
    res.json({ delay: 500 }); // You can store this in Supabase if needed
  } else if (req.method === 'POST') {
    // Update delay
    let data;
    try {
      data = JSON.parse(req.body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { delay } = data;
    if (typeof delay !== 'number' || delay < 50 || delay > 2000) {
      return res.status(400).json({ error: 'Delay must be between 50 and 2000' });
    }

    // Store in memory or Supabase (optional)
    // For now, just return it
    res.json({ delay });
  } else {
    res.status(405).end();
  }
};