// lib/emailService.js
// Email service using Resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send shareable chatbot link email
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.domain - Website domain
 * @param {string} options.shareUrl - Full shareable URL
 * @param {string} options.companyName - Company name (optional)
 * @returns {Promise} Resend API response
 */
export async function sendShareableLinkEmail({ to, domain, shareUrl, companyName }) {
    const displayName = companyName || domain;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #E76F00; margin: 0;">Your AI Chatbot is Ready!</h1>
    </div>

    <p>Great news! Your personalized AI chatbot for <strong>${displayName}</strong> is live and ready to chat.</p>

    <div style="background: linear-gradient(135deg, #00234C 0%, #003366 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
        <p style="color: #fff; margin: 0 0 20px 0; font-size: 16px;">Share this permanent link:</p>
        <a href="${shareUrl}" style="display: inline-block; background-color: #E76F00; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
            Open Your Chatbot
        </a>
        <p style="color: #aaa; margin: 20px 0 0 0; font-size: 14px; word-break: break-all;">
            ${shareUrl}
        </p>
    </div>

    <p>This link is permanent and can be shared:</p>
    <ul style="color: #666;">
        <li>On your website</li>
        <li>In social media posts</li>
        <li>With clients and prospects</li>
        <li>In email signatures</li>
    </ul>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <p style="color: #888; font-size: 12px; text-align: center;">
        Powered by <a href="https://membies.com" style="color: #E76F00;">Member Solutions</a>
    </p>
</body>
</html>
    `.trim();

    const text = `
Your AI Chatbot is Ready!

Great news! Your personalized AI chatbot for ${displayName} is live and ready to chat.

Share this permanent link: ${shareUrl}

This link is permanent and can be shared on your website, social media, with clients, or in email signatures.

Powered by Member Solutions
    `.trim();

    return resend.emails.send({
        from: process.env.EMAIL_FROM || 'Magic Page <noreply@membies.com>',
        to,
        subject: `Your AI Chatbot for ${displayName} is Ready!`,
        html,
        text
    });
}

/**
 * Check if Resend is configured
 * @returns {boolean}
 */
export function isEmailConfigured() {
    return !!process.env.RESEND_API_KEY;
}
