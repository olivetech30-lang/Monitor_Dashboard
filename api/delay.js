
// /api/delay.js
let currentDelay = 500; // Global variable to store delay

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.json({ delay: currentDelay });
  } else if (req.method === 'POST') {
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

    currentDelay = delay; // ✅ Save it!
    res.json({ delay: currentDelay });
  } else {
    res.status(405).end();
  }
};