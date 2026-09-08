import { Resend } from 'resend';

const RESEND_INSTANCE = new Resend(process.env.RESEND_API_KEY);

export default async function HANDLER(REQ, RES) {
  // 1. Return HTTP 200 immediately for preflight OPTIONS requests
  if (REQ.method === 'OPTIONS') {
    RES.setHeader('Access-Control-Allow-Origin', 'https://youomni.github.io');
    RES.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
    RES.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    return RES.status(200).end();
  }

  // 2. Reject any HTTP method other than POST
  if (REQ.method !== 'POST') {
    return RES.status(405).json({ ERROR: 'Method not allowed' });
  }

  // 3. Extract parameters safely
  const { email: EMAIL_ADDRESS, otpCode: OTP_CODE } = REQ.body || {};

  if (!EMAIL_ADDRESS || !OTP_CODE) {
    return RES.status(400).json({ ERROR: 'Email and OTP code are required.' });
  }

  // 4. Send email via Resend API
  try {
    const DATA = await RESEND_INSTANCE.emails.send({
      from: 'Course Platform <onboarding@resend.dev>',
      to: EMAIL_ADDRESS,
      subject: 'Your Access Verification Code',
      html: `<p>Your verification code is: <strong>${OTP_CODE}</strong></p>`
    });

    return RES.status(200).json({ SUCCESS: true, DATA });
  } catch (ERROR) {
    console.error('Resend error:', ERROR);
    return RES.status(500).json({ ERROR: ERROR.message });
  }
}