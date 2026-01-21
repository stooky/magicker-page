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

        // Set CSS variables from config
        root.style.setProperty('--theme-primary', theme.primaryColor);
        root.style.setProperty('--theme-secondary', theme.secondaryColor);
        root.style.setProperty('--theme-accent', theme.accentColor);
        root.style.setProperty('--theme-gradient-start', theme.gradientStart);
        root.style.setProperty('--theme-gradient-end', theme.gradientEnd);

        console.log('[ThemeProvider] Applied theme colors from config:', theme);
    }, []);

    return children || null;
}
