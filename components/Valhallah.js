import React, { useEffect, useState, useRef } from 'react';
import '../src/css/main.css';
import '../src/css/mockbox.css';
import '../src/css/thumbnail.css';
import '../src/css/ai_agent.css';
import '../src/css/weird_stuff.css';
import '../src/css/style.css';
import { DEBUG_BOTPRESS_REQUESTS, DEBUG_OPTIONS, SETTING_KB } from '../configuration/debugConfig';

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

// Hide webchat until fully initialized
const hideWebchatStyle = `
    #bp-web-widget-container,
    .bpw-widget-btn,
    [class*="WebchatContainer"],
    [class*="webchat"] {
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease-in-out;
    }
`;

const showWebchatStyle = `
    #bp-web-widget-container,
    .bpw-widget-btn,
    [class*="WebchatContainer"],
    [class*="webchat"] {
        opacity: 1 !important;
        pointer-events: auto !important;
    }
`;

export default function Valhallah({ authToken, domain, isReturning, screenshotUrl, sessionID, website, kbFileId }) {
    const hasInitialized = useRef(false);
    const [chatReady, setChatReady] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);
    const [userDataConfirmed, setUserDataConfirmed] = useState(false);
    const [webchatVisible, setWebchatVisible] = useState(false);
    const styleRef = useRef(null);

    // Store domain globally
    if (typeof window !== 'undefined') {
        window.__MAGIC_PAGE_DOMAIN__ = domain;
        window.__MAGIC_PAGE_WEBSITE__ = website;
        window.__MAGIC_PAGE_SESSION__ = sessionID;
        window.__MAGIC_PAGE_KB_FILE_ID__ = kbFileId;
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
            hasScreenshot: !!screenshotUrl
        });
    }

    // Fade-in animation
    useEffect(() => {
        const timer = setTimeout(() => setFadeIn(true), 100);
        return () => clearTimeout(timer);
    }, []);

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

        // Step 0: Add CSS to hide webchat until ready
        log('Step 0: Hiding webchat until ready...');
        const hideStyle = document.createElement('style');
        hideStyle.id = 'bp-hide-style';
        hideStyle.textContent = hideWebchatStyle;
        document.head.appendChild(hideStyle);
        styleRef.current = hideStyle;

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

            // Step 3: Initialize webchat
            log('Step 3: Initializing webchat...');
            const initConfig = {
                botId: '3809961f-f802-40a3-aa5a-9eb91c0dedbb',
                clientId: 'f4011114-6902-416b-b164-12a8df8d0f3d',
                configuration: {
                    botName: 'Custom Assistant',
                    botDescription: 'AI assistant for ' + domain,
                    color: '#3276EA',
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

            // Step 4: Set up event listeners for ready states
            log('Step 4: Setting up ready state listeners...');

            let isReady = false;
            const markReady = () => { isReady = true; };

            bp.on('webchat:ready', () => {
                log('EVENT: webchat:ready');
                markReady();
            });
            bp.on('conversation', (convId) => {
                log('EVENT: conversation started:', convId);
                markReady();
            });

            // Step 5: Wait for ready state (without opening yet - webchat is hidden)
            log('Step 5: Waiting for ready state (webchat hidden)...');
            const startWait = Date.now();
            while (!isReady && Date.now() - startWait < 10000) {
                await new Promise(r => setTimeout(r, 300));
                // Only log every second to reduce noise
                if ((Date.now() - startWait) % 1000 < 300) {
                    log('Waiting for ready...', Math.round((Date.now() - startWait) / 1000) + 's');
                }
            }

            if (isReady) {
                log('Webchat is ready!');
            } else {
                log('WARN: Ready timeout after 10s, proceeding anyway');
            }

            // Step 6: Set user data (USERDATA mode only) - before showing webchat
            if (SETTING_KB === 'USERDATA') {
                log('Step 6: USERDATA mode - setting userData via updateUser()...');
                try {
                    await bp.updateUser({
                        data: {
                            domain: domain,
                            fileId: kbFileId || '',
                            website: website,
                            sessionID: sessionID
                        }
                    });
                    log('updateUser() SUCCESS');
                    setUserDataConfirmed(true);

                    // Verify
                    const user = await bp.getUser();
                    log('Verified user.data:', user?.data);
                } catch (e) {
                    log('ERROR: updateUser() failed:', e.message);
                }
            }

            // Step 7: Show webchat (remove hide CSS) and open it
            log('Step 7: Showing webchat...');
            if (styleRef.current) {
                styleRef.current.textContent = showWebchatStyle;
            }
            setWebchatVisible(true);

            // Small delay for CSS transition
            await new Promise(r => setTimeout(r, 100));

            // Step 7b: Open webchat and send greeting immediately
            log('Step 7b: Opening webchat and sending greeting...');

            const greeting = SETTING_KB === 'MESSAGE'
                ? `[CONTEXT:domain=${domain},fileId=${kbFileId || ''}]\nHi! I'd like to learn more about ${domain}.`
                : `Hi! I'd like to learn more about ${domain}.`;

            try {
                // Open and send greeting in rapid succession
                await bp.open();

                // For EVENT mode, send context event first
                if (SETTING_KB === 'EVENT') {
                    await bp.sendEvent({
                        type: 'setContext',
                        payload: { domain, fileId: kbFileId || '', website, sessionID }
                    });
                }

                // Send greeting immediately - no delay
                await bp.sendMessage(greeting);
                log('Webchat opened and greeting sent');
            } catch (e) {
                log('ERROR: Failed to open/send:', e);
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

            log('--- INITIALIZATION COMPLETE ---');
        };

        injectScript.onerror = (error) => {
            log('ERROR: Failed to load inject.js:', error);
        };

        log('Appending inject script to document');
        document.body.appendChild(injectScript);

    }, [domain, sessionID, website, kbFileId]);

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
                    {chatReady && !webchatVisible && (
                        <p style={{ fontSize: '0.9rem', marginTop: '1rem', opacity: 0.7 }}>
                            Preparing your assistant...
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
                    Powered by Member Solutions | Copyright © 2025 | Privacy Policy | Legal
                </p>
            </div>
        </div>
    );
}
