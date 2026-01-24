import { useEffect } from 'react';
import { CONFIG } from '../configuration/masterConfig';

/**
 * ThemeProvider Component
 *
 * Injects theme colors from masterConfig.js into CSS variables on the document root.
 * This allows CSS to use var(--theme-primary) etc. and have them controlled by the config.
 *
 * Usage: Include <ThemeProvider /> once in your app (e.g., in _app.js or index.js)
 */
export default function ThemeProvider({ children }) {
    useEffect(() => {
        const root = document.documentElement;
        const { theme } = CONFIG;

        // Primary brand colors
        root.style.setProperty('--theme-primary', theme.primaryColor);
        root.style.setProperty('--theme-secondary', theme.secondaryColor);
        root.style.setProperty('--theme-accent', theme.accentColor);

        // Gradient colors
        root.style.setProperty('--theme-gradient-start', theme.gradientStart);
        root.style.setProperty('--theme-gradient-mid', theme.gradientMid || theme.primaryColor);
        root.style.setProperty('--theme-gradient-end', theme.gradientEnd);

        // Text colors
        root.style.setProperty('--theme-text-primary', theme.textPrimary);
        root.style.setProperty('--theme-text-secondary', theme.textSecondary);
        root.style.setProperty('--theme-text-light', theme.textLight);

        // Background colors
        root.style.setProperty('--theme-bg-primary', theme.backgroundPrimary);
        root.style.setProperty('--theme-bg-secondary', theme.backgroundSecondary);
        root.style.setProperty('--theme-bg-dark', theme.backgroundDark);

        // Button colors
        root.style.setProperty('--theme-button-primary', theme.buttonPrimary);
        root.style.setProperty('--theme-button-primary-hover', theme.buttonPrimaryHover);
        root.style.setProperty('--theme-button-secondary', theme.buttonSecondary);
        root.style.setProperty('--theme-button-secondary-hover', theme.buttonSecondaryHover);

        // Border colors
        root.style.setProperty('--theme-border-light', theme.borderLight);
        root.style.setProperty('--theme-border-medium', theme.borderMedium);

        // Legacy variables (for backwards compatibility)
        root.style.setProperty('--button-background', theme.buttonPrimary);
        root.style.setProperty('--button-hover-background', theme.buttonPrimaryHover);
        root.style.setProperty('--header-text-color', theme.secondaryColor);

        console.log('[ThemeProvider] Applied theme colors from config:', theme);
    }, []);

    return children || null;
}
