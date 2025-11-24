"use client";

import React, { useState, useEffect } from 'react';
// Removed Zapier webhook import - now using direct scraping API
import { SCREEN_STATES, BOTPRESS_STATUS, SNIPPET_DISPLAY_TIME } from '../configuration/screenStates';
import FormComponent from '../components/FormComponent';
import LoadingComponent from '../components/LoadingComponent';
import ScanningComponent from '../components/ScanningComponent';
import Valhallah from '../components/Valhallah.js';
import axios from 'axios';


const MainContainer = () => {
    const [loading, setLoading] = useState(false);
    const [callbackReceived, setCallbackReceived] = useState(true);
    const [zapierResponse, setZapierResponse] = useState(null);
    const [screenshotUrl, setScreenshotUrl] = useState(null);
    const [iframeUrl, setIframeUrl] = useState('');
    const [showIframe, setShowIframe] = useState(false);
    const [formVisible, setFormVisible] = useState(true);
    const [enteredWebsite, setEnteredWebsite] = useState('');
    const [messages, setMessages] = useState([]); // Hold parsed messages from Zapier
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
    const apiKey = process.env.NEXT_PUBLIC_PDL_API_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_PDL_API_URL;
    const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN;



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
        const companyName = (name || display_name || 'Unknown Company').replace(/\b\w/g, (char) => char.toUpperCase());


        // Log the names to console for debugging
        console.log('Company Name:', companyName);

        // Return the first valid company name, or a default value
        return companyName;

    } catch (error) {
        // Silently fail - PDL API key not configured or invalid
        // console.error('Error fetching company name:', error.message);
        return 'Unknown Company';
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
    const processZapierResponse = (response) => {
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
    
    // Loop through our messages.
    useEffect(() => {
        if (messages.length > 0) {
            const interval = setInterval(() => {
                setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
            }, 5000); // Change message every 5 seconds
    
            return () => clearInterval(interval);
        }
    }, [messages]);

    // OLD ZAPIER POLLING - REMOVED
    // Now using direct response from /api/scrape-website (no polling needed)

    

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

    // Poll Knowledge Base status until indexed and ready
    const startKBPolling = (fileId) => {
        console.log('Starting KB status polling for:', fileId);
        const pollInterval = setInterval(async () => {
            try {
                const statusResponse = await fetch(`/api/botpress/kb-status?fileId=${fileId}`);
                const statusData = await statusResponse.json();

                console.log('KB Status:', statusData);

                if (statusData.success && statusData.ready) {
                    console.log('✓ Knowledge Base is READY!');
                    setKbReady(true);
                    clearInterval(pollInterval);
                }
            } catch (error) {
                console.error('Error polling KB status:', error);
            }
        }, 2000); // Poll every 2 seconds

        // Safety: stop polling after 60 seconds
        setTimeout(() => {
            clearInterval(pollInterval);
            if (!kbReady) {
                console.warn('KB polling timeout - assuming ready');
                setKbReady(true);
            }
        }, 60000);
    };



    const handleSubmit = async (email, website) => {
        if (!email || !website || !email.includes('@') || !website.startsWith('http')) {
            alert("Please enter a valid email and website URL.");
            return;
        }

        let myListingUrl = "EMPTY"; // Define and initialize myListingUrl here

        setZapierResponse(null);
        setScreenshotUrl(null);
        setEnteredWebsite(website);
        setFormVisible(false); // Hide the form and show the message
        setIsLoading(true); // Show loading screen

        if (!callbackReceived) {
            alert("Please wait until the current request is processed.");
            return;
        }

        await fetch('/api/clear-response', { method: 'POST' });

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

                // Set the screenshot
                setScreenshotUrl(existingData.screenshoturl);

                // If domain exists, generate JWT token for existing domain
                if (existingBotConfig) {
                    setIsLoading(false);
                    setIsScanning(false);

                    // Extract domain from website
                    const extractDomain = (url) => {
                        try {
                            return new URL(url).hostname.replace('www.', '');
                        } catch (e) {
                            return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                        }
                    };
                    const websiteDomain = extractDomain(website);

                    // Generate JWT token for existing domain
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
        } catch (error) {
            console.error('Error checking domain:', error);
            // Continue with normal flow if check fails
        }

        setLoading(true); // Ensure loading is set to true

        try {
            // Skip PDL API call - just use Unknown Company
            let companyName = 'Unknown Company';
            console.log('Company Name:', companyName);
            
            console.log('Calling Screenshot');
            const screenshotResponse = await fetch(`/api/get-screenshot?url=${encodeURIComponent(website)}&sessionID=${sessionID}`);
            const screenshotData = await screenshotResponse.json();
            if (screenshotData.screenshotUrl) {
                setScreenshotUrl(screenshotData.screenshotUrl);
                console.log('Thumbnail successfully captured and generated.', screenshotUrl, ' : ', screenshotData.screenshotUrl);
            } else {
                console.error('Error fetching screenshot:', screenshotData.error);
            }

            // Insert the visitor data into the database (skip screenshot - too large)
            try {
                console.log('Inserting visitor:', sessionID, email, website, companyName);
                await axios.post('/api/dbInsertVisitor', {
                    sessionID: sessionID,
                    email: email,
                    website: website,
                    companyName: companyName,
                    myListingUrl: "EMPTY",
                    screenshotUrl: "TEMP_URL", // TODO: Store screenshot separately
                });
                console.log('Visitor inserted successfully:', sessionID);
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
            const processedItems = processZapierResponse(scrapeData.message);
            // Limit to SNIPPET_SHOW number of snippets (default 5, max 10)
            const snippetLimit = parseInt(process.env.SNIPPET_SHOW) || 5;
            const limitedItems = processedItems.slice(0, Math.min(snippetLimit, 10));
            console.log(`Showing ${limitedItems.length} of ${processedItems.length} snippets`);
            setMessageItems(limitedItems);
            setZapierResponse(scrapeData);
            setLoading(false);
            setCallbackReceived(true);

            // Create Knowledge Base with full scraped content
            console.log('Creating Knowledge Base...');
            const extractDomain = (url) => {
                try {
                    return new URL(url).hostname.replace('www.', '');
                } catch (e) {
                    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                }
            };
            const domain = extractDomain(website);

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

            if (kbData.success) {
                setKbFileId(kbData.fileId);
                console.log('KB File ID:', kbData.fileId);
                // Start polling for KB ready status
                startKBPolling(kbData.fileId);
            } else {
                console.error('Failed to create KB, continuing anyway');
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

                // Update database with domain info (non-critical)
                try {
                    await axios.post('/api/dbUpdateVisitor', {
                        sessionID: sessionID,
                        myListingUrl: JSON.stringify({ domain: domain, sessionID: sessionID })
                    });
                    console.log('Domain info saved to database');
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
            setZapierResponse({ status: 'error', message: `Failed to call the API stuff: ${error.message}` });
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
                />
            ) : (
                <div className="centered-content">
                    <FormComponent onSubmit={handleSubmit} />
                </div>
            )}

        </div>
    );
    
       
    
    
};    


export default MainContainer;
