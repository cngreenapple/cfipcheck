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

  const startTime = Date.now();

  try {
    // 1. Fetch from Cloudflare via proxy
    const cfRes = await fetch(targetUrl, { agent, timeout: 7000 });
    const delay = Date.now() - startTime;
    const cfText = await cfRes.text();

    const cfData = Object.fromEntries(
      cfText
        .split('\n')
        .filter(line => line.includes('='))
        .map(line => line.split('=').map(s => s.trim()))
    );

    // 2. Try primary Geo API (ip-api)
    let geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon,isp,org,as,reverse,proxy,mobile,hosting,query,timezone,zip,region`);
    let geoData = await geoRes.json();

    // 3. Fallback to ipwho.is if ip-api fails or incomplete
    if (geoData.status !== "success" || !geoData.country) {
      const fallback = await fetch(`https://ipwho.is/${ip}`);
      geoData = await fallback.json();
    }

    // 4. Build uniform response
    const response = {
      proxy: ip,
      port: parseInt(port),
      proxyip: true,
      delay: delay,
      ip: cfData.ip || geoData.ip || ip,
      colo: cfData.colo || null,
      longitude: geoData.lon || geoData.longitude || null,
      latitude: geoData.lat || geoData.latitude || null,
      httpProtocol: cfData.http || cfData["http"] || null,
      continent: geoData.continent_code || geoData.continentCode || geoData.continent || null,
      asn: parseInt(cfData.asn?.replace("AS", "")) || geoData.asn || null,
      country: geoData.country || geoData.country_code || null,
      tlsVersion: cfData.tls || null,
      city: geoData.city || null,
      timezone: geoData.timezone || null,
      postalCode: geoData.zip || geoData.postal || null,
      region: geoData.regionName || geoData.region || null,
      regionCode: geoData.region || geoData.region_code || null,
      asOrganization: cfData.asOrganization || geoData.org || geoData.connection?.organization || null
    };

    res.status(200).json(response);

  } catch (error) {
    res.status(500).json({ error: 'Proxy request failed', detail: error.message });
  }
}
