import express from 'express';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/check', async (req, res) => {
  let { ip, port } = req.query;

  // ✅ Parsing ip:port jika gabung
  if (ip && ip.includes(':') && !port) {
    const [parsedIp, parsedPort] = ip.split(':');
    ip = parsedIp;
    port = parsedPort;
  }

  if (!ip || !port) {
    return res.status(400).json({ error: 'Please provide ip and port (either as ?ip=IP&port=PORT or ?ip=IP:PORT)' });
  }

  const proxyUrl = `http://${ip}:${port}`;
  const agent = new HttpsProxyAgent(proxyUrl);
  const targetUrl = 'https://speed.cloudflare.com/cdn-cgi/trace'; // ✅ Fixed target

  try {
    const cfRes = await fetch(targetUrl, { agent, timeout: 7000 });
    const cfText = await cfRes.text();

    const cfData = Object.fromEntries(
      cfText
        .split('\n')
        .filter(line => line.includes('='))
        .map(line => line.split('=').map(s => s.trim()))
    );

    const ipApiRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,isp,org,as,proxy`);
    const ipApiData = await ipApiRes.json();

    const result = {
      proxy: ip,
      port: Number(port),
      proxyip: true,
      status: ipApiData.status,
      country: ipApiData.country,
      regionName: ipApiData.regionName,
      city: ipApiData.city,
      lat: ipApiData.lat,
      lon: ipApiData.lon,
      isp: ipApiData.isp,
      org: ipApiData.org,
      as: ipApiData.as
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Proxy test failed', detail: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Proxy Checker API is running. Use /check?ip=IP:PORT or /check?ip=IP&port=PORT');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
