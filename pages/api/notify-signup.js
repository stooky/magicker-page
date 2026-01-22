// pages/api/notify-signup.js
// Simple endpoint to send signup notifications via email
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email, website } = req.body;
    console.log('[notify-signup] Called with:', { email, website });

    const notifyTo = process.env.NOTIFY_EMAIL;

    if (!resend) {
        console.log('[notify-signup] Resend not configured (missing RESEND_API_KEY)');
        return res.status(200).json({ success: false, reason: 'email not configured' });
    }

    if (!notifyTo) {
        console.log('[notify-signup] NOTIFY_EMAIL not set');
        return res.status(200).json({ success: false, reason: 'NOTIFY_EMAIL not set' });
    }

    try {
        console.log('[notify-signup] Sending to:', notifyTo);
        const result = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Magic Page <noreply@membies.com>',
            to: notifyTo,
            subject: `New Magic Page Signup: ${website}`,
            text: `New signup!\n\nEmail: ${email}\nWebsite: ${website}\n\nTime: ${new Date().toISOString()}`
        });
        console.log('[notify-signup] Email sent successfully:', result);
        return res.status(200).json({ success: true, id: result.id });
    } catch (err) {
        console.log('[notify-signup] Failed to send:', err.message);
        return res.status(200).json({ success: false, error: err.message });
    }
}
