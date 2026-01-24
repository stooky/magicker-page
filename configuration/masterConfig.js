// =============================================================================
// MASTER CONFIGURATION (Client-Side)
// =============================================================================
// This file contains client-side configuration that can be used in React components.
// For server-side, use lib/configLoader.js which reads from config.yaml
//
// IMPORTANT: Keep these values in sync with config.yaml
// =============================================================================

export const CONFIG = {

    // -------------------------------------------------------------------------
    // Branding
    // -------------------------------------------------------------------------
    branding: {
        companyName: "Member Solutions",
        poweredByText: "Powered by Member Solutions",
        copyright: "Copyright © 2025 Member Solutions",
        legalLinks: "Privacy Policy  |  Terms of Service",
        loadingAnimationPath: "/images/megaman.gif",
        websiteUrl: "https://membersolutions.com",
    },

    // -------------------------------------------------------------------------
    // Theme Colors
    // -------------------------------------------------------------------------
    // Based on Member Solutions brand (https://membersolutions.com)
    // Primary Blue: #1863DC - Main interactive elements
    // Orange Accent: #F48D03 - CTAs and highlights
    // Dark Navy: #00234C - Text and headings
    theme: {
        // Primary brand colors
        primaryColor: "#1863DC",       // Member Solutions blue
        secondaryColor: "#00234C",     // Dark navy
        accentColor: "#F48D03",        // Orange accent

        // Gradient backgrounds
        gradientStart: "#00234C",      // Dark navy
        gradientMid: "#1863DC",        // Blue
        gradientEnd: "#F48D03",        // Orange

        // Text colors
        textPrimary: "#212121",
        textSecondary: "#858585",
        textLight: "#FFFFFF",

        // Background colors
        backgroundPrimary: "#FFFFFF",
        backgroundSecondary: "#F4F4F4",
        backgroundDark: "#00234C",

        // Button colors
        buttonPrimary: "#1863DC",
        buttonPrimaryHover: "#1454B8",
        buttonSecondary: "#F48D03",
        buttonSecondaryHover: "#D97A03",

        // Border colors
        borderLight: "#EBEBEB",
        borderMedium: "#CCCCCC",
    },

    // -------------------------------------------------------------------------
    // Scanning Stage
    // -------------------------------------------------------------------------
    // Configuration for the "Building Your AI" screen shown while scraping.
    scanningStage: {
        // Delay between header quotes in milliseconds
        quoteDelayMs: 5000,

        // Quotes that cycle in the main header (h2) during scanning
        quotes: [
            "Building Your AI",
            "Skimming Your Website",
            "Loading All The Goodies!",
            "Very Interesting!",
            "Almost There...",
            "Crunching The Data",
        ],

        // Status steps shown in the progress list
        steps: [
            { name: "Loading website", duration: 2000 },
            { name: "Scanning website", duration: 3000 },
            { name: "Generating AI Agent", duration: 4000 },
            { name: "Build preview", duration: 5000 },
        ],
    },

    // -------------------------------------------------------------------------
    // Snippets
    // -------------------------------------------------------------------------
    // Configuration for displaying scraped content snippets.
    snippets: {
        // How long each snippet is displayed in milliseconds
        displayTimeMs: 3000,
    },

    // -------------------------------------------------------------------------
    // Timeouts & Limits
    // -------------------------------------------------------------------------
    timeouts: {
        // How long to wait for a scrape before considering it stale (ms)
        scrapeStaleMs: 10 * 60 * 1000,  // 10 minutes
    },
};
