import React, { useEffect, useState } from 'react';
import { SNIPPET_DISPLAY_TIME, SCANNING_STAGE_CONFIG } from '../configuration/screenStates';
import { CONFIG } from '../configuration/masterConfig';
import '../src/css/main.css';
import '../src/css/mockbox.css';
import '../src/css/thumbnail.css';
import '../src/css/ai_agent.css';
import '../src/css/weird_stuff.css';
import '../src/css/style.css';

export default function ScanningComponent({ screenshotUrl, messageItems }) {
    const [activeStep, setActiveStep] = useState(0);
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [currentHeaderIndex, setCurrentHeaderIndex] = useState(0);
    const [messages, setMessages] = useState([]); // Snippet messages from scraped content

    const { steps } = SCANNING_STAGE_CONFIG;

    // Effect to cycle through header quotes (h2) - stops when snippets arrive
    useEffect(() => {
        // Don't cycle if we have snippet messages
        if (messages.length > 0) return;

        const interval = setInterval(() => {
            setCurrentHeaderIndex(prevIndex =>
                (prevIndex + 1) % SCANNING_STAGE_CONFIG.quotes.length
            );
        }, SCANNING_STAGE_CONFIG.delayMs);

        return () => clearInterval(interval);
    }, [messages.length]);

    useEffect(() => {
        let totalTime = 0;

        steps.forEach((step, index) => {
            totalTime += step.duration;
            setTimeout(() => {
                setActiveStep(index);
            }, totalTime);
        });
    }, [steps]);

    // Effect to start cycling through snippet messages from messageItems
    useEffect(() => {
        if (messageItems && messageItems.length > 0) {
            setMessages(messageItems);
            setCurrentMessageIndex(0); // Reset to first message

            // Start cycling through messages
            const interval = setInterval(() => {
                setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messageItems.length);
            }, SNIPPET_DISPLAY_TIME);

            return () => clearInterval(interval);
        }
    }, [messageItems]);

    return (
        <div className="magic_mock_body">
            <div className="mock_box">
                {/* Header quote - cycles through configured quotes, hides when snippets arrive */}
                {messages.length === 0 && (
                    <h2>{SCANNING_STAGE_CONFIG.quotes[currentHeaderIndex]}</h2>
                )}

                {/* Snippet messages from scraped content */}
                {messages.length > 0 && (
                    <h3>{messages[currentMessageIndex]}</h3>
                )}
                <br /><br />
    
                <div className="thumbnail_sec">
                    <div className="web_thumb_img">
                        <img src={screenshotUrl} alt="Website Thumbnail" />
                        <div className="scan-bar"></div>
                    </div>
                </div>
            </div>
    
            <div className="status_container">
                <div className="status-list">
                    {steps.map((step, index) => (
                        <div key={index} className={`status-item ${activeStep >= index ? 'active' : ''}`}>
                            <span className="bullet"></span> {step.name}
                        </div>
                    ))}
                </div>
            </div>

            <div className="footer">
                <p className="foot_logo">
                    <i> {CONFIG.branding.poweredByText} </i>
                </p>
                <p> {CONFIG.branding.copyright} &nbsp; | &nbsp; {CONFIG.branding.legalLinks} </p>
            </div>
        </div>
    );
}
