/**
 * OpenAI client singleton.
 * Reuses a single client instance across all requests to reduce connection overhead.
 */
import OpenAI from 'openai';

let openaiInstance = null;

/**
 * Get the shared OpenAI client instance.
 * Creates the client lazily on first call.
 * @returns {OpenAI|null} OpenAI client instance, or null if API key not configured
 */
export function getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return null;
    }
    if (!openaiInstance) {
        openaiInstance = new OpenAI({ apiKey });
    }
    return openaiInstance;
}

/**
 * Check if OpenAI is configured.
 * @returns {boolean}
 */
export function isOpenAIConfigured() {
    return !!process.env.OPENAI_API_KEY;
}
