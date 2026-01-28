/**
 * Resend email client singleton.
 * Reuses a single client instance across all requests to reduce connection overhead.
 */
import { Resend } from 'resend';

let resendInstance = null;

/**
 * Get the shared Resend client instance.
 * Creates the client lazily on first call.
 * @returns {Resend|null} Resend client instance, or null if API key not configured
 */
export function getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return null;
    }
    if (!resendInstance) {
        resendInstance = new Resend(apiKey);
    }
    return resendInstance;
}

/**
 * Check if Resend is configured.
 * @returns {boolean}
 */
export function isResendConfigured() {
    return !!process.env.RESEND_API_KEY;
}
