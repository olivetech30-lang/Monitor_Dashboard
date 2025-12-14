// api/latest.js
export default function handler(req, res) {
  try {
    // TEMP: log something simple to be sure function runs
    // and always return valid JSON
    res.status(200).json({
      temp: null,
      humid: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
}
