const https = require('https');

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

module.exports = async (req, res) => {
  const rid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const debug = String(process.env.TEXT_DEBUG || '').toLowerCase() === 'true';
  const log = (level, msg, extra) => {
    if (!debug && level === 'debug') return;
    const rec = { level, rid, msg, ...(extra || {}) };
    try { console[level === 'error' ? 'error' : 'log'](JSON.stringify(rec)); } catch {}
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
    const prompt = body.prompt || '';
    const systemPrompt = body.systemPrompt || '';
    const model = body.model || 'gemini-1.5-flash';

    const apiKey = process.env.GOOGLE_API_KEY || process.env.Geminis_Api_key || process.env.GEMINIS_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Missing GOOGLE_API_KEY (o Geminis_Api_key)' }));
      return;
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
    };
    if (systemPrompt) {
      payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const fetchRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let result = null;
    try { result = await fetchRes.json(); } catch (e) {
      const txt = await fetchRes.text().catch(() => '');
      result = { nonJson: true, status: fetchRes.status, text: txt };
    }

    if (!fetchRes.ok) {
      const upstreamMsg = result?.error?.message || result?.message || result?.text || fetchRes.statusText;
      const upstreamCode = result?.error?.status || result?.error?.code || undefined;
      log('error', 'upstream.text.error', { status: fetchRes.status, statusText: fetchRes.statusText, upstreamMsg, upstreamCode });
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ error: 'Upstream text API error', message: upstreamMsg, code: upstreamCode, rid }));
      return;
    }

    // Extract text robustly from candidates
    const candidates = Array.isArray(result?.candidates) ? result.candidates : [];
    let text = '';
    for (const c of candidates) {
      const parts = Array.isArray(c?.content?.parts) ? c.content.parts : [];
      for (const p of parts) {
        if (typeof p?.text === 'string') text += (text ? ' ' : '') + p.text;
      }
    }
    text = (text || '').trim();

    const finishReason = candidates?.[0]?.finishReason || result?.promptFeedback?.blockReason || null;
    const blocked = String(finishReason || '').toLowerCase().includes('block') || String(finishReason || '').toLowerCase().includes('safety');

    if (!text) {
      const friendly = blocked ? 'La respuesta fue bloqueada por seguridad. Ajusta el texto o hazlo más neutral.' : 'No se generó texto.';
      log('debug', 'no.text.generated', { finishReason });
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ error: 'No text generated', message: friendly, finishReason, rid, raw: result }));
      return;
    }

    log('debug', 'text.generated', { chars: text.length });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ text, rid }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Server error', message: String(err?.message || err), rid }));
  }
};
