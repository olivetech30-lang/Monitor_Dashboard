
// Store delay in memory (resets on Vercel cold start, but works for demo)
let currentDelay = 500;

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Return the last saved delay
    res.json({ delay: currentDelay });
  } else if (req.method === 'POST') {
    try {
      // Parse body manually (Vercel doesn't auto-parse)
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const { delay } = data;
          
          if (typeof delay === 'number' && delay >= 50 && delay <= 2000) {
            currentDelay = delay; // ✅ Save it!
            res.json({ delay: currentDelay });
          } else {
            res.status(400).json({ error: 'Delay must be 50-2000' });
          }
        } catch (e) {
          res.status(400).json({ error: 'Invalid JSON' });
        }
      });
    } catch (e) {
      res.status(400).json({ error: 'Body read failed' });
    }
  } else {
    res.status(405).end();
  }
};