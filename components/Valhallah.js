import React, { useEffect, useState, useRef } from 'react';
import '../src/css/main.css';
import '../src/css/mockbox.css';
import '../src/css/thumbnail.css';
import '../src/css/ai_agent.css';
import '../src/css/weird_stuff.css';
import '../src/css/style.css';
import { DEBUG_BOTPRESS_REQUESTS, DEBUG_OPTIONS } from '../configuration/debugConfig';

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

export default function Valhallah({ authToken, domain, isReturning, screenshotUrl, sessionID, website, kbFileId }) {
    // Prevent multiple initializations (React strict mode, HMR, etc.)
    const hasInitialized = useRef(false);

    // Store domain globally so bot can access it
    if (typeof window !== 'undefined') {
        window.__MAGIC_PAGE_DOMAIN__ = domain;
        window.__MAGIC_PAGE_WEBSITE__ = website;
        window.__MAGIC_PAGE_SESSION__ = sessionID;
        window.__MAGIC_PAGE_KB_FILE_ID__ = kbFileId;
    }
    const [chatReady, setChatReady] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);

    // Only log on first mount
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

    // Trigger fade-in animation on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setFadeIn(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Load Botpress Cloud webchat
    useEffect(() => {
        if (hasInitialized.current) {
            log('Already initialized, skipping');
            return;
        }
        hasInitialized.current = true;

        log('Loading webchat...', { domain, sessionID, website, kbFileId });

        // Check if webchat already exists
        const existingScript = document.querySelector('script[src*="cdn.botpress.cloud/webchat"]');
        if (existingScript && window.botpress?.initialized) {
            log('Botpress already initialized');
            setChatReady(true);
            return;
        }

        // Store context globally for reference
        window.__BOTPRESS_USER_CONTEXT__ = {
            domain: domain,
            website: website,
            sessionID: sessionID,
            fileId: kbFileId || ''
        };

        // Load ONLY the inject script - NOT the config script!
        const injectScript = document.createElement('script');
        injectScript.src = 'https://cdn.botpress.cloud/webchat/v2.2/inject.js';

        injectScript.onload = () => {
            log('Inject script loaded');

            // Wait for window.botpress to be available
            const checkBotpress = setInterval(() => {
                if (window.botpress) {
                    clearInterval(checkBotpress);

                    const bp = window.botpress;
                    log('window.botpress available');
                    log('Available methods:', Object.keys(bp));

                    // Set up event listeners
                    bp.on('webchat:opened', () => {
                        log('Webchat opened');
                        logEvent('webchat:opened', { status: 'opened' });
                    });

                    bp.on('webchat:closed', () => {
                        log('Webchat closed');
                        logEvent('webchat:closed', { status: 'closed' });
                    });

                    bp.on('message', (msg) => {
                        log('Message received:', msg?.payload?.text || msg);
                        logEvent('message', msg);
                    });

                    bp.on('messageSent', (msg) => {
                        logEvent('messageSent', msg);
                    });

                    bp.on('error', (err) => {
                        log('ERROR:', err);
                        logEvent('error', err);
                    });

                    // Store user data to pass after initialization
                    const userDataToSet = {
                        domain: domain,
                        website: website,
                        sessionID: sessionID,
                        fileId: kbFileId || ''
                    };

                    log('--- INIT APPROACH: init() then updateUser() ---');
                    log('userData to set:', userDataToSet);

                    // Listen for webchat:ready
                    bp.on('webchat:ready', async () => {
                        log('webchat:ready event fired');
                        log('Calling updateUser()...');

                        logEvent('webchat:ready', { status: 'ready' });

                        try {
                            await bp.updateUser({ data: userDataToSet });

                            log('updateUser() SUCCESS');
                            log('Data sent:', userDataToSet);
                            logEvent('updateUser:success', { data: userDataToSet });

                            // Verify userData
                            log('--- VERIFYING USER DATA ---');
                            try {
                                const user = await bp.getUser();
                                const retrievedData = user?.data || {};

                                log('getUser() result:');
                                log('  userId:', user?.id || 'N/A');
                                log('  domain:', retrievedData.domain || '(not set)');
                                log('  website:', retrievedData.website || '(not set)');
                                log('  sessionID:', retrievedData.sessionID || '(not set)');
                                log('  fileId:', retrievedData.fileId || '(not set)');
                                log('Full user object:', user);

                                logEvent('getUser:success', { user, retrievedData });

                            } catch (getUserError) {
                                log('WARN: getUser() not available yet');
                                log('Expected userData:', userDataToSet);
                                logEvent('getUser:deferred', { reason: 'chat not opened', expectedData: userDataToSet });
                            }

                        } catch (updateError) {
                            log('ERROR: updateUser() failed:', updateError);
                            logEvent('updateUser:error', { error: updateError });
                        }
                    });

                    // Build init config
                    const initConfig = {
                        botId: '3809961f-f802-40a3-aa5a-9eb91c0dedbb',
                        clientId: 'f4011114-6902-416b-b164-12a8df8d0f3d',
                        configuration: {
                            botName: 'Custom Assistant',
                            botDescription: 'I can assist you with your specific custom requests and provide tailored information.',
                            color: '#3276EA',
                            variant: 'solid',
                            themeMode: 'light',
                            fontFamily: 'inter',
                            radius: 1
                        }
                    };

                    logRequest('bp.init()', initConfig);

                    try {
                        bp.init(initConfig);
                        log('init() called');
                        logEvent('init:success', { status: 'success' });
                        setChatReady(true);

                        // Auto-open and send first message
                        setTimeout(async () => {
                            log('--- AUTO-OPEN SEQUENCE ---');

                            try {
                                // Try to start new conversation
                                if (typeof bp.newConversation === 'function') {
                                    log('Starting new conversation...');
                                    await bp.newConversation();
                                    log('New conversation started');
                                } else {
                                    log('newConversation not available, methods:', Object.keys(bp));
                                }

                                // Open webchat
                                await bp.open();
                                log('Webchat opened');

                                // Send greeting after delay
                                setTimeout(async () => {
                                    try {
                                        const greeting = `Hi! I'd like to learn more about ${domain || 'your services'}.`;
                                        log('Sending auto-greeting:', greeting);

                                        await bp.sendMessage(greeting);
                                        log('Auto-greeting sent');
                                        logEvent('auto-greeting:sent', { message: greeting });

                                        // Verify userData post-message
                                        try {
                                            const user = await bp.getUser();
                                            log('--- POST-MESSAGE USER DATA ---');
                                            log('  userId:', user?.id || 'N/A');
                                            log('  userData:', user?.data || '(no data)');
                                        } catch (e) {
                                            log('getUser() still not available after message');
                                        }

                                    } catch (sendError) {
                                        log('ERROR: Failed to send auto-greeting:', sendError);
                                    }
                                }, 1500);

                            } catch (openError) {
                                log('ERROR: Failed to auto-open webchat:', openError);
                            }
                        }, 2000);

                    } catch (error) {
                        log('ERROR: init() failed:', error);
                    }
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkBotpress);
                if (!window.botpress) {
                    log('ERROR: window.botpress not available after 10s');
                }
            }, 10000);
        };

        injectScript.onerror = (error) => {
            log('ERROR: Failed to load inject.js:', error);
        };

        log('Appending inject script');
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
            {/* Overlay message with dark box and arrow */}
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
                </div>
            </div>

            {/* Botpress webchat container */}
            <div id="webchat" />

            {/* Footer */}
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
