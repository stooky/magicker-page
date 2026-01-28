import React, { useState } from 'react';
import { CONFIG } from '../configuration/masterConfig';

const FormComponent = ({ onSubmit }) => {
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');

    // Function to validate and format website URL
    const formatUrl = (url) => {
        // Add http:// if the URL doesn't start with http:// or https://
        if (!/^https?:\/\//i.test(url)) {
            return `http://${url}`;
        }
        return url;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const formattedWebsite = formatUrl(website);  // Format the website URL before submitting
        onSubmit(email, formattedWebsite);  // Pass the email and formatted website to the parent component's submit handler
    };

    return (
        <div className="magic_mock_body">
            <div className="mock_box">
                <h2> Create your <br/> <span> Own Chatbot</span>! </h2>
                <p> No coding needed. Just enter your website and watch the magic happen.</p> <br/><br/>

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                        required
                    /> 
                    <br/>
                    <input 
                        type="text"  // Change to text to allow naked domains
                        placeholder="Website URL" 
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}  // Bind input to state
                        required 
                    /> 
                    <br/>
                    <button type="submit" className="submit">
                        Build your AI Agent
                    </button>
                </form>
            </div>

            <div className="footer">
                <p className="foot_logo">
                    <i> {CONFIG.branding.poweredByText} </i>
                </p>
                <p> {CONFIG.branding.copyright} &nbsp; | &nbsp; {CONFIG.branding.legalLinks} </p>
            </div>
        </div>
    );
};

export default FormComponent;
