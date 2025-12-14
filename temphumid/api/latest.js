export default function handler(req, res) {
    res.status(200).json({ 
        temp: latest?.temp ?? null, 
        humid: latest?.humid ?? null 
    });
}
