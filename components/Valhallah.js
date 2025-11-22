import React, { useEffect, useState } from 'react';
import '../src/css/main.css';
import '../src/css/mockbox.css';
import '../src/css/thumbnail.css';
import '../src/css/ai_agent.css';
import '../src/css/weird_stuff.css';
import '../src/css/style.css';

export default function Valhallah({ authToken, domain, isReturning, screenshotUrl }) {
    const [chatReady, setChatReady] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);

    console.log('[VALHALLAH] Component mounted', {
        hasAuthToken: !!authToken,
        domain,
        isReturning,
        hasScreenshot: !!screenshotUrl
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

    // Load Botpress Cloud webchat with JWT authentication
    useEffect(() => {
        console.log('[VALHALLAH] Webchat loading useEffect triggered', { authToken: authToken?.substring(0, 20) + '...', domain });

        if (!authToken || !domain) {
            console.error('[VALHALLAH] Missing auth token or domain!', { hasToken: !!authToken, domain });
            return;
        }

        // Load Botpress webchat v3.4 with official embed approach
        console.log('[VALHALLAH] Creating Botpress script elements');

        // First script: inject.js
        const injectScript = document.createElement('script');
        injectScript.src = 'https://cdn.botpress.cloud/webchat/v3.4/inject.js';
        injectScript.async = true;
        injectScript.onload = () => {
            console.log('[VALHALLAH] Inject script loaded successfully');
        };
        injectScript.onerror = (error) => {
            console.error('[VALHALLAH] Failed to load inject script:', error);
        };

        // Second script: bot-specific config
        const configScript = document.createElement('script');
        configScript.src = 'https://files.bpcontent.cloud/2025/08/29/02/20250829022146-W5NQM7TZ.js';
        configScript.defer = true;

        configScript.onload = () => {
            console.log('[VALHALLAH] Config script loaded successfully');
            console.log('[VALHALLAH] Domain context:', domain);
            console.log('[VALHALLAH] Checking for window.botpressWebChat:', typeof window.botpressWebChat);
            setChatReady(true);
        };

        configScript.onerror = (error) => {
            console.error('[VALHALLAH] Failed to load Botpress config script:', error);
        };

        console.log('[VALHALLAH] Appending scripts to document body');
        document.body.appendChild(injectScript);
        document.body.appendChild(configScript);
        console.log('[VALHALLAH] Scripts appended, waiting for load...');

        return () => {
            // Cleanup: remove scripts on unmount
            if (document.body.contains(injectScript)) {
                document.body.removeChild(injectScript);
            }
            if (document.body.contains(configScript)) {
                document.body.removeChild(configScript);
            }
        };
    }, [authToken, domain]);

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

            {/* Botpress webchat will render in bottom right automatically */}
            <div id="bp-web-widget-container" />

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
