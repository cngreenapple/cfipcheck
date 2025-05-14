import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default async function handler(req, res) {
  const { ip, port, host, tls } = req.query;

  if (!ip || !port || !host) {
    return res.status(400).json({ error: 'Required query: ip, port, host' });
  }

  const proxyUrl = `http://${ip}:${port}`;
  const agent = new HttpsProxyAgent(proxyUrl);
  const targetUrl = `${tls === 'true' ? 'https' : 'http'}://${host}/cdn-cgi/trace`;

  try {
    const response = await fetch(targetUrl, { agent, timeout: 7000 });
    const text = await response.text();

    const result = Object.fromEntries(
      text
        .split('\n')
        .filter(line => line.includes('='))
        .map(line => line.split('=').map(s => s.trim()))
    );

    result.clientIp = ip;
    result.proxyip = true;

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Proxy request failed', detail: error.message });
  }
}
