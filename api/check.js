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
    // 1. Request to Cloudflare via proxy
    const cfRes = await fetch(targetUrl, { agent, timeout: 7000 });
    const cfText = await cfRes.text();

    const cfData = Object.fromEntries(
      cfText
        .split('\n')
        .filter(line => line.includes('='))
        .map(line => line.split('=').map(s => s.trim()))
    );

    // 2. IP-API geo lookup
    const ipApiRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,isp,org,as,reverse,proxy,mobile,hosting,query`);
    const ipApiData = await ipApiRes.json();

    // 3. Format & return merged result
    const result = {
      proxy: ip,
      port: Number(port),
      proxyip: true,
      colo: cfData.colo || null,
      tls: cfData.tls || null,
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

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Proxy request failed', detail: error.message });
  }
}
