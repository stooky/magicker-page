// =============================================================================
// MASTER CONFIGURATION
// =============================================================================
// This file contains all customizable settings for the Magic Page application.
// Edit values here to change branding, colors, timing, and behavior.
// =============================================================================

export const CONFIG = {

    // -------------------------------------------------------------------------
    // Branding
    // -------------------------------------------------------------------------
    branding: {
        poweredByText: "Powered by Member Solutions... Boogedy",
        copyright: "Copyright © 2025",
        legalLinks: "Privacy Policy  |  Legal beeyatches",
        loadingAnimationPath: "/images/onepunch.gif",
    },

    // -------------------------------------------------------------------------
    // Theme Colors
    // -------------------------------------------------------------------------
    // These colors are used throughout the application for consistent branding.
    // Format: hex color codes (e.g., "#E76F00")
    theme: {
        primaryColor: "#00e70cff",      // Member Solutions orange
        secondaryColor: "#f759d4ff",    // Dark blue
        accentColor: "#440ddbff",       // Gold
        gradientStart: "#f0ec08ff",     // Gradient background start (dark blue)
        gradientEnd: "#e70000ff",       // Gradient background end (orange)
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

    // -------------------------------------------------------------------------
    // Future Configuration Sections
    // -------------------------------------------------------------------------
    // Uncomment and configure as needed:
    //
    // database: {
    //     host: "localhost",
    //     port: 5433,
    //     name: "mp",
    // },
    //
    // botpress: {
    //     webhookSecret: "...",
    // },
};
