import React, { useEffect, useState, useRef } from 'react';
import '../src/css/main.css';
import '../src/css/mockbox.css';
import '../src/css/thumbnail.css';
import '../src/css/ai_agent.css';
import '../src/css/weird_stuff.css';
import '../src/css/style.css';
import { DEBUG_BOTPRESS_REQUESTS, DEBUG_OPTIONS } from '../configuration/debugConfig';

// Browser-side debug logging (mirrors server-side format)
let browserSequence = 0;
function logWebchatRequest(action, data) {
    if (!DEBUG_BOTPRESS_REQUESTS || !DEBUG_OPTIONS.LOG_WEBCHAT_INIT) return;
    browserSequence++;
    const timestamp = new Date().toISOString();
    console.log('');
    console.log('%c╔══════════════════════════════════════════════════════════════', 'color: #3276EA');
    console.log(`%c║ [${browserSequence}] WEBCHAT REQUEST - ${action}`, 'color: #3276EA; font-weight: bold');
    console.log(`%c║ Time: ${timestamp}`, 'color: #3276EA');
    console.log('%c╠══════════════════════════════════════════════════════════════', 'color: #3276EA');
    console.log('%c║ Payload:', 'color: #3276EA');
    console.log(data);
    console.log('%c╚══════════════════════════════════════════════════════════════', 'color: #3276EA');
    console.log('');
}

function logWebchatEvent(eventName, data) {
    if (!DEBUG_BOTPRESS_REQUESTS || !DEBUG_OPTIONS.LOG_WEBCHAT_EVENTS) return;
    browserSequence++;
    const timestamp = new Date().toISOString();
    console.log('');
    console.log('%c╔══════════════════════════════════════════════════════════════', 'color: #E76F00');
    console.log(`%c║ [${browserSequence}] WEBCHAT EVENT - ${eventName}`, 'color: #E76F00; font-weight: bold');
    console.log(`%c║ Time: ${timestamp}`, 'color: #E76F00');
    console.log('%c╠══════════════════════════════════════════════════════════════', 'color: #E76F00');
    console.log('%c║ Data:', 'color: #E76F00');
    console.log(data);
    console.log('%c╚══════════════════════════════════════════════════════════════', 'color: #E76F00');
    console.log('');
}

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
        console.log('');
        console.log('========================================');
        console.log('[VALHALLAH] COMPONENT MOUNTED');
        console.log('========================================');
        console.log('Props received:');
        console.log('  authToken:', authToken ? authToken.substring(0, 20) + '...' : 'NOT PROVIDED');
        console.log('  domain:', domain || 'NOT PROVIDED');
        console.log('  website:', website || 'NOT PROVIDED');
        console.log('  sessionID:', sessionID || 'NOT PROVIDED');
        console.log('  kbFileId:', kbFileId || 'NOT PROVIDED');
        console.log('  isReturning:', isReturning);
        console.log('  hasScreenshot:', !!screenshotUrl);
        console.log('========================================');
        console.log('');
    }

    // Trigger fade-in animation on mount
    useEffect(() => {
        console.log('[VALHALLAH] Fade-in animation starting');
        const timer = setTimeout(() => {
            setFadeIn(true);
            console.log('[VALHALLAH] Fade-in complete');
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Load Botpress Cloud webchat
    // CRITICAL: We call init() ourselves WITH userData instead of loading the config script
    // The config script calls init() without userData, which prevents us from setting it later
    useEffect(() => {
        // Prevent multiple initializations
        if (hasInitialized.current) {
            console.log('[VALHALLAH] Already initialized, skipping');
            return;
        }
        hasInitialized.current = true;

        console.log('[VALHALLAH] Webchat loading useEffect triggered', { domain, sessionID, website, kbFileId });

        // Check if webchat already exists
        const existingScript = document.querySelector('script[src*="cdn.botpress.cloud/webchat"]');
        if (existingScript && window.botpress?.initialized) {
            console.log('[VALHALLAH] Botpress already initialized');
            setChatReady(true);
            return;
        }

        console.log('[VALHALLAH] Loading Botpress webchat (manual init with userData)');

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
            console.log('[VALHALLAH] ✅ Inject script loaded');

            // Wait for window.botpress to be available
            const checkBotpress = setInterval(() => {
                if (window.botpress) {
                    clearInterval(checkBotpress);

                    const bp = window.botpress;
                    console.log('[VALHALLAH] ✅ window.botpress available');
                    console.log('[VALHALLAH] Available methods:', Object.keys(bp));

                    // Set up event listeners with debug logging
                    bp.on('webchat:ready', () => {
                        console.log('[VALHALLAH] 📢 webchat:ready event fired');
                        logWebchatEvent('webchat:ready', { status: 'ready' });
                    });

                    bp.on('webchat:opened', () => {
                        console.log('[VALHALLAH] 💬 Webchat opened');
                        logWebchatEvent('webchat:opened', { status: 'opened' });
                    });

                    bp.on('webchat:closed', () => {
                        console.log('[VALHALLAH] 💬 Webchat closed');
                        logWebchatEvent('webchat:closed', { status: 'closed' });
                    });

                    bp.on('message', (msg) => {
                        console.log('[VALHALLAH] 📨 Message:', msg?.payload?.text || msg);
                        logWebchatEvent('message', msg);
                    });

                    bp.on('messageSent', (msg) => {
                        logWebchatEvent('messageSent', msg);
                    });

                    bp.on('error', (err) => {
                        console.error('[VALHALLAH] ❌ Error:', err);
                        logWebchatEvent('error', err);
                    });

                    // CRITICAL: Call init() ourselves WITH userData
                    // This is the ONLY way to ensure userData is set
                    console.log('');
                    console.log('========================================');
                    console.log('[VALHALLAH] 🎯 CALLING init() WITH userData');
                    console.log('========================================');
                    console.log('  domain:', domain);
                    console.log('  website:', website);
                    console.log('  sessionID:', sessionID);
                    console.log('  fileId:', kbFileId || '(none)');
                    console.log('========================================');

                    // Build the full init config object
                    const initConfig = {
                        // Bot configuration (from Botpress dashboard)
                        botId: '3809961f-f802-40a3-aa5a-9eb91c0dedbb',
                        clientId: 'f4011114-6902-416b-b164-12a8df8d0f3d',

                        // Styling configuration
                        configuration: {
                            botName: 'Custom Assistant',
                            botDescription: 'I can assist you with your specific custom requests and provide tailored information.',
                            color: '#3276EA',
                            variant: 'solid',
                            themeMode: 'light',
                            fontFamily: 'inter',
                            radius: 1
                        },

                        // THE CRITICAL PART: userData with domain info
                        userData: {
                            domain: domain,
                            website: website,
                            sessionID: sessionID,
                            fileId: kbFileId || ''
                        }
                    };

                    // Debug log the full init config
                    logWebchatRequest('bp.init()', initConfig);

                    try {
                        bp.init(initConfig);

                        console.log('[VALHALLAH] ✅ init() called successfully with userData!');
                        logWebchatEvent('init:success', {
                            status: 'success',
                            userData: initConfig.userData
                        });
                        setChatReady(true);

                    } catch (error) {
                        console.error('[VALHALLAH] ❌ init() failed:', error);
                    }
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkBotpress);
                if (!window.botpress) {
                    console.error('[VALHALLAH] ❌ window.botpress not available after 10s');
                }
            }, 10000);
        };

        injectScript.onerror = (error) => {
            console.error('[VALHALLAH] ❌ FAILED TO LOAD inject.js:', error);
        };

        console.log('[VALHALLAH] Appending inject script to document');
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
