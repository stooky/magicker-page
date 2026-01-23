// pages/api/notify-signup.js
// Send signup notifications: one to admin, one to submitter
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email, website } = req.body;
    console.log('[notify-signup] Called with:', { email, website });

    if (!resend) {
        console.log('[notify-signup] Resend not configured (missing RESEND_API_KEY)');
        return res.status(200).json({ success: false, reason: 'email not configured' });
    }

    const fromAddress = process.env.EMAIL_FROM || 'Magic Page <noreply@membies.com>';
    const notifyTo = process.env.NOTIFY_EMAIL;
    const results = { admin: null, user: null };

    // 1. Send notification to admin
    if (notifyTo) {
        try {
            console.log('[notify-signup] Sending admin notification to:', notifyTo);
            console.log('[notify-signup] From address:', fromAddress);
            const adminResult = await resend.emails.send({
                from: fromAddress,
                to: notifyTo,
                subject: `New Magic Page Signup: ${website}`,
                text: `New signup!\n\nEmail: ${email}\nWebsite: ${website}\n\nTime: ${new Date().toISOString()}`
            });
            console.log('[notify-signup] Admin email result:', JSON.stringify(adminResult));
            results.admin = adminResult;
        } catch (err) {
            console.log('[notify-signup] Admin email failed:', err.message);
            console.log('[notify-signup] Admin email error details:', JSON.stringify(err));
        }
    }

    // 2. Send confirmation to the user who submitted
    if (email && email.includes('@')) {
        try {
            console.log('[notify-signup] Sending confirmation to user:', email);
            const userResult = await resend.emails.send({
                from: fromAddress,
                to: email,
                subject: `Your AI Chatbot for ${website} is Being Created!`,
                html: `
                    <h2>Thanks for trying Magic Page!</h2>
                    <p>We're building an AI chatbot for <strong>${website}</strong>.</p>
                    <p>Your chatbot will be ready in just a moment. Stay on the page to see it in action!</p>
                    <br>
                    <p>- The Member Solutions Team</p>
                `,
                text: `Thanks for trying Magic Page!\n\nWe're building an AI chatbot for ${website}.\n\nYour chatbot will be ready in just a moment. Stay on the page to see it in action!\n\n- The Member Solutions Team`
            });
            console.log('[notify-signup] User email result:', JSON.stringify(userResult));
            results.user = userResult;
        } catch (err) {
            console.log('[notify-signup] User email failed:', err.message);
            console.log('[notify-signup] User email error details:', JSON.stringify(err));
        }
    }

    return res.status(200).json({ success: true, results });
}
