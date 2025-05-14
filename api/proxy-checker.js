// api/proxy-checker.js
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default async (req, res) => {
  const { proxy } = req.query;
  if (!proxy) return res.status(400).json({ error: 'Query ?proxy=ip:port is required' });

  try {
    const agent = new HttpsProxyAgent(`http://${proxy}`);
    const response = await fetch('https://speed.cloudflare.com/cdn-cgi/trace/', { agent, timeout: 5000 });
    const data = await response.text();
    res.status(200).send(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy failed or unreachable', detail: err.message });
  }
};
