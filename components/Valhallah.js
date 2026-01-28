import React, { useEffect, useState, useRef } from 'react';
import { CONFIG } from '../configuration/masterConfig';
import {
    state as webchatState,
    clearBotpressStorage,
    openAndGreet,
    fullInit,
} from '../lib/botpress-webchat';

export default function Valhallah({ authToken, domain, isReturning, isShareableLink = false, screenshotUrl, sessionID, website, kbFileId, botTheme = CONFIG.defaultBotTheme }) {
    const hasInitialized = useRef(false);
    const [chatReady, setChatReady] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);
    const [userDataConfirmed, setUserDataConfirmed] = useState(false);

    // Log on first mount
    if (!hasInitialized.current) {
        console.log('[VALHALLAH] --- COMPONENT MOUNTED ---');
        console.log('[VALHALLAH] Props:', {
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
            console.log('[VALHALLAH] Already initialized, skipping');
            return;
        }
        hasInitialized.current = true;

        console.log('[VALHALLAH] --- STARTING WEBCHAT INITIALIZATION ---');
        console.log('[VALHALLAH] Target domain:', domain);
        console.log('[VALHALLAH] Target fileId:', kbFileId);

        // Always clear old Botpress localStorage first (fixes stale session issues)
        clearBotpressStorage();

        // SKIP PATH: Shareable link already did full initialization (including greeting)
        if (webchatState.shareChatReady && webchatState.shareGreetingSent && window.botpress) {
            console.log('[VALHALLAH] SKIP PATH: Shareable link already fully initialized!');
            setChatReady(true);
            setUserDataConfirmed(true);
            return;
        }

        // FAST PATH: Webchat was preloaded during scanning phase
        if (webchatState.preloaded && window.botpress) {
            console.log('[VALHALLAH] FAST PATH: Webchat already preloaded!');
            setChatReady(true);
            openAndGreet(window.botpress, { domain, kbFileId, website, sessionID })
                .then(() => setUserDataConfirmed(true))
                .catch(e => console.error('[VALHALLAH] FAST PATH error:', e.message));
            return;
        }

        // NORMAL PATH: Full initialization from scratch
        console.log('[VALHALLAH] NORMAL PATH: Full webchat initialization...');
        fullInit({ domain, kbFileId, website, sessionID, theme: botTheme, retryOpen: true })
            .then(() => {
                setChatReady(true);
                setUserDataConfirmed(true);
            })
            .catch(e => console.error('[VALHALLAH] NORMAL PATH error:', e.message));

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
                                Chat with it using the widget in the <span style={{ color: 'var(--theme-accent, #F48D03)', fontWeight: 'bold' }}>bottom right corner</span>
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
