module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  const hasAnyKey = !!(process.env.GOOGLE_API_KEY || process.env.Geminis_Api_key || process.env.GEMINIS_API_KEY);
  res.end(JSON.stringify({ ok: true, env: {
    hasGoogleKey: hasAnyKey,
    node: process.version
  }}));
};
