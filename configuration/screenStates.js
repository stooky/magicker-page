import { CONFIG } from './masterConfig';

export const SCREEN_STATES = {
    FORM: 'FORM',
    LOADING: 'LOADING',
    SCANNING: 'SCANNING',
    CHAT_TEASE: 'CHAT_TEASE',
    CHAT: 'CHAT',
};

export const BOTPRESS_STATUS = {
    NOT_STARTED: 'NOT_STARTED',
    CREATING: 'CREATING',
    CREATED: 'CREATED',
    READY: 'READY',  // Ready to transition (snippets done OR bot actually ready)
    ERROR: 'ERROR',
};

// Re-export from master config for backward compatibility
export const SNIPPET_DISPLAY_TIME = CONFIG.snippets.displayTimeMs;

export const SCANNING_STAGE_CONFIG = {
    delayMs: CONFIG.scanningStage.quoteDelayMs,
    quotes: CONFIG.scanningStage.quotes,
    steps: CONFIG.scanningStage.steps,
};