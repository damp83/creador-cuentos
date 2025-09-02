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

async function callOpenAIImages(model, prompt, size, apiKey) {
  const apiUrl = 'https://api.openai.com/v1/images/generations';
  const fetchRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, prompt, size, response_format: 'b64_json' })
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
  const debug = String(process.env.IMAGE_DEBUG || '').toLowerCase() === 'true';
  const rid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const log = (level, msg, extra) => {
    if (!debug && level === 'debug') return;
    const record = { level, rid, msg, ...(extra || {}) };
    try { console[level === 'error' ? 'error' : 'log'](JSON.stringify(record)); } catch {}
  };
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

  const provider = String(process.env.IMAGE_PROVIDER || 'google').toLowerCase();

  const stylePart =
      type === 'character'
        ? 'ilustración para un cuento infantil, estilo dibujo animado, colores vivos, cuerpo completo, sin texto, fondo blanco'
        : 'ilustración para un cuento infantil, estilo dibujo animado, colores vivos, paisaje fantástico, sin texto';

    const fullPrompt = `${stylePart}: ${userPrompt}`;

    const aspect = process.env.GOOGLE_IMAGE_AR || undefined; // e.g., '1:1', '16:9'

    // Provider: OpenAI (ChatGPT) images
    if (provider === 'openai') {
      const sizeFromAspect = (ar) => {
        switch ((ar || '').trim()) {
          case '16:9': return '1344x768';
          case '4:3': return '1024x768';
          case '3:2': return '1200x800';
          case '9:16': return '768x1344';
          default: return '1024x1024';
        }
      };
      const oaKey = process.env.OPENAI_API_KEY || process.env.ChatGPT_API_KEY || process.env.CHATGPT_API_KEY;
      if (!oaKey) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Missing OPENAI_API_KEY (o CHATGPT_API_KEY)', rid }));
        return;
      }
      const oaModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
      log('debug', 'provider.openai.request', { size: sizeFromAspect(aspect), model: oaModel });
      const { ok, status, statusText, result } = await callOpenAIImages(oaModel, fullPrompt, sizeFromAspect(aspect), oaKey);
      if (!ok) {
        // Dev placeholder
        if (String(process.env.IMAGE_DEV_PLACEHOLDER || '').toLowerCase() === 'true') {
          const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='768'><rect width='100%' height='100%' fill='#f7fafc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='#2d3748'>Placeholder (dev)\n${(userPrompt||'').slice(0,80)}</text></svg>`;
          const base64 = Buffer.from(svg).toString('base64');
          log('debug', 'dev.placeholder.returned');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ imageBase64: base64, imageMime: 'image/svg+xml', rid }));
          return;
        }
        const upstreamMsg = result?.error?.message || result?.message || result?.text || statusText;
        const upstreamCode = result?.error?.type || result?.error?.code || undefined;
        log('error', 'openai.upstream.error', { status, statusText, upstreamCode, upstreamMsg });
        res.statusCode = 502;
        res.end(JSON.stringify({
          error: 'Upstream image API error (OpenAI)',
          message: upstreamMsg,
          code: upstreamCode,
          status,
          statusText,
          raw: result,
          rid
        }));
        return;
      }
      const b64 = result?.data?.[0]?.b64_json;
      if (!b64) {
        log('error', 'openai.no.image.in.response');
        res.statusCode = 502;
        res.end(JSON.stringify({ error: 'No image generated', raw: result, rid }));
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ imageBase64: b64, imageMime: 'image/png', rid }));
      return;
    }

    // Default provider: Google AI Studio - Images API (Imagen 3)
    const apiKey = process.env.GOOGLE_API_KEY || process.env.Geminis_Api_key || process.env.GEMINIS_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Missing GOOGLE_API_KEY (o Geminis_Api_key)', rid }));
      return;
    }
    const model = process.env.GOOGLE_IMAGE_MODEL || 'imagen-3.0-generate-002';
    const primaryUrl = `https://generativelanguage.googleapis.com/v1beta/images:generate`;
    const altUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImage`;

    const payload = {
      model,
      prompt: { text: fullPrompt },
      ...(aspect ? { aspectRatio: aspect } : {})
    };
    log('debug', 'request.received', {
      type,
      model,
      aspect: aspect || null,
      promptChars: fullPrompt.length,
    });
    // Try primary endpoint
    let { ok, status, statusText, result } = await callGoogleImages(primaryUrl, payload, apiKey, true);
    if (!ok) {
      const upstreamMsg1 = result?.error?.message || result?.message || result?.text || statusText;
      log('debug', 'call.primary.failed', { status, statusText, upstreamMsg: upstreamMsg1 });
    } else {
      log('debug', 'call.primary.ok', { status });
    }
    // If primary fails, try alternate endpoint signature
    if (!ok) {
      const alt = await callGoogleImages(altUrl, payload, apiKey, true);
      ok = alt.ok; status = alt.status; statusText = alt.statusText; result = alt.result;
      if (!ok) {
        const upstreamMsg2 = result?.error?.message || result?.message || result?.text || statusText;
        log('debug', 'call.alt.failed', { status, statusText, upstreamMsg: upstreamMsg2 });
      } else {
        log('debug', 'call.alt.ok', { status });
      }
    }
  // If header auth fails, try query key as last resort
    if (!ok) {
      const sep1 = primaryUrl.includes('?') ? '&' : '?';
      const sep2 = altUrl.includes('?') ? '&' : '?';
      const p2 = await callGoogleImages(`${primaryUrl}${sep1}key=${apiKey}`, payload, apiKey, false);
      ok = p2.ok; status = p2.status; statusText = p2.statusText; result = p2.result;
      if (!ok) {
        log('debug', 'call.primaryQueryKey.failed', { status, statusText });
      } else {
        log('debug', 'call.primaryQueryKey.ok', { status });
      }
      if (!ok) {
        const a2 = await callGoogleImages(`${altUrl}${sep2}key=${apiKey}`, payload, apiKey, false);
        ok = a2.ok; status = a2.status; statusText = a2.statusText; result = a2.result;
        if (!ok) {
          const upstreamMsg4 = result?.error?.message || result?.message || result?.text || statusText;
          log('debug', 'call.altQueryKey.failed', { status, statusText, upstreamMsg: upstreamMsg4 });
        } else {
          log('debug', 'call.altQueryKey.ok', { status });
        }
      }
    }
    if (!ok) {
      // Optional: dev fallback to aid testing without a working key/quota
      if (String(process.env.IMAGE_DEV_PLACEHOLDER || '').toLowerCase() === 'true') {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='768'><rect width='100%' height='100%' fill='#f7fafc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='#2d3748'>Placeholder (dev)\n${(userPrompt||'').slice(0,80)}</text></svg>`;
        const base64 = Buffer.from(svg).toString('base64');
        log('debug', 'dev.placeholder.returned');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ imageBase64: base64, imageMime: 'image/svg+xml', rid }));
        return;
      }
      // Optional: auto-placeholder only when upstream is 404 (no access/disabled product)
      const is404 = status === 404;
      const auto404 = String(process.env.IMAGE_AUTOPLACEHOLDER_ON_404 || '').toLowerCase() === 'true';
      if (is404 && auto404) {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='768'><rect width='100%' height='100%' fill='#fff5f5'/><text x='50%' y='42%' dominant-baseline='middle' text-anchor='middle' font-size='24' fill='#742a2a'>Imagen 3 no disponible (404)</text><text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='16' fill='#9b2c2c'>Habilita Google AI Images para tu API key o cambia de proveedor</text></svg>`;
        const base64 = Buffer.from(svg).toString('base64');
        log('debug', 'auto.placeholder.404');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ imageBase64: base64, imageMime: 'image/svg+xml', rid }));
        return;
      }
      const upstreamMsg = result?.error?.message || result?.message || result?.text || statusText;
      const upstreamCode = result?.error?.status || result?.error?.code || undefined;
      const friendly404 = status === 404
        ? 'El endpoint de Google AI Images respondió 404 (no disponible). Suele indicar que tu API key no tiene acceso a Imagen 3 o que el servicio no está habilitado para tu proyecto/región. Activa Google AI Images en AI Studio con esta clave o usa un proveedor alternativo.'
        : null;
      log('error', 'upstream.error', { status, statusText, upstreamCode, upstreamMsg });
      res.statusCode = 502;
      res.end(JSON.stringify({
        error: 'Upstream image API error',
        message: friendly404 || upstreamMsg,
        code: upstreamCode,
        status,
        statusText,
        raw: result,
        rid
      }));
      return;
    }

    // Robust parse for different response shapes
    let imageBase64 =
      result?.images?.[0]?.image?.bytesBase64Encoded ||
      result?.images?.[0]?.b64Data ||
      result?.predictions?.[0]?.bytesBase64Encoded ||
      result?.image?.base64 ||
      result?.generatedImages?.[0]?.bytesBase64Encoded;

    // Also support inlineData style responses (rare)
    if (!imageBase64) {
      try {
        const parts = result?.candidates?.[0]?.content?.parts || [];
        const inline = Array.isArray(parts) && parts.find(p => p?.inline_data || p?.inlineData);
        const inlineData = inline?.inline_data || inline?.inlineData;
        if (inlineData?.data) imageBase64 = inlineData.data;
      } catch {}
    }

    if (!imageBase64) {
      // Try broader keys some SDKs may use
      const altBase64 = result?.image?.data || result?.data;
      if (altBase64) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ imageBase64: altBase64, rid }));
        return;
      }
      log('error', 'no.image.in.response');
      res.statusCode = 502;
      res.end(JSON.stringify({ error: 'No image generated', raw: result, rid }));
      return;
    }

    // Try to capture mime if provided by upstream
    const imageMime =
      result?.images?.[0]?.image?.mimeType ||
      result?.images?.[0]?.mimeType ||
      result?.mimeType ||
      result?.images?.[0]?.image?.mime ||
      undefined;
    log('debug', 'success.image.generated', { bytes: imageBase64.length, hasMime: Boolean(imageMime) });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ imageBase64, ...(imageMime ? { imageMime } : {}), rid }));
  } catch (err) {
    log('error', 'handler.exception', { err: String(err?.message || err) });
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Server error', message: String(err?.message || err), rid }));
  }
};
