import React, { useEffect, useState } from 'react';
import '../src/css/main.css';
import '../src/css/mockbox.css';
import '../src/css/thumbnail.css';
import '../src/css/ai_agent.css';
import '../src/css/weird_stuff.css';
import '../src/css/style.css';

export default function Valhallah({ authToken, domain, isReturning, screenshotUrl, sessionID, website }) {
    // Store domain globally so bot can access it
    if (typeof window !== 'undefined') {
        window.__MAGIC_PAGE_DOMAIN__ = domain;
        window.__MAGIC_PAGE_WEBSITE__ = website;
        window.__MAGIC_PAGE_SESSION__ = sessionID;
    }
    const [chatReady, setChatReady] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);

    console.log('[VALHALLAH] Component mounted', {
        hasAuthToken: !!authToken,
        domain,
        isReturning,
        hasScreenshot: !!screenshotUrl,
        sessionID,
        website
    });

    // Trigger fade-in animation on mount
    useEffect(() => {
        console.log('[VALHALLAH] Fade-in animation starting');
        const timer = setTimeout(() => {
            setFadeIn(true);
            console.log('[VALHALLAH] Fade-in complete');
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Load Botpress Cloud webchat - v3.4 official approach
    useEffect(() => {
        console.log('[VALHALLAH] Webchat loading useEffect triggered', { domain, sessionID, website });

        // Check if scripts already exist
        const existingInjectScript = document.querySelector('script[src*="webchat/v3.4/inject.js"]');
        const existingConfigScript = document.querySelector('script[src*="files.bpcontent.cloud"]');

        if (existingInjectScript && existingConfigScript) {
            console.log('[VALHALLAH] Botpress scripts already loaded');
            setChatReady(true);

            // Try to send userData if webchat is ready
            setTimeout(() => {
                if (window.botpressWebChat) {
                    console.log('[VALHALLAH] Sending userData to existing webchat');
                    sendUserDataToWebchat();
                }
            }, 500);
            return;
        }

        console.log('[VALHALLAH] Loading Botpress v3.4 scripts');

        // Load the inject script FIRST
        const injectScript = document.createElement('script');
        injectScript.src = 'https://cdn.botpress.cloud/webchat/v3.4/inject.js';

        // Load the config script AFTER inject loads
        const configScript = document.createElement('script');
        configScript.src = 'https://files.bpcontent.cloud/2025/08/29/02/20250829022146-W5NQM7TZ.js';
        configScript.defer = true;

        let configLoaded = false;

        const checkBothLoaded = () => {
            if (configLoaded) {
                console.log('[VALHALLAH] Both scripts loaded successfully');
                setChatReady(true);
            }
        };

        injectScript.onload = () => {
            console.log('[VALHALLAH] Inject script loaded');
            console.log('[VALHALLAH] Domain for KB search:', domain);

            // BEFORE loading config script, set up userData interception
            // The config script will call window.botpressWebChat.mergeConfig()
            // We need to intercept that and add userData

            const originalMergeConfig = window.botpressWebChat?.mergeConfig;

            if (window.botpressWebChat && typeof originalMergeConfig === 'function') {
                window.botpressWebChat.mergeConfig = function(config) {
                    console.log('[VALHALLAH] Intercepting mergeConfig, adding userData');

                    // Add userData to the config
                    const configWithUserData = {
                        ...config,
                        userData: {
                            domain: domain,
                            website: website,
                            sessionID: sessionID
                        }
                    };

                    console.log('[VALHALLAH] Config with userData:', configWithUserData);

                    // Call the original mergeConfig with enhanced config
                    return originalMergeConfig.call(this, configWithUserData);
                };

                console.log('[VALHALLAH] ✅ mergeConfig intercepted');
            } else {
                console.warn('[VALHALLAH] Could not intercept mergeConfig - will try alternative approach');
            }

            configScript.onload = () => {
                console.log('[VALHALLAH] Config script loaded - webchat ready');
                console.log('[VALHALLAH] Bot should have userData with domain:', domain);
                configLoaded = true;
                checkBothLoaded();
            };

            configScript.onerror = (error) => {
                console.error('[VALHALLAH] Failed to load config script:', error);
            };

            document.body.appendChild(configScript);
        };

        injectScript.onerror = (error) => {
            console.error('[VALHALLAH] Failed to load inject script:', error);
        };

        console.log('[VALHALLAH] Appending Botpress v3.4 inject script to document body');
        document.body.appendChild(injectScript);

        // Cleanup function
        return () => {
            console.log('[VALHALLAH] Component unmounting - scripts will persist');
        };
    }, [sessionID, website, domain]);

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
