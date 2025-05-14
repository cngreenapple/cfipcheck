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
    // 1. Test proxy by connecting to Cloudflare trace
    const cfRes = await fetch(targetUrl, { agent, timeout: 7000 });
    const cfText = await cfRes.text();

    const cfData = Object.fromEntries(
      cfText
        .split('\n')
        .filter(line => line.includes('='))
        .map(line => line.split('=').map(s => s.trim()))
    );

    // 2. Get GeoIP info from ip-api.com
    const ipApiRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon,isp,org,as,reverse,proxy,mobile,hosting,query`);
    const ipApiData = await ipApiRes.json();

    // 3. Merge and return
    const result = {
      proxyTest: {
        target: targetUrl,
        ...cfData,
        proxyip: true,
        clientIp: ip,
      },
      geoInfo: ipApiData
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Proxy request failed', detail: error.message });
  }
}
