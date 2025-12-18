

let currentDelay = 500; // 👈 In-memory storage

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.json({ delay: currentDelay }); // Returns last saved value
  } else if (req.method === 'POST') {
    try {
      const data = JSON.parse(req.body);
      const { delay } = data;
      
      if (typeof delay === 'number' && delay >= 50 && delay <= 2000) {
        currentDelay = delay; // 👈 Saves it!
        res.json({ delay: currentDelay });
      } else {
        res.status(400).json({ error: 'Delay must be 50-2000' });
      }
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
    }
  } else {
    res.status(405).end();
  }
};