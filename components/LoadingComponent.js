import React from 'react';
import '../src/css/main.css';
import '../src/css/mockbox.css';
import '../src/css/thumbnail.css';
import '../src/css/ai_agent.css';
import '../src/css/weird_stuff.css';
import '../src/css/style.css';

export default function LoadingComponent() {
    return (
        <div className="magic_mock_body">
            <div className="mock_box">
                <h2 className="thumb_text">Hang on while we load <br/> your website...</h2>
                <br/><br/>

                <div className="thumbnail_sec">
                    <div className="sparkle_animation"> 
                        <div className="container">
                            <div className="ai-orb">
                                <div className="ai-orb__circle"></div>
                                <div className="ai-orb__circle circle2"></div>
                                <div className="ai-orb__circle circle3"></div>
                                <div className="ai-orb__bg-wrap">
                                    <div className="ai-orb__bg"></div>
                                </div>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path className="big-star"  d="M12.5963 2.25684C12.8382 2.25684 13.0447 2.43137 13.0845 2.66951C13.5687 5.56847 14.5285 7.6919 15.9296 9.20654C17.3278 10.7181 19.2046 11.6655 21.6023 12.144C21.8336 12.1901 22.0001 12.3928 22.0001 12.6282C22.0001 12.8636 21.8336 13.0664 21.6023 13.1126C16.905 14.05 14.0449 17.7965 13.0816 22.6027C13.0353 22.8335 12.8322 22.9997 12.5963 22.9997C12.3604 22.9997 12.1572 22.8335 12.1109 22.6027C11.1476 17.7965 8.2875 14.05 3.59024 13.1126C3.3589 13.0664 3.19238 12.8636 3.19238 12.6282C3.19238 12.3928 3.3589 12.1901 3.59024 12.144C5.98784 11.6655 7.86466 10.7181 9.26291 9.20654C10.664 7.6919 11.6239 5.56847 12.108 2.66951C12.1478 2.43137 12.3543 2.25684 12.5963 2.25684Z" fill="white"/>
                                    <path className="small-star" d="M5.7684 1.15721C5.75324 1.0665 5.67459 1 5.58242 1C5.49025 1 5.41159 1.0665 5.39643 1.15721C5.21198 2.26158 4.84634 3.07051 4.31259 3.64751C3.77991 4.22333 3.06494 4.58425 2.15158 4.76653C2.06344 4.78412 2 4.86134 2 4.95102C2 5.04071 2.06344 5.11793 2.15158 5.13552C3.941 5.49263 5.03056 6.91986 5.39753 8.7508C5.41516 8.83874 5.49254 8.90204 5.58242 8.90204C5.6723 8.90204 5.74967 8.83874 5.7673 8.7508C6.13428 6.91986 7.22383 5.49263 9.01327 5.13552C9.1014 5.11793 9.16483 5.04071 9.16483 4.95102C9.16483 4.86134 9.1014 4.78412 9.01327 4.76653C8.09989 4.58425 7.38492 4.22333 6.85226 3.64751C6.31849 3.07051 5.95286 2.26158 5.7684 1.15721Z" fill="white"/>
                                </svg>
                                <div className="particle-set set1">
                                    <div className="particle particle1"></div>
                                    <div className="particle particle2"></div>
                                    <div className="particle particle3"></div>
                                    <div className="particle particle4"></div>
                                </div>
                                <div className="particle-set set2">
                                    <div className="particle particle1"></div>
                                    <div className="particle particle2"></div>
                                    <div className="particle particle3"></div>
                                    <div className="particle particle4"></div>
                                </div>
                                <div className="particle-set set3">
                                    <div className="particle particle1"></div>
                                    <div className="particle particle2"></div>
                                    <div className="particle particle3"></div>
                                    <div className="particle particle4"></div>
                                </div>
                            </div>
                        </div>
                        <br /><br />
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
