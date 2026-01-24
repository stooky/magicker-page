// lib/configLoader.js
// Loads configuration from config.yaml with fallback defaults
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

let cachedConfig = null;

/**
 * Load configuration from config.yaml
 * Uses caching to avoid reading file on every request
 *
 * @returns {Object} Configuration object
 */
export function loadConfig() {
    if (cachedConfig) {
        return cachedConfig;
    }

    const configPath = path.join(process.cwd(), 'config.yaml');

    try {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        cachedConfig = yaml.load(fileContents);
        console.log('[configLoader] Loaded config.yaml');
        return cachedConfig;
    } catch (err) {
        console.error('[configLoader] Failed to load config.yaml:', err.message);
        // Return defaults if file not found
        return getDefaultConfig();
    }
}

/**
 * Get theme colors from config
 * @returns {Object} Theme colors object
 */
export function getTheme() {
    const config = loadConfig();
    return config?.theme || getDefaultConfig().theme;
}

/**
 * Get branding settings from config
 * @returns {Object} Branding settings
 */
export function getBranding() {
    const config = loadConfig();
    return config?.branding || getDefaultConfig().branding;
}

/**
 * Get email template settings from config
 * @returns {Object} Email settings
 */
export function getEmailConfig() {
    const config = loadConfig();
    return config?.email || getDefaultConfig().email;
}

/**
 * Clear cached config (useful for development/testing)
 */
export function clearConfigCache() {
    cachedConfig = null;
}

/**
 * Default configuration (fallback)
 */
function getDefaultConfig() {
    return {
        branding: {
            companyName: "Member Solutions",
            poweredByText: "Powered by Member Solutions",
            copyright: "Copyright © 2025 Member Solutions",
            legalLinks: "Privacy Policy  |  Terms of Service",
            loadingAnimationPath: "/images/megaman.gif",
            websiteUrl: "https://membersolutions.com",
            emailFrom: "Magic Page <noreply@membies.com>"
        },
        theme: {
            primaryColor: "#1863DC",
            secondaryColor: "#00234C",
            accentColor: "#F48D03",
            gradientStart: "#00234C",
            gradientMid: "#1863DC",
            gradientEnd: "#F48D03",
            textPrimary: "#212121",
            textSecondary: "#858585",
            textLight: "#FFFFFF",
            backgroundPrimary: "#FFFFFF",
            backgroundSecondary: "#F4F4F4",
            backgroundDark: "#00234C",
            buttonPrimary: "#1863DC",
            buttonPrimaryHover: "#1454B8",
            buttonSecondary: "#F48D03",
            buttonSecondaryHover: "#D97A03",
            borderLight: "#EBEBEB",
            borderMedium: "#CCCCCC"
        },
        email: {
            headerColor: "#1863DC",
            buttonColor: "#F48D03",
            sectionGradientStart: "#00234C",
            sectionGradientEnd: "#1863DC",
            footerLinkColor: "#1863DC"
        },
        scanningStage: {
            quoteDelayMs: 5000,
            quotes: [
                "Building Your AI",
                "Skimming Your Website",
                "Loading All The Goodies!",
                "Very Interesting!",
                "Almost There...",
                "Crunching The Data"
            ],
            steps: [
                { name: "Loading website", duration: 2000 },
                { name: "Scanning website", duration: 3000 },
                { name: "Generating AI Agent", duration: 4000 },
                { name: "Build preview", duration: 5000 }
            ]
        },
        snippets: {
            displayTimeMs: 3000
        },
        timeouts: {
            scrapeStaleMs: 600000
        }
    };
}
