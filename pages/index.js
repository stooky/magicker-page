"use client";

import React, { useState, useEffect } from 'react';
// Removed Zapier webhook import - now using direct scraping API
import { SCREEN_STATES } from '../configuration/screenStates';
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
    const [botConfig, setBotConfig] = useState(null);
    const [screenState, setScreenState] = useState(SCREEN_STATES.FORM);
    const [sessionID, setSessionID] = useState('');
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

    
    // Function to get myListingUrl from the database using sessionID
    async function fetchMyListingUrl(sessionID) {
        try {
            const response = await axios.get(`https://${process.env.NEXT_PUBLIC_DOMAIN}/api/dbGetVisitor`, {
                params: { sessionID: sessionID }
            });
            
    
            if (response.status === 200) {
                const myListingUrl = response.data.data.mylistingurl;
                console.log('My Listing URL:', myListingUrl);
                // Use the myListingUrl variable in your program
                return myListingUrl;
            } else {
                console.error('No data found for the given sessionID');
                return null;
            }
        } catch (error) {
            console.error('Error fetching data:', error.message);
            return null;
        }
    }

    useEffect(() => {
        if (isLoading) {
            setScreenState(SCREEN_STATES.LOADING);
        } else if (isScanning) {
            setScreenState(SCREEN_STATES.SCANNING);
        } else if (botConfig !== null) {
            setScreenState(SCREEN_STATES.CHAT_TEASE);
        } else {
            setScreenState(SCREEN_STATES.FORM);
        }
    }, [isLoading, isScanning, botConfig]);
    
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

                // If we have bot config, skip straight to chat
                if (existingBotConfig && existingBotConfig.botId) {
                    setIsLoading(false);
                    setIsScanning(false);
                    setBotConfig({
                        ...existingBotConfig,
                        sessionID: sessionID,
                        isReturning: true // Flag to show "Already made!" message
                    });
                    return; // Exit early - skip the full flow
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
            setMessageItems(processedItems);
            setZapierResponse(scrapeData);
            setLoading(false);
            setCallbackReceived(true);

            // Create Botpress session (without scraped content for now - payload too large)
            console.log('Creating Botpress session...');
            const botpressResponse = await fetch('/api/botpress/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    website,
                    company: companyName,
                    sessionID
                    // scrapedContent: processedItems,  // TODO: Add back with pagination or KB
                    // screenshot: screenshotData.screenshotUrl
                })
            });
            const botpressData = await botpressResponse.json();
            console.log('Botpress Session Created:', botpressData);

            if (!botpressData.success) {
                console.error('Failed to create Botpress session:', botpressData);
                throw new Error('Botpress session creation failed');
            }

            // Get Botpress configuration
            console.log('Fetching Botpress configuration...');
            const configResponse = await fetch('/api/botpress/get-config');
            const config = await configResponse.json();

            if (config.success) {
                // Store bot configuration with session data
                const botConfigWithSession = {
                    ...config,
                    sessionID: sessionID,
                };

                setBotConfig(botConfigWithSession);
                setIsScanning(false);
                console.log('Botpress configuration loaded:', botConfigWithSession);

                // Update database with bot session info (non-critical)
                try {
                    await axios.post('/api/dbUpdateVisitor', {
                        sessionID: sessionID,
                        myListingUrl: JSON.stringify(botConfigWithSession)
                    });
                    console.log('Botpress session saved to database');
                } catch (error) {
                    console.log('Could not save to database (non-critical):', error.message);
                    // Continue anyway - database save is not critical for UX
                }
            } else {
                console.error('Failed to get Botpress configuration:', config.error);
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
                <Valhallah botConfig={botConfig} sessionID={sessionID} screenshotUrl={screenshotUrl} />
            ) : (
                <div className="centered-content">
                    <FormComponent onSubmit={handleSubmit} />
                </div>
            )}

        </div>
    );
    
       
    
    
};    


export default MainContainer;
