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

// Snippet display configuration
export const SNIPPET_DISPLAY_TIME = 3000; // milliseconds per snippet