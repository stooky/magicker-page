/**
 * Botpress logging utility
 * Logs to both console and logs/botpress.log file
 */
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'logs', 'botpress.log');

// Ensure logs directory exists
if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

function formatLogMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;

    if (data) {
        logMessage += `\n${JSON.stringify(data, null, 2)}`;
    }

    return logMessage + '\n';
}

export function logInfo(message, data = null) {
    const logMessage = formatLogMessage('INFO', message, data);
    console.log(`[BOTPRESS] ${message}`, data || '');

    fs.appendFile(LOG_FILE, logMessage, (err) => {
        if (err) console.error('Failed to write to log file:', err.message);
    });
}

export function logError(message, error = null) {
    const errorData = error ? {
        message: error.message,
        stack: error.stack,
        ...(error.response?.data || {})
    } : null;

    const logMessage = formatLogMessage('ERROR', message, errorData);
    console.error(`[BOTPRESS] ${message}`, error || '');

    fs.appendFile(LOG_FILE, logMessage, (err) => {
        if (err) console.error('Failed to write to log file:', err.message);
    });
}

export function logDebug(message, data = null) {
    const logMessage = formatLogMessage('DEBUG', message, data);
    console.log(`[BOTPRESS DEBUG] ${message}`, data || '');

    fs.appendFile(LOG_FILE, logMessage, (err) => {
        if (err) console.error('Failed to write to log file:', err.message);
    });
}
