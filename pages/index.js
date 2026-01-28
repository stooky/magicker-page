"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { SCREEN_STATES, BOTPRESS_STATUS, SNIPPET_DISPLAY_TIME } from '../configuration/screenStates';
import FormComponent from '../components/FormComponent';
import LoadingComponent from '../components/LoadingComponent';
import ScanningComponent from '../components/ScanningComponent';
import Valhallah from '../components/Valhallah.js';
import ThemeProvider from '../components/ThemeProvider';
import { CONFIG } from '../configuration/masterConfig';
import { preloadWebchat, removeHideCSS, state as webchatState } from '../lib/botpress-webchat';
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

    // Bot theme state (AI-generated from thumbnail, or default from config)
    const [botTheme, setBotTheme] = useState(CONFIG.defaultBotTheme);

    // Memoize bot theme to prevent unnecessary preload re-triggers
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const memoizedBotTheme = useMemo(() => botTheme, [botTheme.name, botTheme.primaryColor]);

    // Preload webchat during scanning phase (via shared module)
    useEffect(() => {
        if (isScanning && !webchatPreloaded) {
            if (webchatState.preloaded) {
                console.log('[WEBCHAT PRELOAD] Already preloaded, skipping');
                setWebchatPreloaded(true);
                return;
            }
            preloadWebchat(memoizedBotTheme).then(() => setWebchatPreloaded(true));
        }
    }, [isScanning, webchatPreloaded, memoizedBotTheme]);

    // Define the delay function
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// On component mount, generate a new sessionID
useEffect(() => {
    const newSessionID = Math.random().toString(36).substring(2, 8);
    localStorage.setItem('sessionID', newSessionID);
    setSessionID(newSessionID);
    console.log('New sessionID:', newSessionID);
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
            removeHideCSS({ fade: true });
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

                // Set the screenshot - only fetch if missing/invalid OR older than 30 days
                let screenshotToUse = existingData.screenshoturl;
                const screenshotAge = existingData.created_at
                    ? Date.now() - new Date(existingData.created_at).getTime()
                    : Infinity;
                const maxScreenshotAge = 30 * 24 * 60 * 60 * 1000; // 30 days

                const needsFreshScreenshot = !screenshotToUse ||
                    screenshotToUse === 'TEMP_URL' ||
                    !screenshotToUse.startsWith('/screenshots/') ||
                    screenshotAge > maxScreenshotAge;

                if (needsFreshScreenshot) {
                    console.log(`Screenshot needs refresh: missing=${!screenshotToUse}, age=${Math.round(screenshotAge / 86400000)}d`);
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
                } else {
                    console.log(`Using cached screenshot (age: ${Math.round(screenshotAge / 86400000)}d)`);
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
            // Admin notification will be sent AFTER processing is complete (see below)
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
                        // Store in module state for webchat preload to access
                        webchatState.theme = themeData.theme;
                    } else {
                        console.log('Using default Marv theme');
                        webchatState.theme = CONFIG.defaultBotTheme;
                    }
                } catch (themeError) {
                    console.error('Theme analysis failed, using Marv fallback:', themeError.message);
                    webchatState.theme = CONFIG.defaultBotTheme;
                }

                // Now set screenshot URL (triggers scanning phase)
                setScreenshotUrl(screenshotData.screenshotUrl);
            } else {
                console.error('Error fetching screenshot:', screenshotData.error);
                // Even if screenshot fails, set default theme
                webchatState.theme = CONFIG.defaultBotTheme;
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
                        botTheme: webchatState.theme || botTheme,
                        kbFileId: currentKbFileId
                    });
                    console.log('Domain info and shareable config saved to database, kbFileId:', currentKbFileId);

                    // SEND ADMIN NOTIFICATION (after all processing is complete)
                    // Now we have: screenshot, theme, KB file, slug, etc.
                    fetch('/api/notify-signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, website })
                    }).catch(err => console.log('Admin notification failed (non-critical):', err.message));
                } catch (error) {
                    console.log('Could not save to database (non-critical):', error.message);
                    // Continue anyway - database save is not critical for UX
                    // Still send admin notification even if DB save failed
                    fetch('/api/notify-signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, website })
                    }).catch(err => console.log('Admin notification failed (non-critical):', err.message));
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
