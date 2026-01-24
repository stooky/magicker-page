"use client";

import React, { useState, useEffect } from 'react';
import { SCREEN_STATES, BOTPRESS_STATUS, SNIPPET_DISPLAY_TIME } from '../configuration/screenStates';
import FormComponent from '../components/FormComponent';
import LoadingComponent from '../components/LoadingComponent';
import ScanningComponent from '../components/ScanningComponent';
import Valhallah from '../components/Valhallah.js';
import ThemeProvider from '../components/ThemeProvider';
import { CONFIG } from '../configuration/masterConfig';
import axios from 'axios';
import { domainToSlug } from '../lib/slugUtils';


const MainContainer = () => {
    const [loading, setLoading] = useState(false);
    const [callbackReceived, setCallbackReceived] = useState(true);
    const [scrapeResponse, setScrapeResponse] = useState(null);
    const [screenshotUrl, setScreenshotUrl] = useState(null);
    const [iframeUrl, setIframeUrl] = useState('');
    const [showIframe, setShowIframe] = useState(false);
    const [formVisible, setFormVisible] = useState(true);
    const [enteredWebsite, setEnteredWebsite] = useState('');
    const [messages, setMessages] = useState([]); // Hold parsed messages from scraper
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0); // Keep track of where we are in the message index
    const [isLoading, setIsLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);  // New state for scanning
    const [messageItems, setMessageItems] = useState(null);
    const [aiListingUrl, setaiListingUrl] = useState('EMPTY');
    const [authToken, setAuthToken] = useState(null);
    const [domain, setDomain] = useState(null);
    const [isReturning, setIsReturning] = useState(false);
    const [botpressStatus, setBotpressStatus] = useState(BOTPRESS_STATUS.NOT_STARTED);
    const [screenState, setScreenState] = useState(SCREEN_STATES.FORM);
    const [sessionID, setSessionID] = useState('');
    // Knowledge Base state
    const [kbFileId, setKbFileId] = useState(null);
    const [kbReady, setKbReady] = useState(false);
    const [snippetsShownCount, setSnippetsShownCount] = useState(0);
    const [webchatPreloaded, setWebchatPreloaded] = useState(false);

    // Bot theme state (AI-generated from thumbnail, or Marv fallback)
    const DEFAULT_BOT_THEME = {
        name: 'Marv',
        avatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=marv&backgroundColor=b6e3f4&eyes=happy&mouth=smile01',
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        description: 'Your friendly assistant'
    };
    const [botTheme, setBotTheme] = useState(DEFAULT_BOT_THEME);

    const apiKey = process.env.NEXT_PUBLIC_PDL_API_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_PDL_API_URL;
    const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN;

    // Preload webchat during scanning phase
    useEffect(() => {
        if (isScanning && !webchatPreloaded) {
            console.log('[WEBCHAT PRELOAD] Starting webchat preload during scanning...');

            // Check if already loaded
            if (window.__BOTPRESS_PRELOADED__) {
                console.log('[WEBCHAT PRELOAD] Already preloaded, skipping');
                setWebchatPreloaded(true);
                return;
            }

            // Add CSS to hide webchat during preload - aggressive selectors for Botpress v2.2
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
            console.log('[WEBCHAT PRELOAD] Added hide CSS');

            // Add loading overlay with animation to cover chat bubble
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
            console.log('[WEBCHAT PRELOAD] Added megaman loading overlay');

            // Load inject script
            const injectScript = document.createElement('script');
            injectScript.src = 'https://cdn.botpress.cloud/webchat/v2.2/inject.js';

            injectScript.onload = async () => {
                console.log('[WEBCHAT PRELOAD] Inject script loaded');

                // Wait for window.botpress
                let attempts = 0;
                while (!window.botpress && attempts < 50) {
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }

                if (!window.botpress) {
                    console.error('[WEBCHAT PRELOAD] window.botpress not available');
                    return;
                }

                const bp = window.botpress;
                console.log('[WEBCHAT PRELOAD] window.botpress available');

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
                    console.log(`[WEBCHAT PRELOAD] Cleared ${keysToRemove.length} Botpress localStorage keys`);
                }

                // Set up conversation listener
                window.__BOTPRESS_CONVERSATION_READY__ = false;
                window.__BOTPRESS_CONVERSATION_ID__ = null;

                bp.on('conversation', (convId) => {
                    console.log('[WEBCHAT PRELOAD] Conversation started:', convId);
                    window.__BOTPRESS_CONVERSATION_READY__ = true;
                    window.__BOTPRESS_CONVERSATION_ID__ = convId;
                });

                bp.on('webchat:ready', () => {
                    console.log('[WEBCHAT PRELOAD] Webchat ready');
                });

                // Get theme from window global (set by analyze-thumbnail API)
                const theme = window.__BOTPRESS_THEME__ || {
                    name: 'Marv',
                    avatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=marv&backgroundColor=b6e3f4&eyes=happy&mouth=smile01',
                    primaryColor: '#2563eb',
                    description: 'Your friendly assistant'
                };
                console.log('[WEBCHAT PRELOAD] Using theme:', theme.name, theme.primaryColor);

                // Initialize webchat but DON'T open yet
                // Opening during preload starts conversation & bot greeting before we can send context
                bp.init({
                    botId: '3809961f-f802-40a3-aa5a-9eb91c0dedbb',
                    clientId: 'f4011114-6902-416b-b164-12a8df8d0f3d',
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
                console.log('[WEBCHAT PRELOAD] init() called - NOT opening yet (conversation will start in Valhallah)');

                // Mark as preloaded but conversation NOT ready (Valhallah will open and send context)
                window.__BOTPRESS_PRELOADED__ = true;
                window.__BOTPRESS_CONVERSATION_READY__ = false;
                setWebchatPreloaded(true);
            };

            injectScript.onerror = (err) => {
                console.error('[WEBCHAT PRELOAD] Failed to load inject script:', err);
            };

            document.body.appendChild(injectScript);
        }
    }, [isScanning, webchatPreloaded]);



    // Function to call People Data Labs API and get the company name
async function getCompanyName(website) {
    

    console.log('apiUrl: ', apiUrl);
    console.log('website: ', website);
    try {

        // Log the API URL, Website, and API Key (for debugging)
        console.log('API Request Details:');
        console.log('API URL: ', apiUrl);
        console.log('Website: ', website);
        console.log('API Key: ', apiKey); // Be cautious about printing sensitive information like API keys.


        // Make the API request
        const response = await axios.get(apiUrl, {
            params: {
                website: website,
                min_likelihood: 5
            },
            headers: {
                'X-Api-Key': apiKey
            }
        });

        // Extract company name and display name from the response
        const { name, display_name } = response.data;

        // Consolidate the names, preferring 'name' first, and capitalize each word using a regex
        // If neither name is available, return null so caller can use domain fallback
        const rawName = name || display_name;
        if (!rawName) {
            console.log('No company name from PDL, will use domain fallback');
            return null;
        }
        const companyName = rawName.replace(/\b\w/g, (char) => char.toUpperCase());

        // Log the names to console for debugging
        console.log('Company Name:', companyName);

        // Return the company name
        return companyName;

    } catch (error) {
        // Silently fail - PDL API key not configured or invalid
        // console.error('Error fetching company name:', error.message);
        return null; // Return null so caller can use domain fallback
    }
}

    // Define the delay function
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));    



// On component mount, check if sessionID exists in localStorage
useEffect(() => {
    /*let existingSessionID = localStorage.getItem('sessionID');
    if (existingSessionID) {
        setSessionID(existingSessionID);
        console.log('Existing sessionID:', existingSessionID);
    } else {*/
        const newSessionID = Math.random().toString(36).substring(2, 8);
        localStorage.setItem('sessionID', newSessionID);
        setSessionID(newSessionID);
        console.log('New sessionID:', newSessionID);
    //}
}, []);


    // Function to process scraped response message (numbered list)
    const processScrapeResponse = (response) => {
        if (!response) return [];

        // Remove HTML tags
        const strippedText = response.replace(/<[^>]*>?/gm, '');

        // Split by newlines and filter for numbered items
        const items = strippedText
            .split('\n')
            .map(line => line.trim())
            .filter(line => /^\d+\./.test(line)) // Lines starting with number and period
            .map(line => line.replace(/^\d+\.\s*/, '')); // Remove the number prefix

        console.log('Processed snippets:', items.length, items);
        return items;
    };


    useEffect(() => {
        if (isLoading) {
            setScreenState(SCREEN_STATES.LOADING);
        } else if (botpressStatus === BOTPRESS_STATUS.READY) {
            // Check READY status BEFORE isScanning, because isScanning is still true
            setScreenState(SCREEN_STATES.CHAT_TEASE);
        } else if (isScanning) {
            setScreenState(SCREEN_STATES.SCANNING);
        } else {
            setScreenState(SCREEN_STATES.FORM);
        }
    }, [isLoading, isScanning, botpressStatus]);

    // Remove webchat hide CSS and overlay when transitioning to chat screen
    useEffect(() => {
        if (screenState === SCREEN_STATES.CHAT_TEASE) {
            const hideStyle = document.getElementById('botpress-preload-hide');
            if (hideStyle) {
                hideStyle.remove();
                console.log('[WEBCHAT PRELOAD] Removed hide CSS - webchat now visible');
            }
            // Remove the loading overlay with fade out
            const overlay = document.getElementById('webchat-loading-overlay');
            if (overlay) {
                overlay.style.transition = 'opacity 0.3s ease-out';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    console.log('[WEBCHAT PRELOAD] Removed megaman overlay');
                }, 300);
            }
        }
    }, [screenState]);

    // Loop through our messages.
    useEffect(() => {
        if (messages.length > 0) {
            const interval = setInterval(() => {
                setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
            }, 5000); // Change message every 5 seconds
    
            return () => clearInterval(interval);
        }
    }, [messages]);

    // Using direct response from /api/scrape-website (no polling needed)

    

    // Looking for our screenshot URL or message items (from scraping)
    useEffect(() => {
        if (screenshotUrl || messageItems) {
            setIsLoading(false);    // Stop loading screen
            setIsScanning(true);    // Start scanning screen
        }
    }, [screenshotUrl, messageItems]);

    // Snippet display timer and counter
    useEffect(() => {
        console.log('Snippet tracking:', {
            hasMessageItems: messageItems && messageItems.length > 0,
            messageItemsLength: messageItems?.length,
            botpressStatus: botpressStatus,
            kbReady: kbReady,
            snippetsShown: snippetsShownCount
        });

        if (messageItems && messageItems.length > 0 && botpressStatus === BOTPRESS_STATUS.CREATED) {
            console.log(`✓ SNIPPET TRACKING STARTED: ${messageItems.length} snippets to show`);

            // Increment snippet count every SNIPPET_DISPLAY_TIME
            const countInterval = setInterval(() => {
                setSnippetsShownCount(prev => {
                    const newCount = prev + 1;
                    console.log(`Snippet ${newCount} shown`);
                    return Math.min(newCount, messageItems.length);
                });
            }, SNIPPET_DISPLAY_TIME);

            return () => {
                console.log('Snippet tracking cleanup');
                clearInterval(countInterval);
            };
        }
    }, [messageItems, botpressStatus]);

    // Transition logic: Wait for BOTH KB ready AND 2+ snippets shown
    useEffect(() => {
        if (kbReady && snippetsShownCount >= 2 && botpressStatus === BOTPRESS_STATUS.CREATED) {
            console.log(`✓ READY TO TRANSITION: KB ready=${kbReady}, Snippets shown=${snippetsShownCount}`);
            setBotpressStatus(BOTPRESS_STATUS.READY);
        }
    }, [kbReady, snippetsShownCount, botpressStatus]);


    const extractCompanyName = (message, website) => {
        if (message) {
            const match = message.match(/--(.+?)--/);
            if (match) {
                return match[1].trim();
            }
        }
        // Remove "http://" or "https://"
        const cleanedWebsite = website.replace(/^https?:\/\//, '');
        return `magic-page-company-${cleanedWebsite.replace(/\./g, '-')}`;
    };

    // NOTE: KB polling removed - kb-create now waits for indexing to complete
    // and returns ready=true directly. No more frontend polling needed!



    const handleSubmit = async (email, website) => {
        if (!email || !website || !email.includes('@') || !website.startsWith('http')) {
            alert("Please enter a valid email and website URL.");
            return;
        }

        let myListingUrl = "EMPTY"; // Define and initialize myListingUrl here

        setScrapeResponse(null);
        setScreenshotUrl(null);
        setEnteredWebsite(website);
        setFormVisible(false); // Hide the form and show the message
        setIsLoading(true); // Show loading screen

        if (!callbackReceived) {
            alert("Please wait until the current request is processed.");
            return;
        }

        // Extract domain from website URL (used throughout the flow)
        const extractDomain = (url) => {
            try {
                return new URL(url).hostname.replace('www.', '');
            } catch (e) {
                return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
            }
        };
        const websiteDomain = extractDomain(website);
        console.log('Extracted domain:', websiteDomain);

        // CHECK IF DOMAIN ALREADY EXISTS
        try {
            console.log('Checking if domain already exists...');
            const domainCheckResponse = await fetch(`/api/dbCheckDomain?website=${encodeURIComponent(website)}`);
            const domainCheckData = await domainCheckResponse.json();

            if (domainCheckData.exists) {
                console.log('Domain already exists! Loading existing data...');
                const existingData = domainCheckData.data;

                // Parse the bot config from mylistingurl
                let existingBotConfig = null;
                try {
                    existingBotConfig = JSON.parse(existingData.mylistingurl);
                } catch (e) {
                    console.log('Could not parse existing bot config, will create new session');
                }

                // Set the screenshot - fetch fresh if missing or invalid
                let screenshotToUse = existingData.screenshoturl;
                if (!screenshotToUse || screenshotToUse === 'TEMP_URL' || !screenshotToUse.startsWith('/screenshots/')) {
                    console.log('Screenshot missing or invalid, fetching fresh screenshot...');
                    try {
                        const freshScreenshot = await fetch(`/api/get-screenshot?url=${encodeURIComponent(website)}&sessionID=${existingData.sessionid}`);
                        const freshData = await freshScreenshot.json();
                        if (freshData.screenshotPath) {
                            screenshotToUse = freshData.screenshotPath;
                            console.log('Fresh screenshot captured:', screenshotToUse);
                            // Update database with new screenshot (fire-and-forget)
                            fetch('/api/dbUpdateVisitor', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    sessionID: existingData.sessionid,
                                    screenshotUrl: screenshotToUse
                                })
                            }).catch(() => {});
                        }
                    } catch (err) {
                        console.log('Failed to fetch fresh screenshot:', err.message);
                    }
                }
                setScreenshotUrl(screenshotToUse);

                // If domain exists, generate JWT token for existing domain
                if (existingBotConfig) {
                    setIsLoading(false);
                    setIsScanning(false);

                    // Subscribe this email to the domain (they'll get the shareable link email)
                    // Fire-and-forget - don't block the user experience
                    if (email && existingData.slug) {
                        console.log('Subscribing returning visitor email to domain...');
                        fetch('/api/share/subscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: email,
                                domain: websiteDomain,
                                slug: existingData.slug
                            })
                        }).then(res => res.json())
                          .then(data => console.log('Subscription result:', data))
                          .catch(err => console.log('Subscription failed (non-critical):', err.message));
                    }

                    // Generate JWT token for existing domain (websiteDomain already defined above)
                    const tokenResponse = await fetch('/api/botpress/get-auth-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            domain: websiteDomain,
                            sessionID: sessionID
                        })
                    });
                    const tokenData = await tokenResponse.json();

                    if (tokenData.success) {
                        setAuthToken(tokenData.authToken);
                        setDomain(websiteDomain);
                        setIsReturning(true);
                        setBotpressStatus(BOTPRESS_STATUS.READY);
                        return; // Exit early - skip the full flow
                    }
                }
            }

            console.log('Domain is new, proceeding with full flow...');

            // SEND SIGNUP NOTIFICATION (only for NEW domains - returning visitors get shareable link email via /api/share/subscribe)
            fetch('/api/notify-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, website })
            }).catch(err => console.log('Notification failed (non-critical):', err.message));
        } catch (error) {
            console.error('Error checking domain:', error);
            // Continue with normal flow if check fails
        }

        setLoading(true); // Ensure loading is set to true

        try {
            // Use domain as company name (cleaner than "Unknown Company")
            // Format: capitalize first letter of each part (e.g., "weezer.com" -> "Weezer.com")
            let companyName = websiteDomain.charAt(0).toUpperCase() + websiteDomain.slice(1);
            console.log('Company Name (from domain):', companyName);
            
            console.log('Calling Screenshot');
            const screenshotResponse = await fetch(`/api/get-screenshot?url=${encodeURIComponent(website)}&sessionID=${sessionID}`);
            const screenshotData = await screenshotResponse.json();
            if (screenshotData.screenshotUrl) {
                console.log('Thumbnail successfully captured and generated.');

                // Analyze thumbnail with OpenAI to get dynamic theme
                console.log('Analyzing thumbnail for bot theme...');
                try {
                    const themeResponse = await fetch('/api/analyze-thumbnail', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ thumbnailBase64: screenshotData.screenshotUrl })
                    });
                    const themeData = await themeResponse.json();

                    if (themeData.success && themeData.theme) {
                        console.log('AI-generated theme:', themeData.theme);
                        setBotTheme(themeData.theme);
                        // Store in window for webchat preload to access
                        window.__BOTPRESS_THEME__ = themeData.theme;
                    } else {
                        console.log('Using default Marv theme');
                        window.__BOTPRESS_THEME__ = DEFAULT_BOT_THEME;
                    }
                } catch (themeError) {
                    console.error('Theme analysis failed, using Marv fallback:', themeError.message);
                    window.__BOTPRESS_THEME__ = DEFAULT_BOT_THEME;
                }

                // Now set screenshot URL (triggers scanning phase)
                setScreenshotUrl(screenshotData.screenshotUrl);
            } else {
                console.error('Error fetching screenshot:', screenshotData.error);
                // Even if screenshot fails, set default theme
                window.__BOTPRESS_THEME__ = DEFAULT_BOT_THEME;
            }

            // Generate slug for shareable URL
            const slug = domainToSlug(websiteDomain);
            console.log('Generated slug:', slug, 'for domain:', websiteDomain);

            // Insert the visitor data into the database
            try {
                console.log('Inserting visitor:', sessionID, email, website, companyName, 'slug:', slug);
                await axios.post('/api/dbInsertVisitor', {
                    sessionID: sessionID,
                    email: email,
                    website: website,
                    companyName: companyName,
                    myListingUrl: "EMPTY",
                    screenshotUrl: screenshotData.screenshotPath || `/screenshots/${sessionID}.png`,
                    slug: slug,
                });
                console.log('Visitor inserted successfully:', sessionID, 'with slug:', slug);
            } catch (error) {
                console.log('Error inserting visitor (non-critical):', error.message);
            }

            console.log('Calling Website Scraper');
            const scrapeResponse = await fetch('/api/scrape-website', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: website }),
            });
            const scrapeData = await scrapeResponse.json();
            console.log('Scraper Response:', scrapeData);  // Log the full response
            console.log('Method used:', scrapeData.method_used, 'Pages found:', scrapeData.pages_found);

            // Process the scraped data into message items for display
            const processedItems = processScrapeResponse(scrapeData.message);
            // Limit to SNIPPET_SHOW number of snippets (default 5, max 10)
            const snippetLimit = parseInt(process.env.SNIPPET_SHOW) || 5;
            const limitedItems = processedItems.slice(0, Math.min(snippetLimit, 10));
            console.log(`Showing ${limitedItems.length} of ${processedItems.length} snippets`);
            setMessageItems(limitedItems);
            setScrapeResponse(scrapeData);
            setLoading(false);
            setCallbackReceived(true);

            // Create Knowledge Base with full scraped content
            console.log('Creating Knowledge Base...');
            const domain = websiteDomain; // Already extracted at start of handleSubmit

            const kbResponse = await fetch('/api/botpress/kb-create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    domain: domain,
                    fullContent: scrapeData.fullContent || '',
                    sessionID: sessionID,
                    website: website
                })
            });
            const kbData = await kbResponse.json();
            console.log('Knowledge Base created:', kbData);

            // Store KB file ID for use in database update (React state is async)
            let currentKbFileId = null;
            if (kbData.success) {
                currentKbFileId = kbData.fileId;
                setKbFileId(kbData.fileId);
                console.log('KB File ID:', kbData.fileId);
                // kb-create now waits for indexing - no polling needed!
                if (kbData.ready) {
                    console.log('✓ Knowledge Base is READY! (indexed server-side)');
                    setKbReady(true);
                } else {
                    console.warn('KB created but not marked ready, assuming ready anyway');
                    setKbReady(true);
                }
            } else {
                console.error('Failed to create KB, continuing anyway');
                setKbReady(true); // Allow flow to continue
            }

            // Generate JWT authentication token with domain context
            console.log('Generating JWT authentication token...');
            setBotpressStatus(BOTPRESS_STATUS.CREATING); // Mark as creating
            const tokenResponse = await fetch('/api/botpress/get-auth-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    domain: domain,
                    sessionID: sessionID
                })
            });
            const tokenData = await tokenResponse.json();
            console.log('JWT Token Response:', tokenData);

            if (tokenData.success) {
                setAuthToken(tokenData.authToken);
                setDomain(domain);
                setIsReturning(false); // New visitor
                setBotpressStatus(BOTPRESS_STATUS.CREATED); // JWT created, but wait for snippets
                console.log('JWT token generated - waiting for KB ready and snippets to complete');

                // Update database with domain info and shareable config (non-critical)
                // Use currentKbFileId (local var) instead of kbFileId (React state) due to async state updates
                try {
                    await axios.post('/api/dbUpdateVisitor', {
                        sessionID: sessionID,
                        myListingUrl: JSON.stringify({ domain: domain, sessionID: sessionID }),
                        slug: domainToSlug(domain),
                        botTheme: window.__BOTPRESS_THEME__ || botTheme,
                        kbFileId: currentKbFileId
                    });
                    console.log('Domain info and shareable config saved to database, kbFileId:', currentKbFileId);
                } catch (error) {
                    console.log('Could not save to database (non-critical):', error.message);
                    // Continue anyway - database save is not critical for UX
                }
            } else {
                console.error('Failed to generate JWT token:', tokenData.error);
                setBotpressStatus(BOTPRESS_STATUS.ERROR);
                setIsScanning(false);
                setIsLoading(false);
                alert('Failed to create AI authentication. Please try again or contact support.');
                return; // Exit early
            }
            

        
        } catch (error) {
            console.error('Failed to call the API Stuff:', error);
            setScrapeResponse({ status: 'error', message: `Failed to process request: ${error.message}` });
        }
    };

    const formatResponse = (response) => {
        if (response && response.message) {
            return response.message.replace(/\n/g, '<br />');
        }
        return '';
    };

    const formatErrorResponse = (response) => {
        if (response && response.rawBody) {
            return `<strong>Error:</strong> ${response.message}<br/><br/><strong>Raw Body:</strong><br/>${response.rawBody.replace(/\n/g, '<br />')}`;
        }
        return `<strong>Error:</strong> ${response.message}`;
    };


    return (
        <ThemeProvider>
            <div className="full-screen-container">
                {screenState === SCREEN_STATES.LOADING ? (
                    <LoadingComponent />
                ) : screenState === SCREEN_STATES.SCANNING ? (
                    <ScanningComponent screenshotUrl={screenshotUrl} messageItems={messageItems} />
                ) : screenState === SCREEN_STATES.CHAT_TEASE ? (
                    <Valhallah
                        authToken={authToken}
                        domain={domain}
                        isReturning={isReturning}
                        screenshotUrl={screenshotUrl}
                        sessionID={sessionID}
                        website={enteredWebsite}
                        kbFileId={kbFileId}
                        botTheme={botTheme}
                    />
                ) : (
                    <div className="centered-content">
                        <FormComponent onSubmit={handleSubmit} />
                    </div>
                )}
            </div>
        </ThemeProvider>
    );
    
       
    
    
};    


export default MainContainer;
