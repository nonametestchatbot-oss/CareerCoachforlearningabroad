import { verifyToken } from '../lib/tokens.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const result = verifyToken(req.query?.token, 'assessment-result');
    return res.status(200).json({ ok: true, expiresAt: result.exp, results: result.results });
  } catch {
    return res.status(401).json({ ok: false, error: 'Kết quả đã hết hạn hoặc đường dẫn không hợp lệ.' });
  }
}
