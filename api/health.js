module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, env: {
    hasGoogleKey: !!process.env.GOOGLE_API_KEY,
    node: process.version
  }}));
};
