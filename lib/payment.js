export function validateOrderCode(code) {
  return /^LC\d{8}$/.test(String(code || '').trim());
}

export async function readPaymentStatus(code) {
  if (!process.env.APPS_SCRIPT_URL || !process.env.APPS_SCRIPT_SECRET) {
    throw new Error('Payment integration is not configured');
  }
  const url = new URL(process.env.APPS_SCRIPT_URL);
  url.searchParams.set('action', 'paymentStatus');
  url.searchParams.set('secret', process.env.APPS_SCRIPT_SECRET);
  url.searchParams.set('orderCode', code);
  const upstream = await fetch(url);
  const result = await upstream.json();
  if (!upstream.ok) throw new Error('Payment status unavailable');
  return result;
}
