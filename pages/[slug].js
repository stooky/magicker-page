"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Valhallah from '../components/Valhallah';
import ThemeProvider from '../components/ThemeProvider';
import LoadingComponent from '../components/LoadingComponent';

/**
 * Shareable Chatbot Page
 *
 * Dynamic route that loads a saved chatbot configuration by slug
 * Example: /gibbonheating-com loads the chatbot for gibbonheating.com
 */
export default function ShareableChatPage() {
    const router = useRouter();
    const { slug } = router.query;

    const [config, setConfig] = useState(null);
    const [authToken, setAuthToken] = useState(null);
    const [sessionID, setSessionID] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Default bot theme fallback
    const DEFAULT_BOT_THEME = {
        name: 'Marv',
        avatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=marv&backgroundColor=b6e3f4&eyes=happy&mouth=smile01',
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        description: 'Your friendly assistant'
    };

    // Generate sessionID on mount (unique per visitor)
    useEffect(() => {
        const existingSession = localStorage.getItem('shareSessionID');
        if (existingSession) {
            setSessionID(existingSession);
        } else {
            const newSessionID = 'share_' + Math.random().toString(36).substring(2, 10);
            localStorage.setItem('shareSessionID', newSessionID);
            setSessionID(newSessionID);
        }
    }, []);

    // Load config when slug and sessionID are available
    useEffect(() => {
        if (!slug || !sessionID) return;

        async function loadConfig() {
            try {
                console.log(`[SharePage] Loading config for slug: ${slug}`);

                // 1. Fetch saved config
                const configRes = await fetch(`/api/share/get-config?slug=${encodeURIComponent(slug)}`);
                const configData = await configRes.json();

                if (!configData.success) {
                    console.error('[SharePage] Config not found:', configData.error);
                    setError(configData.error || 'Chatbot not found');
                    setLoading(false);
                    return;
                }

                console.log('[SharePage] Config loaded:', configData.data);
                setConfig(configData.data);

                // 2. Generate fresh JWT token for this visitor
                const tokenRes = await fetch('/api/botpress/get-auth-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        domain: configData.data.domain,
                        sessionID: sessionID
                    })
                });
                const tokenData = await tokenRes.json();

                if (tokenData.success) {
                    console.log('[SharePage] JWT token generated');
                    setAuthToken(tokenData.authToken);
                } else {
                    console.error('[SharePage] Failed to generate token:', tokenData.error);
                    setError('Failed to initialize chatbot');
                }

                setLoading(false);
            } catch (err) {
                console.error('[SharePage] Error loading config:', err);
                setError('Failed to load chatbot');
                setLoading(false);
            }
        }

        loadConfig();
    }, [slug, sessionID]);

    // Loading state
    if (loading) {
        return (
            <ThemeProvider>
                <div className="full-screen-container">
                    <LoadingComponent />
                </div>
            </ThemeProvider>
        );
    }

    // Error state
    if (error) {
        return (
            <ThemeProvider>
                <div className="full-screen-container" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    backgroundColor: '#00234C',
                    color: 'white',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Chatbot Not Found</h1>
                    <p style={{ color: '#aaa', marginBottom: '2rem' }}>{error}</p>
                    <a
                        href="/"
                        style={{
                            backgroundColor: '#E76F00',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: 'bold'
                        }}
                    >
                        Create Your Own Chatbot
                    </a>
                </div>
            </ThemeProvider>
        );
    }

    // Ready state - render Valhallah with loaded config
    if (!config || !authToken) {
        return (
            <ThemeProvider>
                <div className="full-screen-container">
                    <LoadingComponent />
                </div>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <div className="full-screen-container">
                <Valhallah
                    authToken={authToken}
                    domain={config.domain}
                    isReturning={true}
                    screenshotUrl={config.screenshotUrl}
                    sessionID={sessionID}
                    website={config.website}
                    kbFileId={config.kbFileId}
                    botTheme={config.botTheme || DEFAULT_BOT_THEME}
                />
            </div>
        </ThemeProvider>
    );
}
