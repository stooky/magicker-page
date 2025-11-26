// ========================================
// BOTPRESS EXECUTE CODE - Dynamic KB Search with userData
// ========================================
// UPDATED: Now prioritizes USERDATA mode (updateUser API)
//
// Resolution order:
// 1. user.data (USERDATA mode - set via updateUser()) ← PRIMARY
// 2. workflow.userDataResult (from "Get User Data" action)
// 3. [CONTEXT:domain=xxx,fileId=xxx] in message text (MESSAGE mode fallback)
// 4. conversation cache (from previous messages)
// 5. DEFAULT_DOMAIN

// ===== CONFIGURATION =====
const USE_HARDCODED_DOMAIN = false; // Set to TRUE for testing in Botpress Studio
const HARDCODED_DOMAIN = 'flashfurnacerepair.com'; // Only used if above is TRUE
const DEFAULT_DOMAIN = 'default.com'; // Fallback if no domain found
// =========================

console.log('');
console.log('========================================');
console.log('KB SEARCH EXECUTE CODE - START');
console.log('========================================');
console.log('');

// ===== CHECK FOR CONTEXT EVENT (EVENT mode) =====
// If this is a setContext event, store context and exit early
if (event.type === 'setContext') {
    console.log('📨 Received setContext EVENT');
    console.log('Event payload:', JSON.stringify(event.payload));

    // Store context in conversation for subsequent messages
    if (event.payload?.domain) {
        conversation.domain = event.payload.domain;
        console.log('Stored domain in conversation:', event.payload.domain);
    }
    if (event.payload?.fileId) {
        conversation.fileId = event.payload.fileId;
        console.log('Stored fileId in conversation:', event.payload.fileId);
    }

    // Set workflow variables so this event doesn't trigger a response
    workflow.kbContext = '';
    workflow.searchDomain = event.payload?.domain || '';
    workflow.foundDomainKB = false;
    workflow.isContextEvent = true;  // Flag to skip response

    console.log('Context stored. Exiting early (no response for context events).');
    return;
}

// ===== DEBUG: LOG ALL AVAILABLE DATA SOURCES =====
console.log('===== DATA SOURCES AVAILABLE =====');
console.log('user.data (USERDATA mode):', JSON.stringify(user.data, null, 2));
console.log('workflow.userDataResult (Get User Data action):', JSON.stringify(workflow.userDataResult, null, 2));
console.log('user.tags (legacy):', JSON.stringify(user.tags, null, 2));
console.log('conversation:', JSON.stringify({ domain: conversation.domain, fileId: conversation.fileId }, null, 2));
console.log('');

// ===== PARSE CONTEXT FROM MESSAGE TEXT (MESSAGE mode fallback) =====
// Format: [CONTEXT:domain=xxx,fileId=xxx]
let messageContext = { domain: null, fileId: null };
const messageText = event.preview || event.payload?.text || '';
const contextMatch = messageText.match(/\[CONTEXT:([^\]]+)\]/);
if (contextMatch) {
    const contextStr = contextMatch[1];
    console.log('Found [CONTEXT:...] tag in message:', contextStr);

    // Parse key=value pairs
    const pairs = contextStr.split(',');
    pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
            messageContext[key.trim()] = value.trim();
        }
    });
    console.log('Parsed MESSAGE mode context:', JSON.stringify(messageContext));
}

// ===== EXTRACT userData FROM "Get User Data" ACTION =====
const actionResult = workflow.userDataResult || {};
const userDataFromAction = actionResult.userData || actionResult.data || actionResult || {};

// ===== DETERMINE SEARCH DOMAIN =====
let searchDomain;
let kbFileId;
let detectedMode = 'unknown';

if (USE_HARDCODED_DOMAIN) {
    // Testing mode: use hardcoded domain
    searchDomain = HARDCODED_DOMAIN;
    kbFileId = null;
    detectedMode = 'HARDCODED';
    console.log('🔧 TESTING MODE - Using hardcoded domain:', searchDomain);
} else {
    // Production mode: Check sources in priority order

    // Priority 1: USERDATA mode (updateUser API) - RECOMMENDED
    if (user.data?.domain) {
        searchDomain = user.data.domain;
        kbFileId = user.data.fileId || null;
        detectedMode = 'USERDATA';
        console.log('✅ USERDATA MODE detected - using user.data');
    }
    // Priority 2: Get User Data action result
    else if (userDataFromAction.domain) {
        searchDomain = userDataFromAction.domain;
        kbFileId = userDataFromAction.fileId || null;
        detectedMode = 'GET_USER_DATA_ACTION';
        console.log('✅ GET USER DATA ACTION detected - using workflow.userDataResult');
    }
    // Priority 3: MESSAGE mode ([CONTEXT:...] in message)
    else if (messageContext.domain) {
        searchDomain = messageContext.domain;
        kbFileId = messageContext.fileId || null;
        detectedMode = 'MESSAGE';
        console.log('✅ MESSAGE MODE detected - using [CONTEXT:...] from message');
    }
    // Priority 4: Conversation cache (from previous messages)
    else if (conversation.domain) {
        searchDomain = conversation.domain;
        kbFileId = conversation.fileId || null;
        detectedMode = 'CONVERSATION_CACHE';
        console.log('✅ CONVERSATION CACHE detected - using stored context');
    }
    // Priority 5: Legacy user.tags
    else if (user.tags?.domain) {
        searchDomain = user.tags.domain;
        kbFileId = user.tags.fileId || null;
        detectedMode = 'LEGACY_TAGS';
        console.log('✅ LEGACY MODE detected - using user.tags');
    }
    // Fallback: Default domain
    else {
        searchDomain = DEFAULT_DOMAIN;
        kbFileId = null;
        detectedMode = 'DEFAULT';
        console.log('⚠️ NO CONTEXT FOUND - falling back to default domain');
    }
}

console.log('');
console.log('===== RESOLUTION RESULT =====');
console.log('Mode detected:', detectedMode);
console.log('Search domain:', searchDomain);
console.log('KB File ID:', kbFileId || '(will search by domain tag)');
console.log('');

// ===== SEARCH KB =====
let kbResults;

if (kbFileId) {
    // FAST PATH: Use specific file ID directly
    console.log('===== OPTIMIZED SEARCH: Specific File =====');
    console.log('File ID:', kbFileId);
    console.log('Query:', event.preview);

    try {
        kbResults = await client.searchFiles({
            fileId: kbFileId,
            query: event.preview,
            limit: 10
        });
        console.log('✅ File search completed');
    } catch (error) {
        console.error('❌ Error searching specific file:', error);
        console.log('Falling back to domain tag search...');
        kbResults = null;
    }
}

// FALLBACK: Search by domain tag
if (!kbFileId || !kbResults) {
    console.log('===== SEARCHING BY DOMAIN TAG =====');
    console.log('Domain tag:', searchDomain);
    console.log('Query:', event.preview);

    try {
        kbResults = await client.searchFiles({
            tags: { domain: searchDomain },
            query: event.preview,
            limit: 10
        });
        console.log('✅ Tag search completed');
    } catch (error) {
        console.error('❌ Error searching by domain tag:', error);
        kbResults = { passages: [] };
    }
}

// ===== PROCESS RESULTS =====
console.log('');
console.log('===== SEARCH RESULTS =====');
console.log('Passages found:', kbResults?.passages?.length || 0);

let kbContext = '';
let foundDomainKB = false;

if (kbResults?.passages && kbResults.passages.length > 0) {
    const uniqueFileIds = [...new Set(kbResults.passages.map(p => p.fileId))];
    console.log('Unique files:', uniqueFileIds.length);

    if (kbFileId) {
        // Filter to specific file
        const filteredPassages = kbResults.passages.filter(p => p.fileId === kbFileId);
        if (filteredPassages.length > 0) {
            kbContext = filteredPassages.map(p => p.content).join('\n\n');
            foundDomainKB = true;
            console.log('✅ Using', filteredPassages.length, 'passages from file:', kbFileId);
        } else {
            // Fallback to all passages
            kbContext = kbResults.passages.map(p => p.content).join('\n\n');
            foundDomainKB = true;
            console.log('⚠️ Specific file empty, using all passages');
        }
    } else {
        // Use first file only
        const firstFileId = uniqueFileIds[0];
        const firstFilePassages = kbResults.passages.filter(p => p.fileId === firstFileId);
        kbContext = firstFilePassages.map(p => p.content).join('\n\n');
        foundDomainKB = true;
        console.log('✅ Using', firstFilePassages.length, 'passages from:', firstFileId);
    }
}

// ===== FALLBACK TO DEFAULT KB =====
if (!foundDomainKB) {
    console.log('');
    console.log('===== FALLBACK: Default KB =====');

    try {
        const defaultKbResults = await client.searchFiles({
            tags: { source: 'knowledge-base' },
            query: event.preview,
            limit: 5
        });

        if (defaultKbResults?.passages?.length > 0) {
            kbContext = defaultKbResults.passages.map(p => p.content).join('\n\n');
            console.log('✅ Using default KB:', defaultKbResults.passages.length, 'passages');
        } else {
            console.log('⚠️ No passages in default KB either');
        }
    } catch (error) {
        console.error('❌ Error searching default KB:', error);
    }
}

// ===== SET WORKFLOW VARIABLES =====
workflow.kbContext = kbContext;
workflow.searchDomain = searchDomain;
workflow.foundDomainKB = foundDomainKB;

// Cache context in conversation for subsequent messages
if (searchDomain && searchDomain !== DEFAULT_DOMAIN) {
    conversation.domain = searchDomain;
}
if (kbFileId) {
    conversation.fileId = kbFileId;
}

console.log('');
console.log('========================================');
console.log('✅ KB SEARCH COMPLETE');
console.log('========================================');
console.log('Mode:', detectedMode);
console.log('Domain:', searchDomain);
console.log('File ID:', kbFileId || '(searched by tag)');
console.log('Found KB:', foundDomainKB);
console.log('Context length:', kbContext.length, 'chars');
console.log('========================================');
