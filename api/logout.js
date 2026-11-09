module.exports = async (req, res) => {
  res.writeHead(302, {
    Location: '/',
    'Set-Cookie': 'kas_sesi=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  });
  return res.end();
};

