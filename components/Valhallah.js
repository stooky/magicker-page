import React, { useEffect, useState, useRef } from 'react';
import '../src/css/main.css';
import '../src/css/mockbox.css';
import '../src/css/thumbnail.css';
import '../src/css/ai_agent.css';
import '../src/css/weird_stuff.css';
import '../src/css/style.css';
import { DEBUG_BOTPRESS_REQUESTS, DEBUG_OPTIONS, SETTING_KB } from '../configuration/debugConfig';
import { CONFIG } from '../configuration/masterConfig';

// Simple terminal-style logging
const log = (msg, data) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    if (data !== undefined) {
        console.log(`[${timestamp}] [VALHALLAH] ${msg}`, data);
    } else {
        console.log(`[${timestamp}] [VALHALLAH] ${msg}`);
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

// Clear Botpress localStorage to force fresh session
const clearBotpressStorage = () => {
    if (typeof window === 'undefined') return;

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('bp/') || key.includes('botpress'))) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        log(`Cleared localStorage: ${key}`);
    });

    if (keysToRemove.length > 0) {
        log(`Cleared ${keysToRemove.length} Botpress localStorage keys`);
    }
};

// Wait for a condition with timeout
const waitFor = (checkFn, maxWaitMs = 5000, intervalMs = 200) => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const check = async () => {
            try {
                const result = await checkFn();
                if (result) {
                    resolve(result);
                    return;
                }
            } catch (e) {
                // Continue waiting
            }

            if (Date.now() - startTime >= maxWaitMs) {
                reject(new Error('Timeout waiting for condition'));
                return;
            }

            setTimeout(check, intervalMs);
        };

        check();
    });
};

// Default Marv theme (fallback)
const DEFAULT_BOT_THEME = {
    name: 'Marv',
    avatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=marv&backgroundColor=b6e3f4&eyes=happy&mouth=smile01',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    description: 'Your friendly assistant'
};

export default function Valhallah({ authToken, domain, isReturning, isShareableLink = false, screenshotUrl, sessionID, website, kbFileId, botTheme = DEFAULT_BOT_THEME }) {
    const hasInitialized = useRef(false);
    const [chatReady, setChatReady] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);
    const [userDataConfirmed, setUserDataConfirmed] = useState(false);

    // Store domain globally
    if (typeof window !== 'undefined') {
        window.__MAGIC_PAGE_DOMAIN__ = domain;
        window.__MAGIC_PAGE_WEBSITE__ = website;
        window.__MAGIC_PAGE_SESSION__ = sessionID;
        window.__MAGIC_PAGE_KB_FILE_ID__ = kbFileId;
        // Note: shareable links now preload botpress during init screen,
        // so they can use the FAST PATH just like the main flow
    }

    // Log on first mount
    if (!hasInitialized.current) {
        log('--- COMPONENT MOUNTED ---');
        log('Props:', {
            authToken: authToken ? authToken.substring(0, 20) + '...' : 'NOT PROVIDED',
            domain: domain || 'NOT PROVIDED',
            website: website || 'NOT PROVIDED',
            sessionID: sessionID || 'NOT PROVIDED',
            kbFileId: kbFileId || 'NOT PROVIDED',
            isReturning,
            isShareableLink,
            hasScreenshot: !!screenshotUrl,
            botTheme: botTheme?.name || 'DEFAULT'
        });
        log('Theme:', botTheme?.name, '| Color:', botTheme?.primaryColor);
    }

    // Fade-in animation
    useEffect(() => {
        const timer = setTimeout(() => setFadeIn(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Note: Loading overlay is now removed by index.js when transitioning to CHAT_TEASE

    // Main webchat initialization
    useEffect(() => {
        if (hasInitialized.current) {
            log('Already initialized, skipping');
            return;
        }
        hasInitialized.current = true;

        log('--- STARTING WEBCHAT INITIALIZATION ---');
        log('Target domain:', domain);
        log('Target fileId:', kbFileId);

        // Always clear old Botpress localStorage first (fixes stale session issues)
        log('Clearing old Botpress localStorage...');
        clearBotpressStorage();

        // Check if shareable link already did full initialization (including greeting)
        if (window.__SHARE_CHAT_READY__ && window.__SHARE_GREETING_SENT__ && window.botpress) {
            log('SKIP PATH: Shareable link already fully initialized!');
            log('Chat ready:', window.__SHARE_CHAT_READY__);
            log('Greeting sent:', window.__SHARE_GREETING_SENT__);
            setChatReady(true);
            // Nothing to do - everything is already set up
            return;
        }

        // Check if webchat was preloaded during scanning phase
        if (window.__BOTPRESS_PRELOADED__ && window.botpress) {
            log('FAST PATH: Webchat already preloaded!');
            log('Conversation ready:', window.__BOTPRESS_CONVERSATION_READY__);
            log('Conversation ID:', window.__BOTPRESS_CONVERSATION_ID__);

            const bp = window.botpress;
            setChatReady(true);

            // Use async IIFE for the FAST PATH
            (async () => {
                // Webchat was preloaded (script loaded + init called) but conversation not started
                // CRITICAL ORDER: updateUser() → open() → wait for conversation → sendMessage()
                log('FAST PATH: Starting initialization sequence...');

                // ========================================
                // STEP 1: Set user data BEFORE opening webchat
                // ========================================
                if (SETTING_KB === 'USERDATA') {
                    log('========================================');
                    log('FAST PATH Step 1: USERDATA MODE - Setting user data BEFORE conversation');
                    log('========================================');

                    try {
                        // Verify user exists (created by init() during preload)
                        const userBefore = await bp.getUser();
                        if (!userBefore || !userBefore.id) {
                            log('ERROR: User does not exist! Preload init() may have failed.');
                            throw new Error('User not found');
                        }
                        log('✓ User exists. ID:', userBefore.id);

                        // Set user data
                        const dataToSet = {
                            domain: domain,
                            fileId: kbFileId || '',
                            website: website,
                            sessionID: sessionID
                        };
                        log('Setting user.data:', JSON.stringify(dataToSet));

                        await bp.updateUser({ data: dataToSet });
                        log('✓ updateUser() call completed');

                        // Wait for sync to Botpress server
                        await new Promise(r => setTimeout(r, 500));

                        // Verify data was persisted
                        const userAfter = await bp.getUser();
                        log('Verifying user.data:', JSON.stringify(userAfter?.data || {}));

                        if (userAfter?.data?.domain === domain) {
                            log('✓ VERIFIED: user.data.domain =', userAfter.data.domain);
                            setUserDataConfirmed(true);
                        } else {
                            log('⚠️ WARNING: user.data.domain verification failed!');
                            log('  Expected:', domain);
                            log('  Got:', userAfter?.data?.domain);
                        }
                    } catch (e) {
                        log('ERROR setting user data:', e.message);
                    }
                    log('========================================');
                }

                // ========================================
                // STEP 2: Open webchat (starts conversation)
                // ========================================
                log('FAST PATH Step 2: Opening webchat...');

                // Set up conversation listener before opening
                bp.on('conversation', (convId) => {
                    log('✓ Conversation started:', convId);
                    window.__BOTPRESS_CONVERSATION_READY__ = true;
                    window.__BOTPRESS_CONVERSATION_ID__ = convId;
                });

                try {
                    await bp.open();
                    log('✓ Webchat opened');
                } catch (e) {
                    log('ERROR opening webchat:', e.message);
                }

                // ========================================
                // STEP 3: Wait for conversation to start
                // ========================================
                log('FAST PATH Step 3: Waiting for conversation...');
                if (!window.__BOTPRESS_CONVERSATION_READY__) {
                    let waitStart = Date.now();
                    while (!window.__BOTPRESS_CONVERSATION_READY__ && Date.now() - waitStart < 10000) {
                        await new Promise(r => setTimeout(r, 200));
                    }
                }

                if (window.__BOTPRESS_CONVERSATION_READY__) {
                    log('✓ Conversation ready');
                } else {
                    log('⚠️ Conversation timeout after 10s');
                }

                // Small delay for stability
                await new Promise(r => setTimeout(r, 300));

                // ========================================
                // STEP 4: Send message
                // ========================================
                log('FAST PATH Step 4: Sending message...');

                // Send message with context based on SETTING_KB mode
                try {
                    if (SETTING_KB === 'USERDATA') {
                        // USERDATA mode: User data was already set in Step 1 (BEFORE conversation)
                        // Just send a clean greeting now
                        const greeting = `Hi! I'd like to learn more about ${domain}.`;
                        log('USERDATA mode - sending clean greeting:', greeting);
                        await bp.sendMessage(greeting);
                        log('✓ Message sent');

                    } else if (SETTING_KB === 'MESSAGE') {
                        const contextTag = `[CONTEXT:domain=${domain},fileId=${kbFileId || ''}]`;
                        const greeting = `${contextTag}\nHi! I'd like to learn more about ${domain}.`;
                        log('Sending message with embedded context:', greeting);
                        await bp.sendMessage(greeting);

                    } else if (SETTING_KB === 'EVENT') {
                        await bp.sendEvent({
                            type: 'setContext',
                            payload: { domain, fileId: kbFileId || '', website, sessionID }
                        });
                        await new Promise(r => setTimeout(r, 300));
                        await bp.sendMessage(`Hi! I'd like to learn more about ${domain}.`);

                    } else {
                        await bp.sendMessage(`Hi! I'd like to learn more about ${domain}.`);
                    }
                    log('Message sent successfully via FAST PATH!');
                    setUserDataConfirmed(true);

                    // Trigger shareable link email (fire and forget)
                    if (!window.__SHARE_EMAIL_TRIGGERED__ && sessionID) {
                        window.__SHARE_EMAIL_TRIGGERED__ = true;
                        fetch('/api/share/trigger-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sessionID, domain })
                        }).then(res => res.json())
                          .then(data => log('Share email trigger response:', data))
                          .catch(err => log('Share email trigger failed (non-critical):', err.message));
                    }
                } catch (e) {
                    log('ERROR sending via fast path:', e.message);
                }

                log('--- INITIALIZATION COMPLETE (FAST PATH) ---');
            })();
            return; // Exit useEffect - FAST PATH handles everything
        }

        // NORMAL PATH: Full initialization
        log('NORMAL PATH: Full webchat initialization...');

        // Step 1: Clear old Botpress data to force fresh session
        log('Step 1: Clearing old Botpress localStorage...');
        clearBotpressStorage();

        // Store context globally
        window.__BOTPRESS_USER_CONTEXT__ = {
            domain, website, sessionID, fileId: kbFileId || ''
        };

        const userDataToSet = {
            domain: domain,
            website: website,
            sessionID: sessionID,
            fileId: kbFileId || ''
        };

        // Step 2: Load inject script
        log('Step 2: Loading inject script...');
        const injectScript = document.createElement('script');
        injectScript.src = 'https://cdn.botpress.cloud/webchat/v2.2/inject.js';

        injectScript.onload = async () => {
            log('Inject script loaded');

            // Wait for window.botpress
            try {
                await waitFor(() => window.botpress, 10000, 100);
            } catch (e) {
                log('ERROR: window.botpress not available after 10s');
                return;
            }

            const bp = window.botpress;
            log('window.botpress available');
            log('Available methods:', Object.keys(bp));

            // Set up event listeners
            bp.on('webchat:opened', () => log('Webchat opened'));
            bp.on('webchat:closed', () => log('Webchat closed'));
            bp.on('message', (msg) => log('Message received:', msg?.payload?.text?.substring(0, 100) || '(no text)'));
            bp.on('error', (err) => log('ERROR:', err));

            // Step 3: Set up event listeners BEFORE init()
            log('Step 3: Setting up event listeners...');

            let webchatReady = false;
            let conversationStarted = false;
            let conversationId = null;

            // Promise that resolves when webchat is ready
            const readyPromise = new Promise((resolve) => {
                bp.on('webchat:ready', () => {
                    log('EVENT: webchat:ready fired!');
                    webchatReady = true;
                    resolve();
                });
            });

            // Promise that resolves when conversation starts (REQUIRED before sending messages)
            const conversationPromise = new Promise((resolve) => {
                bp.on('conversation', (convId) => {
                    log('EVENT: conversation started:', convId);
                    conversationStarted = true;
                    conversationId = convId;
                    resolve(convId);
                });
            });

            // Also listen for other events for logging
            bp.on('webchat:opened', () => log('EVENT: webchat:opened'));
            bp.on('webchat:closed', () => log('EVENT: webchat:closed'));

            // Step 4: Initialize webchat (listeners already set up)
            log('Step 4: Initializing webchat...');
            // Use theme from props (AI-generated or default Marv)
            const theme = botTheme || DEFAULT_BOT_THEME;
            log('Using theme:', theme.name, theme.primaryColor);
            const initConfig = {
                botId: '3809961f-f802-40a3-aa5a-9eb91c0dedbb',
                clientId: 'f4011114-6902-416b-b164-12a8df8d0f3d',
                configuration: {
                    botName: theme.name,
                    botDescription: theme.description || ('Your friendly AI assistant for ' + domain),
                    botAvatar: theme.avatar,
                    color: theme.primaryColor,
                    variant: 'solid',
                    themeMode: 'light',
                    fontFamily: 'inter',
                    radius: 1
                }
            };

            logRequest('bp.init()', initConfig);
            bp.init(initConfig);
            log('init() called');
            setChatReady(true);

            // Step 5: Wait for webchat:ready event
            log('Step 5: Waiting for webchat:ready event...');
            await Promise.race([
                readyPromise,
                new Promise(r => setTimeout(r, 5000))
            ]);

            if (webchatReady) {
                log('Webchat ready!');
            } else {
                log('WARN: webchat:ready timeout after 5s, proceeding anyway');
            }

            // Step 6: Call updateUser() NOW - BEFORE open() to ensure data is set before conversation
            if (SETTING_KB === 'USERDATA') {
                log('========================================');
                log('Step 6: USERDATA MODE - Setting user data BEFORE conversation');
                log('========================================');

                try {
                    // Verify user exists first
                    const userBefore = await bp.getUser();
                    if (!userBefore || !userBefore.id) {
                        log('ERROR: User does not exist after init()!');
                        throw new Error('User not found');
                    }
                    log('✓ User exists. ID:', userBefore.id);

                    // Set user data
                    const dataToSet = {
                        domain: domain,
                        fileId: kbFileId || '',
                        website: website,
                        sessionID: sessionID
                    };
                    log('Setting user.data:', JSON.stringify(dataToSet));

                    await bp.updateUser({ data: dataToSet });
                    log('✓ updateUser() call completed');

                    // Wait for sync
                    await new Promise(r => setTimeout(r, 500));

                    // Verify data was set
                    const userAfter = await bp.getUser();
                    log('Verifying user.data:', JSON.stringify(userAfter?.data || {}));

                    if (userAfter?.data?.domain === domain) {
                        log('✓ VERIFIED: user.data.domain =', userAfter.data.domain);
                        setUserDataConfirmed(true);
                    } else {
                        log('⚠️ WARNING: user.data.domain verification failed!');
                    }
                } catch (e) {
                    log('ERROR: updateUser() failed:', e.message);
                }

                log('========================================');
            }

            // Step 7: Open webchat (with retry for returning visitors)
            log('Step 7: Opening webchat...');
            let openAttempts = 0;
            const maxAttempts = 3;
            while (openAttempts < maxAttempts) {
                try {
                    openAttempts++;
                    await bp.open();
                    log('Webchat opened on attempt', openAttempts);
                    break;
                } catch (e) {
                    log('Open attempt', openAttempts, 'failed:', e.message);
                    if (openAttempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
            }

            // Step 8: Wait for conversation to start (REQUIRED before sending messages)
            log('Step 8: Waiting for conversation to start...');
            await Promise.race([
                conversationPromise,
                new Promise(r => setTimeout(r, 10000))  // 10 second timeout
            ]);

            if (conversationStarted) {
                log('Conversation ready! ID:', conversationId);
            } else {
                log('WARN: Conversation timeout after 10s, trying to send anyway');
            }

            // Small additional delay for stability
            await new Promise(r => setTimeout(r, 500));

            log('Step 9: Sending greeting...');
            log('SETTING_KB mode:', SETTING_KB);

            try {
                if (SETTING_KB === 'USERDATA') {
                    // USERDATA mode: Context already set via webchat:initialized + updateUser()
                    // Just send a clean greeting
                    const greeting = `Hi! I'd like to learn more about ${domain}.`;
                    log('USERDATA mode - context set via updateUser, sending clean greeting:', greeting);
                    await bp.sendMessage(greeting);

                } else if (SETTING_KB === 'EVENT') {
                    // EVENT mode: Send invisible event with context, then clean greeting
                    log('Sending context via EVENT...');
                    await bp.sendEvent({
                        type: 'setContext',
                        payload: {
                            domain: domain,
                            fileId: kbFileId || '',
                            website: website,
                            sessionID: sessionID
                        }
                    });
                    log('Context event sent');

                    // Wait a moment for event to be processed
                    await new Promise(r => setTimeout(r, 500));

                    // Send clean greeting (no context tag visible)
                    const greeting = `Hi! I'd like to learn more about ${domain}.`;
                    log('Sending clean greeting:', greeting);
                    await bp.sendMessage(greeting);

                } else {
                    // MESSAGE mode: Embed context in visible message
                    const contextTag = `[CONTEXT:domain=${domain},fileId=${kbFileId || ''}]`;
                    const greeting = `${contextTag}\nHi! I'd like to learn more about ${domain}.`;
                    log('Sending message with embedded context:', greeting);
                    await bp.sendMessage(greeting);
                }
                log('Auto-greeting sent successfully');

                // Trigger shareable link email (fire and forget)
                if (!window.__SHARE_EMAIL_TRIGGERED__ && sessionID) {
                    window.__SHARE_EMAIL_TRIGGERED__ = true;
                    fetch('/api/share/trigger-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionID, domain })
                    }).then(res => res.json())
                      .then(data => log('Share email trigger response:', data))
                      .catch(err => log('Share email trigger failed (non-critical):', err.message));
                }

                // Final verification
                try {
                    const finalUser = await bp.getUser();
                    log('--- FINAL USER STATE ---');
                    log('userId:', finalUser?.id || 'N/A');
                    log('userData:', finalUser?.data || '(empty)');
                } catch (e) {
                    log('Could not get final user state');
                }

            } catch (e) {
                log('ERROR: Failed to send greeting:', e);
            }

            log('--- INITIALIZATION COMPLETE ---');
        };

        injectScript.onerror = (error) => {
            log('ERROR: Failed to load inject.js:', error);
        };

        log('Appending inject script to document');
        document.body.appendChild(injectScript);

    }, [domain, sessionID, website, kbFileId, botTheme]);

    const backgroundStyle = screenshotUrl ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${screenshotUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
    } : {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
    };

    return (
        <div style={backgroundStyle}>
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'white',
                zIndex: 1,
            }}>
                <div style={{
                    background: 'rgba(0, 35, 76, 0.85)',
                    padding: '3rem 4rem',
                    borderRadius: '20px',
                    border: '2px solid rgba(231, 111, 0, 0.5)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(10px)',
                    opacity: fadeIn ? 1 : 0,
                    transform: fadeIn ? 'scale(1)' : 'scale(0.95)',
                    transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
                }}>
                    {isReturning ? (
                        <>
                            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                                Hey, we already made that one!
                            </h1>
                            <p style={{ fontSize: '1.5rem', margin: '0' }}>
                                This domain was already processed. Chat with your AI agent below!
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                                Your AI Agent is Ready!
                            </h1>
                            <p style={{ fontSize: '1.5rem', margin: '0' }}>
                                Chat with it using the widget in the <span style={{ color: '#F8A433', fontWeight: 'bold' }}>bottom right corner</span>
                            </p>
                        </>
                    )}
                    {!chatReady && (
                        <p style={{ fontSize: '1rem', marginTop: '1rem', opacity: 0.7 }}>
                            Loading chat widget...
                        </p>
                    )}
                    {chatReady && !userDataConfirmed && (
                        <p style={{ fontSize: '0.9rem', marginTop: '1rem', opacity: 0.7 }}>
                            Syncing context...
                        </p>
                    )}
                </div>
            </div>

            <div id="webchat" />

            <div style={{
                position: 'absolute',
                bottom: '20px',
                width: '100%',
                textAlign: 'center',
                color: 'white',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            }}>
                <p style={{ fontSize: '0.9rem' }}>
                    {CONFIG.branding.poweredByText} | {CONFIG.branding.copyright} | {CONFIG.branding.legalLinks}
                </p>
            </div>
        </div>
    );
}
