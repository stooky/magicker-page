// pages/api/notify-signup.js
// Send signup notifications: one to admin (with full details), one to submitter
const { Resend } = require('resend');
const pool = require('../../components/utils/database');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Format date for display
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Extract domain from URL for display
function extractDomain(url) {
    if (!url) return 'N/A';
    try {
        const parsed = url.startsWith('http') ? new URL(url) : new URL(`https://${url}`);
        return parsed.hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

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

    // Use verified domain or Resend's test address
    const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const notifyTo = process.env.NOTIFY_EMAIL;
    const results = { admin: null, user: null };

    // Fetch all visitors from database for admin email
    let allVisitors = [];
    let currentVisitor = null;
    const domain = extractDomain(website);

    try {
        const query = `
            SELECT
                sessionid,
                email,
                website,
                companyname,
                slug,
                kb_file_id,
                share_email_sent,
                first_message_at,
                created_at,
                updated_at
            FROM websitevisitors
            ORDER BY created_at DESC
            LIMIT 100;
        `;
        const result = await pool.query(query);
        allVisitors = result.rows;

        // Find current visitor (match by email + domain)
        currentVisitor = allVisitors.find(v =>
            v.email === email && extractDomain(v.website) === domain
        );

        console.log(`[notify-signup] Found ${allVisitors.length} total visitors in database`);
    } catch (err) {
        console.log('[notify-signup] Database query failed:', err.message);
        // Continue without database data - still send basic notification
    }

    // 1. Send notification to admin
    if (notifyTo) {
        try {
            console.log('[notify-signup] Sending admin notification to:', notifyTo);

            const baseUrl = process.env.SHARE_LINK_BASE_URL || 'https://mb.membies.com';
            const shareUrl = currentVisitor?.slug ? `${baseUrl}/${currentVisitor.slug}` : null;

            // Build detailed HTML email
            const adminHtml = buildAdminEmail({
                email,
                website,
                domain,
                currentVisitor,
                allVisitors,
                shareUrl,
                baseUrl
            });

            // Build plain text version
            const adminText = buildAdminText({
                email,
                website,
                domain,
                currentVisitor,
                allVisitors,
                shareUrl
            });

            const adminResult = await resend.emails.send({
                from: fromAddress,
                to: notifyTo,
                subject: `🤖 New Signup: ${domain} (${email})`,
                html: adminHtml,
                text: adminText
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

// Build detailed HTML email for admin
function buildAdminEmail({ email, website, domain, currentVisitor, allVisitors, shareUrl, baseUrl }) {
    // Filter to only show previous entries that match either the same email OR same domain
    // (excluding the current visitor)
    const relatedVisitors = allVisitors.filter(v => {
        // Skip current visitor
        if (v.email === email && extractDomain(v.website) === domain) return false;
        // Include if email matches OR domain matches
        return v.email === email || extractDomain(v.website) === domain;
    });
    const totalCount = allVisitors.length;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #00234C 0%, #1863DC 100%); color: white; padding: 30px; }
        .header h1 { margin: 0 0 10px 0; font-size: 24px; }
        .header .subtitle { opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .detail-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .detail-row { display: flex; margin-bottom: 12px; }
        .detail-label { font-weight: 600; color: #666; width: 140px; flex-shrink: 0; }
        .detail-value { color: #333; word-break: break-all; }
        .detail-value a { color: #1863DC; text-decoration: none; }
        .detail-value a:hover { text-decoration: underline; }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .status-yes { background: #d4edda; color: #155724; }
        .status-no { background: #fff3cd; color: #856404; }
        .divider { border-top: 1px solid #eee; margin: 25px 0; }
        .history-title { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 15px; }
        .history-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .history-table th { text-align: left; padding: 10px 8px; background: #f0f0f0; color: #555; font-weight: 600; border-bottom: 2px solid #ddd; }
        .history-table td { padding: 10px 8px; border-bottom: 1px solid #eee; }
        .history-table tr:hover { background: #fafafa; }
        .footer { background: #f8f9fa; padding: 20px 30px; font-size: 12px; color: #888; text-align: center; }
        .cta-button { display: inline-block; background: #F48D03; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 10px; }
        .stat-box { display: inline-block; background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 6px; margin-right: 10px; margin-top: 10px; }
        .stat-number { font-size: 20px; font-weight: bold; }
        .stat-label { font-size: 11px; opacity: 0.8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 New Chatbot Signup!</h1>
            <div class="subtitle">${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
            <div style="margin-top: 15px;">
                <div class="stat-box">
                    <div class="stat-number">${totalCount}</div>
                    <div class="stat-label">Total Signups</div>
                </div>
            </div>
        </div>

        <div class="content">
            <div class="detail-card">
                <h3 style="margin-top: 0; color: #1863DC;">📋 New Signup Details</h3>

                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value"><a href="mailto:${email}">${email}</a></div>
                </div>

                <div class="detail-row">
                    <div class="detail-label">Website:</div>
                    <div class="detail-value"><a href="${website.startsWith('http') ? website : 'https://' + website}" target="_blank">${website}</a></div>
                </div>

                <div class="detail-row">
                    <div class="detail-label">Domain:</div>
                    <div class="detail-value">${domain}</div>
                </div>

                ${currentVisitor ? `
                <div class="detail-row">
                    <div class="detail-label">Company:</div>
                    <div class="detail-value">${currentVisitor.companyname || 'Not detected'}</div>
                </div>

                <div class="detail-row">
                    <div class="detail-label">Session ID:</div>
                    <div class="detail-value" style="font-family: monospace; font-size: 12px;">${currentVisitor.sessionid}</div>
                </div>

                <div class="detail-row">
                    <div class="detail-label">KB File ID:</div>
                    <div class="detail-value" style="font-family: monospace; font-size: 12px;">${currentVisitor.kb_file_id || 'Not created yet'}</div>
                </div>

                <div class="detail-row">
                    <div class="detail-label">Share Email:</div>
                    <div class="detail-value">
                        <span class="status-badge ${currentVisitor.share_email_sent ? 'status-yes' : 'status-no'}">
                            ${currentVisitor.share_email_sent ? '✓ Sent' : 'Pending'}
                        </span>
                    </div>
                </div>

                <div class="detail-row">
                    <div class="detail-label">First Message:</div>
                    <div class="detail-value">${currentVisitor.first_message_at ? formatDate(currentVisitor.first_message_at) : 'Not yet'}</div>
                </div>

                <div class="detail-row">
                    <div class="detail-label">Created:</div>
                    <div class="detail-value">${formatDate(currentVisitor.created_at)}</div>
                </div>
                ` : `
                <div class="detail-row">
                    <div class="detail-label">Status:</div>
                    <div class="detail-value"><span class="status-badge status-no">Processing...</span></div>
                </div>
                `}

                ${shareUrl ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                    <div class="detail-label" style="margin-bottom: 8px;">Shareable Link:</div>
                    <a href="${shareUrl}" class="cta-button">Open Chatbot →</a>
                    <div style="margin-top: 10px; font-size: 12px; color: #888; word-break: break-all;">${shareUrl}</div>
                </div>
                ` : ''}
            </div>

            ${relatedVisitors.length > 0 ? `
            <div class="divider"></div>

            <div class="history-title">📊 Related Previous Signups (${relatedVisitors.length})</div>
            <p style="font-size: 12px; color: #888; margin: 0 0 15px 0;">Showing entries with matching email or domain</p>

            <table class="history-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Email</th>
                        <th>Domain</th>
                        <th>Company</th>
                        <th>Link</th>
                    </tr>
                </thead>
                <tbody>
                    ${relatedVisitors.slice(0, 20).map(v => `
                    <tr>
                        <td style="white-space: nowrap;">${formatDate(v.created_at)}</td>
                        <td><a href="mailto:${v.email}" style="color: #1863DC; text-decoration: none;">${v.email || 'N/A'}</a></td>
                        <td>${extractDomain(v.website)}</td>
                        <td>${v.companyname || '-'}</td>
                        <td>${v.slug ? `<a href="${baseUrl}/${v.slug}" style="color: #F48D03; text-decoration: none;">View</a>` : '-'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            ${relatedVisitors.length > 20 ? `<p style="font-size: 12px; color: #888; margin-top: 10px;">+ ${relatedVisitors.length - 20} more...</p>` : ''}
            ` : ''}
        </div>

        <div class="footer">
            Magic Page Admin Notification • Member Solutions
        </div>
    </div>
</body>
</html>
    `.trim();
}

// Build plain text version for admin
function buildAdminText({ email, website, domain, currentVisitor, allVisitors, shareUrl }) {
    // Filter to only show previous entries that match either the same email OR same domain
    const relatedVisitors = allVisitors.filter(v => {
        if (v.email === email && extractDomain(v.website) === domain) return false;
        return v.email === email || extractDomain(v.website) === domain;
    });

    let text = `
🤖 NEW CHATBOT SIGNUP
=====================

Email: ${email}
Website: ${website}
Domain: ${domain}
Time: ${new Date().toISOString()}
`;

    if (currentVisitor) {
        text += `
Company: ${currentVisitor.companyname || 'Not detected'}
Session ID: ${currentVisitor.sessionid}
KB File ID: ${currentVisitor.kb_file_id || 'Not created yet'}
Share Email Sent: ${currentVisitor.share_email_sent ? 'Yes' : 'No'}
First Message: ${currentVisitor.first_message_at ? formatDate(currentVisitor.first_message_at) : 'Not yet'}
Created: ${formatDate(currentVisitor.created_at)}
`;
    }

    if (shareUrl) {
        text += `\nShareable Link: ${shareUrl}\n`;
    }

    if (relatedVisitors.length > 0) {
        text += `
---------------------
RELATED PREVIOUS SIGNUPS (${relatedVisitors.length})
(matching email or domain)
---------------------
`;
        relatedVisitors.slice(0, 10).forEach(v => {
            text += `\n• ${v.email || 'N/A'} - ${extractDomain(v.website)} (${formatDate(v.created_at)})`;
        });

        if (relatedVisitors.length > 10) {
            text += `\n\n+ ${relatedVisitors.length - 10} more...`;
        }
    }

    text += `\n\n---\nTotal Signups: ${allVisitors.length}`;

    return text.trim();
}
