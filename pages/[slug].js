// pages/[slug].js
// Dynamic shareable chatbot page
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Valhallah from '../components/Valhallah';

export default function ShareableChatbot() {
    const router = useRouter();
    const { slug } = router.query;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [config, setConfig] = useState(null);
    const [authToken, setAuthToken] = useState(null);

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
            } catch (err) {
                console.error('[slug] Error loading config:', err);
                setError('Failed to load chatbot');
                setLoading(false);
            }
        }

        loadConfig();
    }, [slug]);

    // Loading state
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
                        border-top-color: #E76F00;
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
                        color: #E76F00;
                        text-decoration: none;
                        padding: 12px 24px;
                        border: 2px solid #E76F00;
                        border-radius: 8px;
                        transition: all 0.2s;
                    }
                    .home-link:hover {
                        background: #E76F00;
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
                isReturning={true}
                screenshotUrl={config.screenshotUrl}
                sessionID={config.sessionId}
                website={config.website}
                kbFileId={config.kbFileId}
                botTheme={config.botTheme}
            />
        </div>
    );
}
