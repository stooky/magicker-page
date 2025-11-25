/**
 * Debug Configuration for Botpress Integration
 *
 * Set DEBUG_BOTPRESS_REQUESTS to true to log all requests to Botpress
 * in chronological order with full JSON/JWT payloads.
 */

// Master debug flag - set to true to enable verbose Botpress request logging
export const DEBUG_BOTPRESS_REQUESTS = true;

// Individual debug flags (only apply when DEBUG_BOTPRESS_REQUESTS is true)
export const DEBUG_OPTIONS = {
    // Log KB creation requests and responses
    LOG_KB_REQUESTS: true,

    // Log JWT token generation
    LOG_JWT_REQUESTS: true,

    // Log webchat init() calls with full config
    LOG_WEBCHAT_INIT: true,

    // Log session creation requests
    LOG_SESSION_REQUESTS: true,

    // Log file status polling
    LOG_STATUS_POLLING: true,

    // Log webchat events (message, ready, etc.)
    LOG_WEBCHAT_EVENTS: true,
};

// Sequence counter for chronological ordering
let requestSequence = 0;

/**
 * Get next sequence number for request logging
 */
export function getNextSequence() {
    return ++requestSequence;
}

/**
 * Reset sequence counter (useful for new sessions)
 */
export function resetSequence() {
    requestSequence = 0;
}

/**
 * Format a debug log entry with timestamp and sequence
 * @param {string} category - Category of the request (KB, JWT, WEBCHAT, etc.)
 * @param {string} action - Action being performed
 * @param {object} data - Data to log
 */
export function logBotpressRequest(category, action, data) {
    if (!DEBUG_BOTPRESS_REQUESTS) return;

    const seq = getNextSequence();
    const timestamp = new Date().toISOString();

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════');
    console.log(`║ [${seq}] BOTPRESS REQUEST - ${category}`);
    console.log(`║ Time: ${timestamp}`);
    console.log(`║ Action: ${action}`);
    console.log('╠══════════════════════════════════════════════════════════════');
    console.log('║ Payload:');
    console.log(JSON.stringify(data, null, 2).split('\n').map(line => `║   ${line}`).join('\n'));
    console.log('╚══════════════════════════════════════════════════════════════');
    console.log('');
}

/**
 * Format a debug log entry for responses
 * @param {string} category - Category of the request
 * @param {string} action - Action that was performed
 * @param {object} response - Response data to log
 * @param {number} durationMs - Duration of request in milliseconds
 */
export function logBotpressResponse(category, action, response, durationMs = null) {
    if (!DEBUG_BOTPRESS_REQUESTS) return;

    const seq = getNextSequence();
    const timestamp = new Date().toISOString();

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════');
    console.log(`║ [${seq}] BOTPRESS RESPONSE - ${category}`);
    console.log(`║ Time: ${timestamp}`);
    console.log(`║ Action: ${action}`);
    if (durationMs !== null) {
        console.log(`║ Duration: ${durationMs}ms`);
    }
    console.log('╠══════════════════════════════════════════════════════════════');
    console.log('║ Response:');
    console.log(JSON.stringify(response, null, 2).split('\n').map(line => `║   ${line}`).join('\n'));
    console.log('╚══════════════════════════════════════════════════════════════');
    console.log('');
}
