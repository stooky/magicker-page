import React, { useEffect, useState } from 'react';
import '../src/css/main.css';
import '../src/css/mockbox.css';
import '../src/css/thumbnail.css';
import '../src/css/ai_agent.css';
import '../src/css/weird_stuff.css';
import '../src/css/style.css';

export default function ScanningComponent({ screenshotUrl, messageItems }) {
    const [activeStep, setActiveStep] = useState(0);
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [messages, setMessages] = useState(['Building Your AI']); // Default title

    useEffect(() => {
        const steps = [
            { name: 'Loading website', duration: 2000 },
            { name: 'Scanning website', duration: 3000 },
            { name: 'Generating AI Agent', duration: 4000 },
            { name: 'Build preview', duration: 5000 }
        ];

        let totalTime = 0;

        steps.forEach((step, index) => {
            totalTime += step.duration;
            setTimeout(() => {
                setActiveStep(index);
            }, totalTime);
        });
    }, []);

    // Effect to start cycling through messages from messageItems
    useEffect(() => {
        if (messageItems && messageItems.length > 0) {
            setMessages(messageItems);
            setCurrentMessageIndex(0); // Reset to first message

            // Start cycling through messages every 3 seconds
            const interval = setInterval(() => {
                setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messageItems.length);
            }, 3000); // Change message every 3 seconds

            return () => clearInterval(interval);
        }
    }, [messageItems]);

    return (
        <div className="magic_mock_body">
            <div className="mock_box">
                {/* Conditionally render <h2> or <p> based on the message */}
                {messages[currentMessageIndex] === 'Building Your AI' ? (
                    <h2>{messages[currentMessageIndex]}</h2>
                ) : (
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
                    <div className={`status-item ${activeStep >= 0 ? 'active' : ''}`}>
                        <span className="bullet"></span> Loading website
                    </div>
                    <div className={`status-item ${activeStep >= 1 ? 'active' : ''}`}>
                        <span className="bullet"></span> Scanning website
                    </div>
                    <div className={`status-item ${activeStep >= 2 ? 'active' : ''}`}>
                        <span className="bullet"></span> Generating AI Agent
                    </div>
                    <div className={`status-item ${activeStep >= 3 ? 'active' : ''}`}>
                        <span className="bullet"></span> Build preview
                    </div>
                </div>
            </div>

            <div className="footer">
                <p className="foot_logo">
                    <i> Powered by Member Solutions </i>
                </p>
                <p> Copyright © 2025  &nbsp; | &nbsp;  Privacy Policy &nbsp;  |  &nbsp; Legal </p>
            </div>
        </div>
    );
}
