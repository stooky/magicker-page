// pages/[slug].js
// Dynamic shareable chatbot page
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Valhallah from '../components/Valhallah';
import { CONFIG } from '../configuration/masterConfig';

export default function ShareableChatbot() {
    const router = useRouter();
    const { slug } = router.query;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [config, setConfig] = useState(null);
    const [authToken, setAuthToken] = useState(null);
    const [botpressReady, setBotpressReady] = useState(false); // Track when botpress is fully ready
    const preloadStarted = useRef(false);

    // Full Botpress initialization (called after config is loaded)
    // This does EVERYTHING: load script, init, set user data, open chat, send greeting
    async function initializeBotpress(botTheme, domain, kbFileId, website, sessionID) {
        if (typeof window === 'undefined') return;
        if (window.__SHARE_CHAT_READY__) {
            console.log('[SHARE INIT] Already fully initialized, skipping');
            setBotpressReady(true);
            return;
        }

        console.log('[SHARE INIT] Starting full webchat initialization...');

        // Add CSS to hide webchat during init
        const hideStyle = document.createElement('style');
        hideStyle.id = 'botpress-preload-hide';
        hideStyle.textContent = `
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
        document.head.appendChild(hideStyle);
        console.log('[SHARE INIT] Added hide CSS');

        // Add loading overlay
        const overlayBox = document.createElement('div');
        overlayBox.id = 'webchat-loading-overlay';
        overlayBox.innerHTML = `
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
        document.body.appendChild(overlayBox);
        console.log('[SHARE INIT] Added loading overlay');

        // Load inject script
        const injectScript = document.createElement('script');
        injectScript.src = 'https://cdn.botpress.cloud/webchat/v2.2/inject.js';

        injectScript.onload = async () => {
            console.log('[SHARE INIT] Inject script loaded');

            // Wait for window.botpress
            let attempts = 0;
            while (!window.botpress && attempts < 50) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }

            if (!window.botpress) {
                console.error('[SHARE INIT] window.botpress not available');
                setBotpressReady(true);
                return;
            }

            const bp = window.botpress;
            console.log('[SHARE INIT] window.botpress available');

            // Clear old Botpress localStorage to force fresh session
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('bp/') || key.includes('botpress'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            if (keysToRemove.length > 0) {
                console.log(`[SHARE INIT] Cleared ${keysToRemove.length} Botpress localStorage keys`);
            }

            // Set up conversation listener
            window.__BOTPRESS_CONVERSATION_READY__ = false;
            window.__BOTPRESS_CONVERSATION_ID__ = null;

            bp.on('conversation', (convId) => {
                console.log('[SHARE INIT] Conversation started:', convId);
                window.__BOTPRESS_CONVERSATION_READY__ = true;
                window.__BOTPRESS_CONVERSATION_ID__ = convId;
            });

            bp.on('webchat:ready', () => {
                console.log('[SHARE INIT] Webchat ready event');
            });

            // Use provided theme or default from config
            const theme = botTheme || CONFIG.defaultBotTheme;
            console.log('[SHARE INIT] Using theme:', theme.name, theme.primaryColor);

            // Store theme in window
            window.__BOTPRESS_THEME__ = theme;

            // STEP 1: Initialize webchat
            console.log('[SHARE INIT] Step 1: Initializing webchat...');
            bp.init({
                botId: CONFIG.botpress.botId,
                clientId: CONFIG.botpress.clientId,
                configuration: {
                    botName: theme.name,
                    botDescription: theme.description,
                    botAvatar: theme.avatar,
                    color: theme.primaryColor,
                    variant: 'solid',
                    themeMode: 'light',
                    fontFamily: 'inter',
                    radius: 1
                }
            });
            console.log('[SHARE INIT] init() called');

            // Wait a moment for init to complete
            await new Promise(r => setTimeout(r, 500));

            // STEP 2: Set user data BEFORE opening (critical for KB filtering)
            console.log('[SHARE INIT] Step 2: Setting user data...');
            try {
                const userBefore = await bp.getUser();
                if (userBefore && userBefore.id) {
                    console.log('[SHARE INIT] User exists, ID:', userBefore.id);

                    const dataToSet = {
                        domain: domain,
                        fileId: kbFileId || '',
                        website: website,
                        sessionID: sessionID
                    };
                    console.log('[SHARE INIT] Setting user.data:', JSON.stringify(dataToSet));

                    await bp.updateUser({ data: dataToSet });
                    console.log('[SHARE INIT] updateUser() completed');

                    // Wait for sync
                    await new Promise(r => setTimeout(r, 500));

                    // Verify
                    const userAfter = await bp.getUser();
                    console.log('[SHARE INIT] Verified user.data.domain:', userAfter?.data?.domain);
                }
            } catch (e) {
                console.error('[SHARE INIT] Error setting user data:', e.message);
            }

            // STEP 3: Open webchat
            console.log('[SHARE INIT] Step 3: Opening webchat...');
            try {
                await bp.open();
                console.log('[SHARE INIT] Webchat opened');
            } catch (e) {
                console.error('[SHARE INIT] Error opening webchat:', e.message);
            }

            // STEP 4: Wait for conversation to start
            console.log('[SHARE INIT] Step 4: Waiting for conversation...');
            let waitStart = Date.now();
            while (!window.__BOTPRESS_CONVERSATION_READY__ && Date.now() - waitStart < 10000) {
                await new Promise(r => setTimeout(r, 200));
            }

            if (window.__BOTPRESS_CONVERSATION_READY__) {
                console.log('[SHARE INIT] Conversation ready');
            } else {
                console.log('[SHARE INIT] Conversation timeout');
            }

            // Small stability delay
            await new Promise(r => setTimeout(r, 300));

            // STEP 5: Send greeting message
            console.log('[SHARE INIT] Step 5: Sending greeting...');
            try {
                const greeting = `Hi! I'd like to learn more about ${domain}.`;
                console.log('[SHARE INIT] Sending:', greeting);
                await bp.sendMessage(greeting);
                console.log('[SHARE INIT] Greeting sent successfully');
            } catch (e) {
                console.error('[SHARE INIT] Error sending greeting:', e.message);
            }

            // Mark as fully ready
            window.__BOTPRESS_PRELOADED__ = true;
            window.__SHARE_CHAT_READY__ = true;
            window.__SHARE_GREETING_SENT__ = true;

            console.log('[SHARE INIT] Full initialization complete!');
            setBotpressReady(true);
        };

        injectScript.onerror = (err) => {
            console.error('[SHARE INIT] Failed to load inject script:', err);
            setBotpressReady(true);
        };

        document.body.appendChild(injectScript);
    }

    useEffect(() => {
        if (!slug) return;

        async function loadConfig() {
            try {
                // 1. Fetch chatbot config by slug
                const configRes = await fetch(`/api/share/get-config?slug=${encodeURIComponent(slug)}`);
                const configData = await configRes.json();

                if (!configData.success) {
                    setError(configData.error || 'Chatbot not found');
                    setLoading(false);
                    return;
                }

                setConfig(configData.data);

                // 2. Get fresh JWT auth token
                const tokenRes = await fetch('/api/botpress/get-auth-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        domain: configData.data.domain,
                        sessionID: configData.data.sessionId
                    })
                });
                const tokenData = await tokenRes.json();

                if (tokenData.authToken) {
                    setAuthToken(tokenData.authToken);
                } else {
                    setError('Failed to authenticate chatbot');
                    setLoading(false);
                    return;
                }

                setLoading(false);

                // 3. Start full Botpress initialization (does everything including send greeting)
                if (!preloadStarted.current) {
                    preloadStarted.current = true;
                    initializeBotpress(
                        configData.data.botTheme,
                        configData.data.domain,
                        configData.data.kbFileId,
                        configData.data.website,
                        configData.data.sessionId
                    );
                }
            } catch (err) {
                console.error('[slug] Error loading config:', err);
                setError('Failed to load chatbot');
                setLoading(false);
            }
        }

        loadConfig();
    }, [slug]);

    // Remove hide CSS when showing chat
    useEffect(() => {
        if (botpressReady) {
            const hideStyle = document.getElementById('botpress-preload-hide');
            if (hideStyle) {
                hideStyle.remove();
                console.log('[SHARE] Removed hide CSS - webchat now visible');
            }
            const overlay = document.getElementById('webchat-loading-overlay');
            if (overlay) {
                overlay.remove();
                console.log('[SHARE] Removed loading overlay');
            }
        }
    }, [botpressReady]);

    // Loading state (fetching config)
    if (loading) {
        return (
            <div className="share-loading">
                <Head>
                    <title>Loading Chatbot...</title>
                </Head>
                <style jsx>{`
                    .share-loading {
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                        color: white;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    .spinner {
                        width: 50px;
                        height: 50px;
                        border: 3px solid rgba(255,255,255,0.2);
                        border-top-color: var(--theme-accent, #F48D03);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    .loading-text {
                        margin-top: 20px;
                        font-size: 18px;
                        opacity: 0.8;
                    }
                `}</style>
                <div className="spinner"></div>
                <p className="loading-text">Loading chatbot...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="share-error">
                <Head>
                    <title>Chatbot Not Found</title>
                </Head>
                <style jsx>{`
                    .share-error {
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                        color: white;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        text-align: center;
                        padding: 20px;
                    }
                    .error-icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                    .error-title {
                        font-size: 24px;
                        margin-bottom: 10px;
                    }
                    .error-message {
                        font-size: 16px;
                        opacity: 0.7;
                        margin-bottom: 30px;
                    }
                    .home-link {
                        color: var(--theme-accent, #F48D03);
                        text-decoration: none;
                        padding: 12px 24px;
                        border: 2px solid var(--theme-accent, #F48D03);
                        border-radius: 8px;
                        transition: all 0.2s;
                    }
                    .home-link:hover {
                        background: var(--theme-accent, #F48D03);
                        color: white;
                    }
                `}</style>
                <div className="error-icon">🤖</div>
                <h1 className="error-title">Chatbot Not Found</h1>
                <p className="error-message">{error}</p>
                <Link href="/" className="home-link">Create Your Own Chatbot</Link>
            </div>
        );
    }

    // Success - render chatbot
    const pageTitle = config.companyName
        ? `Chat with ${config.companyName}'s AI Assistant`
        : `AI Chatbot for ${config.domain}`;

    // Show initializing screen while Botpress is initializing
    if (!botpressReady) {
        return (
            <div className="share-initializing">
                <Head>
                    <title>{pageTitle}</title>
                </Head>
                <style jsx>{`
                    .share-initializing {
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                        color: white;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        text-align: center;
                    }
                    .init-icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                        animation: pulse 1.5s ease-in-out infinite;
                    }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.1); opacity: 0.8; }
                    }
                    .init-title {
                        font-size: 24px;
                        margin-bottom: 10px;
                        color: var(--theme-accent, #F48D03);
                    }
                    .init-subtitle {
                        font-size: 16px;
                        opacity: 0.7;
                    }
                    .init-domain {
                        font-size: 18px;
                        margin-top: 20px;
                        padding: 10px 20px;
                        background: rgba(244, 141, 3, 0.2);
                        border-radius: 8px;
                        color: var(--theme-accent, #F48D03);
                    }
                `}</style>
                <div className="init-icon">🤖</div>
                <h1 className="init-title">Starting AI Assistant</h1>
                <p className="init-subtitle">Preparing your personalized chatbot...</p>
                <div className="init-domain">{config.domain}</div>
            </div>
        );
    }

    return (
        <div className="share-page">
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={`AI-powered chatbot for ${config.domain}`} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={`Chat with the AI assistant for ${config.domain}`} />
                {config.screenshotUrl && (
                    <meta property="og:image" content={config.screenshotUrl} />
                )}
            </Head>
            <style jsx global>{`
                html, body {
                    margin: 0;
                    padding: 0;
                    min-height: 100vh;
                }
                .share-page {
                    min-height: 100vh;
                }
            `}</style>
            <Valhallah
                authToken={authToken}
                domain={config.domain}
                isReturning={false}
                isShareableLink={true}
                screenshotUrl={config.screenshotUrl}
                sessionID={config.sessionId}
                website={config.website}
                kbFileId={config.kbFileId}
                botTheme={config.botTheme}
            />
        </div>
    );
}
