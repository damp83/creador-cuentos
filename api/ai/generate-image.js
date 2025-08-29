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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const payload = {
      instances: [{ prompt: fullPrompt }],
      parameters: { sampleCount: 1 },
    };

    const fetchRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await fetchRes.json();

    const imageBase64 = result?.predictions?.[0]?.bytesBase64Encoded;
    if (!imageBase64) {
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
