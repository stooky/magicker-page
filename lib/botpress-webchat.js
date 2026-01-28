/**
 * Shared Botpress webchat initialization module.
 *
 * Consolidates 4 duplicated init paths (PRELOAD, FAST, NORMAL, SHAREABLE)
 * into reusable primitives and 3 orchestrators.
 *
 * Module-level state replaces window.__* globals.
 */
import { SETTING_KB, DEBUG_BOTPRESS_REQUESTS, DEBUG_OPTIONS } from '../configuration/debugConfig';
import { CONFIG } from '../configuration/masterConfig';

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
const log = (msg, data) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    if (data !== undefined) {
        console.log(`[${timestamp}] [WEBCHAT] ${msg}`, data);
    } else {
        console.log(`[${timestamp}] [WEBCHAT] ${msg}`);
    }
};

const logEvent = (eventName, data) => {
    if (!DEBUG_BOTPRESS_REQUESTS || !DEBUG_OPTIONS.LOG_WEBCHAT_EVENTS) return;
    log(`EVENT: ${eventName}`, data);
};

const logRequest = (action, data) => {
    if (!DEBUG_BOTPRESS_REQUESTS || !DEBUG_OPTIONS.LOG_WEBCHAT_INIT) return;
    log(`REQUEST: ${action}`, data);
};

// ---------------------------------------------------------------------------
// Module-level state (replaces window.__* globals)
// ---------------------------------------------------------------------------
let _preloaded = false;
let _conversationReady = false;
let _conversationId = null;
let _shareChatReady = false;
let _shareGreetingSent = false;
let _shareEmailTriggered = false;
let _theme = null;

export const state = {
    get preloaded() { return _preloaded; },
    set preloaded(v) { _preloaded = v; },

    get conversationReady() { return _conversationReady; },
    set conversationReady(v) { _conversationReady = v; },

    get conversationId() { return _conversationId; },
    set conversationId(v) { _conversationId = v; },

    get shareChatReady() { return _shareChatReady; },
    set shareChatReady(v) { _shareChatReady = v; },

    get shareGreetingSent() { return _shareGreetingSent; },
    set shareGreetingSent(v) { _shareGreetingSent = v; },

    get shareEmailTriggered() { return _shareEmailTriggered; },
    set shareEmailTriggered(v) { _shareEmailTriggered = v; },

    get theme() { return _theme; },
    set theme(v) { _theme = v; },
};

// ---------------------------------------------------------------------------
// Primitive operations
// ---------------------------------------------------------------------------

/** Inject CSS that hides the Botpress webchat widget during initialization. */
export function injectHideCSS() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('botpress-preload-hide')) return;

    const style = document.createElement('style');
    style.id = 'botpress-preload-hide';
    style.textContent = `
        #bp-web-widget-container,
        .bpw-widget-btn,
        [class*="WebchatContainer"],
        [class*="webchat"],
        [class*="Webchat"],
        [id*="bp-"],
        [id*="botpress"],
        div[class^="bpw-"],
        div[class*=" bpw-"],
        iframe[title*="chat"],
        iframe[title*="Chat"],
        iframe[src*="botpress"] {
            opacity: 0 !important;
            pointer-events: none !important;
            visibility: hidden !important;
            position: fixed !important;
            left: -9999px !important;
            top: -9999px !important;
        }
    `;
    document.head.appendChild(style);
    log('Injected hide CSS');
}

/** Remove hide CSS and loading overlay (with optional fade). */
export function removeHideCSS({ fade = false } = {}) {
    if (typeof document === 'undefined') return;

    const style = document.getElementById('botpress-preload-hide');
    if (style) {
        style.remove();
        log('Removed hide CSS');
    }

    const overlay = document.getElementById('webchat-loading-overlay');
    if (overlay) {
        if (fade) {
            overlay.style.transition = 'opacity 0.3s ease-out';
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.remove(); log('Removed loading overlay (faded)'); }, 300);
        } else {
            overlay.remove();
            log('Removed loading overlay');
        }
    }
}

/** Inject a loading animation overlay in the bottom-right corner. */
export function injectLoadingOverlay() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('webchat-loading-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'webchat-loading-overlay';
    overlay.innerHTML = `
        <img
            src="${CONFIG.branding.loadingAnimationPath}"
            alt="Loading..."
            style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 80px;
                height: 80px;
                object-fit: cover;
                z-index: 99999;
                border-radius: 50%;
            "
        />
    `;
    document.body.appendChild(overlay);
    log('Injected loading overlay');
}

/** Clear Botpress-related localStorage keys to force a fresh session. */
export function clearBotpressStorage() {
    if (typeof window === 'undefined') return;

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('bp/') || key.includes('botpress'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (keysToRemove.length > 0) {
        log(`Cleared ${keysToRemove.length} Botpress localStorage keys`);
    }
}

/**
 * Load the Botpress inject script and wait for `window.botpress` to appear.
 * Resolves with the `bp` object or rejects on timeout.
 */
export function loadInjectScript(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        if (typeof document === 'undefined') {
            reject(new Error('No document'));
            return;
        }

        // Already loaded?
        if (window.botpress) {
            log('Inject script already loaded');
            resolve(window.botpress);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.botpress.cloud/webchat/v2.2/inject.js';

        script.onload = async () => {
            log('Inject script loaded');
            let attempts = 0;
            const maxAttempts = Math.ceil(timeoutMs / 100);
            while (!window.botpress && attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }
            if (window.botpress) {
                log('window.botpress available');
                resolve(window.botpress);
            } else {
                reject(new Error('window.botpress not available after timeout'));
            }
        };

        script.onerror = (err) => {
            log('Failed to load inject script');
            reject(new Error('Failed to load Botpress inject script'));
        };

        document.body.appendChild(script);
    });
}

/** Build the bp.init() configuration object from a theme. */
export function buildInitConfig(theme) {
    const t = theme || CONFIG.defaultBotTheme;
    return {
        botId: CONFIG.botpress.botId,
        clientId: CONFIG.botpress.clientId,
        configuration: {
            botName: t.name,
            botDescription: t.description || 'Your friendly assistant',
            botAvatar: t.avatar,
            color: t.primaryColor,
            variant: 'solid',
            themeMode: 'light',
            fontFamily: 'inter',
            radius: 1,
        },
    };
}

/**
 * Set user data on the Botpress user (updateUser + verify).
 * Returns true if verified, false otherwise.
 */
export async function setUserData(bp, { domain, kbFileId, website, sessionID }) {
    if (SETTING_KB !== 'USERDATA') return false;

    log('Setting user data BEFORE conversation...');
    try {
        const userBefore = await bp.getUser();
        if (!userBefore || !userBefore.id) {
            log('ERROR: User does not exist');
            return false;
        }
        log('User exists. ID:', userBefore.id);

        const dataToSet = {
            domain,
            fileId: kbFileId || '',
            website,
            sessionID,
        };
        log('Setting user.data:', JSON.stringify(dataToSet));

        await bp.updateUser({ data: dataToSet });
        log('updateUser() completed');

        // Wait for sync to Botpress server
        await new Promise(r => setTimeout(r, 500));

        // Verify
        const userAfter = await bp.getUser();
        if (userAfter?.data?.domain === domain) {
            log('VERIFIED: user.data.domain =', userAfter.data.domain);
            return true;
        } else {
            log('WARNING: user.data.domain verification failed');
            return false;
        }
    } catch (e) {
        log('ERROR setting user data:', e.message);
        return false;
    }
}

/**
 * Wait for the 'conversation' event from Botpress.
 * Sets module state when conversation starts.
 */
export function setupConversationListener(bp) {
    bp.on('conversation', (convId) => {
        log('Conversation started:', convId);
        state.conversationReady = true;
        state.conversationId = convId;
    });
}

/** Wait until state.conversationReady or timeout. */
export async function waitForConversation(timeoutMs = 10000) {
    if (state.conversationReady) return true;
    const start = Date.now();
    while (!state.conversationReady && Date.now() - start < timeoutMs) {
        await new Promise(r => setTimeout(r, 200));
    }
    if (state.conversationReady) {
        log('Conversation ready');
        return true;
    }
    log('Conversation timeout after', timeoutMs, 'ms');
    return false;
}

/**
 * Send greeting message, respecting SETTING_KB mode.
 */
export async function sendGreeting(bp, { domain, kbFileId, website, sessionID }) {
    log('Sending greeting. SETTING_KB mode:', SETTING_KB);

    if (SETTING_KB === 'USERDATA') {
        const greeting = `Hi! I'd like to learn more about ${domain}.`;
        log('USERDATA mode — sending clean greeting:', greeting);
        await bp.sendMessage(greeting);

    } else if (SETTING_KB === 'MESSAGE') {
        const contextTag = `[CONTEXT:domain=${domain},fileId=${kbFileId || ''}]`;
        const greeting = `${contextTag}\nHi! I'd like to learn more about ${domain}.`;
        log('MESSAGE mode — sending with context:', greeting);
        await bp.sendMessage(greeting);

    } else if (SETTING_KB === 'EVENT') {
        log('EVENT mode — sending context event...');
        await bp.sendEvent({
            type: 'setContext',
            payload: { domain, fileId: kbFileId || '', website, sessionID },
        });
        await new Promise(r => setTimeout(r, 300));
        const greeting = `Hi! I'd like to learn more about ${domain}.`;
        log('EVENT mode — sending clean greeting:', greeting);
        await bp.sendMessage(greeting);

    } else {
        const greeting = `Hi! I'd like to learn more about ${domain}.`;
        await bp.sendMessage(greeting);
    }

    log('Greeting sent successfully');
}

/** Fire-and-forget: trigger shareable link email. */
export function triggerShareEmail(sessionID, domain) {
    if (state.shareEmailTriggered || !sessionID) return;
    state.shareEmailTriggered = true;

    fetch('/api/share/trigger-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionID, domain }),
    })
        .then(res => res.json())
        .then(data => log('Share email trigger response:', data))
        .catch(err => log('Share email trigger failed (non-critical):', err.message));
}

/**
 * Wait for a condition function to return truthy, with timeout.
 */
export function waitFor(checkFn, maxWaitMs = 5000, intervalMs = 200) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = async () => {
            try {
                const result = await checkFn();
                if (result) { resolve(result); return; }
            } catch (e) { /* continue waiting */ }
            if (Date.now() - startTime >= maxWaitMs) {
                reject(new Error('Timeout waiting for condition'));
                return;
            }
            setTimeout(check, intervalMs);
        };
        check();
    });
}

// ---------------------------------------------------------------------------
// Orchestrators
// ---------------------------------------------------------------------------

/**
 * PRELOAD: Load inject script + init() during scanning phase.
 * Does NOT open or send messages — that happens later in Valhallah via openAndGreet().
 */
export async function preloadWebchat(theme) {
    if (typeof window === 'undefined') return;
    if (state.preloaded) {
        log('Already preloaded, skipping');
        return;
    }

    log('Starting webchat preload...');

    injectHideCSS();
    injectLoadingOverlay();
    clearBotpressStorage();

    // Reset conversation state for fresh session
    state.conversationReady = false;
    state.conversationId = null;

    try {
        const bp = await loadInjectScript();

        setupConversationListener(bp);

        bp.on('webchat:ready', () => log('Webchat ready event'));

        // Use provided theme or fall back to module state / default
        const t = theme || state.theme || CONFIG.defaultBotTheme;
        log('Using theme:', t.name, t.primaryColor);

        const initConfig = buildInitConfig(t);
        logRequest('bp.init()', initConfig);
        bp.init(initConfig);
        log('init() called — NOT opening yet (Valhallah will open)');

        // Mark preloaded, but conversation NOT ready
        state.preloaded = true;
        state.conversationReady = false;

    } catch (e) {
        log('Preload failed:', e.message);
    }
}

/**
 * FAST PATH: Webchat was preloaded during scanning.
 * updateUser → open → wait for conversation → sendMessage
 */
export async function openAndGreet(bp, { domain, kbFileId, website, sessionID }) {
    log('FAST PATH: Starting...');

    // Step 1: Set user data before opening
    await setUserData(bp, { domain, kbFileId, website, sessionID });

    // Step 2: Set up conversation listener (may already be set from preload, but safe to add again)
    setupConversationListener(bp);

    // Step 3: Open webchat
    log('FAST PATH: Opening webchat...');
    try {
        await bp.open();
        log('Webchat opened');
    } catch (e) {
        log('ERROR opening webchat:', e.message);
    }

    // Step 4: Wait for conversation
    await waitForConversation(10000);
    await new Promise(r => setTimeout(r, 300)); // stability delay

    // Step 5: Send greeting
    log('FAST PATH: Sending greeting...');
    try {
        await sendGreeting(bp, { domain, kbFileId, website, sessionID });
        triggerShareEmail(sessionID, domain);
    } catch (e) {
        log('ERROR sending greeting:', e.message);
    }

    log('FAST PATH complete');
}

/**
 * FULL INIT: Load script, init, set user data, open, wait, send greeting.
 * Used by NORMAL path (Valhallah) and SHAREABLE path ([slug].js).
 *
 * @param {Object} opts
 * @param {string} opts.domain
 * @param {string} opts.kbFileId
 * @param {string} opts.website
 * @param {string} opts.sessionID
 * @param {Object} opts.theme - Bot theme object
 * @param {boolean} opts.retryOpen - Whether to retry bp.open() up to 3 times (NORMAL path)
 * @param {boolean} opts.markShareReady - Whether to set shareChatReady/shareGreetingSent (SHAREABLE path)
 */
export async function fullInit({ domain, kbFileId, website, sessionID, theme, retryOpen = false, markShareReady = false }) {
    log('FULL INIT: Starting...');

    injectHideCSS();
    injectLoadingOverlay();
    clearBotpressStorage();

    // Reset conversation state
    state.conversationReady = false;
    state.conversationId = null;

    let bp;
    try {
        bp = await loadInjectScript();
    } catch (e) {
        log('FULL INIT: Failed to load inject script:', e.message);
        removeHideCSS();
        return;
    }

    // Set up event listeners BEFORE init
    const readyPromise = new Promise(resolve => {
        bp.on('webchat:ready', () => {
            logEvent('webchat:ready');
            resolve();
        });
    });

    setupConversationListener(bp);

    bp.on('webchat:opened', () => logEvent('webchat:opened'));
    bp.on('webchat:closed', () => logEvent('webchat:closed'));
    bp.on('message', (msg) => logEvent('message', msg?.payload?.text?.substring(0, 100)));
    bp.on('error', (err) => logEvent('error', err));

    // Init webchat
    const t = theme || state.theme || CONFIG.defaultBotTheme;
    log('Using theme:', t.name, t.primaryColor);
    const initConfig = buildInitConfig(t);
    logRequest('bp.init()', initConfig);
    bp.init(initConfig);
    log('init() called');

    // Wait for webchat:ready
    log('Waiting for webchat:ready...');
    await Promise.race([readyPromise, new Promise(r => setTimeout(r, 5000))]);

    // Set user data BEFORE opening
    await setUserData(bp, { domain, kbFileId, website, sessionID });

    // Open webchat (with optional retry)
    log('Opening webchat...');
    const maxAttempts = retryOpen ? 3 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await bp.open();
            log('Webchat opened on attempt', attempt);
            break;
        } catch (e) {
            log('Open attempt', attempt, 'failed:', e.message);
            if (attempt < maxAttempts) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    // Wait for conversation
    await waitForConversation(10000);
    await new Promise(r => setTimeout(r, retryOpen ? 500 : 300)); // stability delay

    // Send greeting
    log('Sending greeting...');
    try {
        await sendGreeting(bp, { domain, kbFileId, website, sessionID });
        triggerShareEmail(sessionID, domain);

        // Final user state verification (debug)
        try {
            const finalUser = await bp.getUser();
            log('Final user state — id:', finalUser?.id, 'data:', finalUser?.data);
        } catch (e) { /* non-critical */ }
    } catch (e) {
        log('ERROR sending greeting:', e.message);
    }

    // Mark share-specific flags if this is the shareable path
    if (markShareReady) {
        state.preloaded = true;
        state.shareChatReady = true;
        state.shareGreetingSent = true;
    }

    removeHideCSS();

    log('FULL INIT complete');
}
