import express from 'express';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/check', async (req, res) => {
  const { proxy } = req.query;
  if (!proxy) return res.status(400).json({ error: 'Query ?proxy=ip:port is required' });

  try {
    const agent = new HttpsProxyAgent(`http://${proxy}`);
    const response = await fetch('https://speed.cloudflare.com/cdn-cgi/trace/', { agent, timeout: 5000 });
    const data = await response.text();
    res.type('text').send(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy failed or unreachable', detail: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
