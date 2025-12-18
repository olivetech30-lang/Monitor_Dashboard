// /api/delay.js
let currentDelay = 500;

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.json({ delay: currentDelay });
  } else if (req.method === 'POST') {
    try {
      const data = JSON.parse(req.body);
      const { delay } = data;
      
      if (typeof delay === 'number' && delay >= 50 && delay <= 2000) {
        currentDelay = delay;
        res.json({ delay: currentDelay });
      } else {
        res.status(400).json({ error: 'Invalid delay' });
      }
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
    }
  } else {
    res.status(405).end();
  }
};