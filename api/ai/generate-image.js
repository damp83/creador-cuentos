function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function callGoogleImages(apiUrl, payload, apiKey, useHeader = true) {
  const fetchRes = await fetch(apiUrl, {
    method: 'POST',
    headers: useHeader
      ? { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }
      : { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let result = null;
  try {
    result = await fetchRes.json();
  } catch (e) {
    const txt = await fetchRes.text().catch(() => '');
    result = { nonJson: true, status: fetchRes.status, text: txt };
  }
  return { ok: fetchRes.ok, status: fetchRes.status, statusText: fetchRes.statusText, result };
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const type = body.type || 'scenario';
    const userPrompt = body.prompt || '';

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Missing GOOGLE_API_KEY' }));
      return;
    }

  const stylePart =
      type === 'character'
        ? 'ilustración para un cuento infantil, estilo dibujo animado, colores vivos, cuerpo completo, sin texto, fondo blanco'
        : 'ilustración para un cuento infantil, estilo dibujo animado, colores vivos, paisaje fantástico, sin texto';

    const fullPrompt = `${stylePart}: ${userPrompt}`;

    // Google AI Studio - Images API (Imagen 3)
  // Default to the user's suggested Gemini Images model; can be overridden via env
  const model = process.env.GOOGLE_IMAGE_MODEL || 'imagen-3.0-generate-002';
  const aspect = process.env.GOOGLE_IMAGE_AR || undefined; // e.g., '1:1', '16:9'
  const primaryUrl = `https://generativelanguage.googleapis.com/v1beta/images:generate`;
  const altUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImage`;

    const payload = {
      model,
      prompt: { text: fullPrompt },
      ...(aspect ? { aspectRatio: aspect } : {})
    };
    // Try primary endpoint
    let { ok, status, statusText, result } = await callGoogleImages(primaryUrl, payload, apiKey, true);
    // If primary fails, try alternate endpoint signature
    if (!ok) {
      const alt = await callGoogleImages(altUrl, payload, apiKey, true);
      ok = alt.ok; status = alt.status; statusText = alt.statusText; result = alt.result;
    }
    // If header auth fails, try query key as last resort
    if (!ok) {
      const sep1 = primaryUrl.includes('?') ? '&' : '?';
      const sep2 = altUrl.includes('?') ? '&' : '?';
      const p2 = await callGoogleImages(`${primaryUrl}${sep1}key=${apiKey}`, payload, apiKey, false);
      ok = p2.ok; status = p2.status; statusText = p2.statusText; result = p2.result;
      if (!ok) {
        const a2 = await callGoogleImages(`${altUrl}${sep2}key=${apiKey}`, payload, apiKey, false);
        ok = a2.ok; status = a2.status; statusText = a2.statusText; result = a2.result;
      }
    }
    if (!ok) {
      // Optional: dev fallback to aid testing without a working key/quota
      if (String(process.env.IMAGE_DEV_PLACEHOLDER || '').toLowerCase() === 'true') {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='768'><rect width='100%' height='100%' fill='#f7fafc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='#2d3748'>Placeholder (dev)\n${(userPrompt||'').slice(0,80)}</text></svg>`;
        const base64 = Buffer.from(svg).toString('base64');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ imageBase64: base64, imageMime: 'image/svg+xml' }));
        return;
      }
      const upstreamMsg = result?.error?.message || result?.message || result?.text || statusText;
      const upstreamCode = result?.error?.status || result?.error?.code || undefined;
      res.statusCode = 502;
      res.end(JSON.stringify({
        error: 'Upstream image API error',
        message: upstreamMsg,
        code: upstreamCode,
        status,
        statusText,
        raw: result
      }));
      return;
    }

    // Robust parse for different response shapes
    const imageBase64 =
      result?.images?.[0]?.image?.bytesBase64Encoded ||
      result?.images?.[0]?.b64Data ||
      result?.predictions?.[0]?.bytesBase64Encoded;
  if (!imageBase64) {
      // Try broader keys some SDKs may use
      const altBase64 = result?.image?.base64 || result?.generatedImages?.[0]?.bytesBase64Encoded;
      if (altBase64) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ imageBase64: altBase64 }));
        return;
      }
      res.statusCode = 502;
      res.end(JSON.stringify({ error: 'No image generated', raw: result }));
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ imageBase64 }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Server error', message: String(err?.message || err) }));
  }
};
