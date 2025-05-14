import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default async function handler(req, res) {
  let { ip, port } = req.query;

  // Handle ip:port combined format
  if (ip && ip.includes(':') && !port) {
    const [parsedIp, parsedPort] = ip.split(':');
    ip = parsedIp;
    port = parsedPort;
  }

  if (!ip || !port) {
    return res.status(400).json({
      proxyip: false,
      error: "Missing required parameters",
      detail: "Please provide ip and port (either as ip=IP:PORT or ip=IP&port=PORT)"
    });
  }

  const proxyUrl = `http://${ip}:${port}`;
  const agent = new HttpsProxyAgent(proxyUrl);
  const targetUrl = 'https://speed.cloudflare.com/cdn-cgi/trace';

  try {
    // Step 1: Check Cloudflare trace
    const cfRes = await fetch(targetUrl, { agent, timeout: 7000 });
    const cfText = await cfRes.text();

    const cfData = Object.fromEntries(
      cfText
        .split('\n')
        .filter(line => line.includes('='))
        .map(line => line.split('=').map(s => s.trim()))
    );

    // Step 2: Get geo data from ip-api
    const ipApiRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,isp,org,as,proxy`);
    const ipApiData = await ipApiRes.json();

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

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      proxyip: false,
      error: "Proxy check failed",
      detail: err.message
    });
  }
}
