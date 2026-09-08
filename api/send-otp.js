import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Allow cross-origin requests from your GitHub Pages domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otpCode } = req.body;

  if (!email || !otpCode) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  try {
    const data = await resend.emails.send({
      from: 'Course Platform <onboarding@resend.dev>', // Update to your verified domain once configured
      to: email,
      subject: 'Your Access Verification Code',
      html: `<p>Your verification code is: <strong>${otpCode}</strong></p>`
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ error: error.message });
  }
}
