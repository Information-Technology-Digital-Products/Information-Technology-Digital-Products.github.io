import { Resend } from 'resend';

const RESEND_INSTANCE = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Always set CORS headers on every response
  res.setHeader('Access-Control-Allow-Origin', 'https://youomni.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle OPTIONS preflight immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, otpCode } = req.body || {};

    if (!email || !otpCode) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    const data = await RESEND_INSTANCE.emails.send({
      from: 'Course Platform <onboarding@resend.dev>',
      to: email,
      subject: 'Your Access Verification Code',
      html: `<p>Your verification code is: <strong>${otpCode}</strong></p>`
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Resend execution error:', error);
    return res.status(500).json({ error: error.message });
  }
}