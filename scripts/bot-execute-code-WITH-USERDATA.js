// ========================================
// BOTPRESS EXECUTE CODE - Dynamic KB Search with userData
// ========================================
// UPDATED: Now checks workflow.userDataResult from "Get User Data" action FIRST
// This is the output variable you configured in Botpress Studio
//
// Resolution order:
// 1. workflow.userDataResult (from "Get User Data" action output)
// 2. user.data (v2 API)
// 3. user.tags (legacy/init userData)
// 4. event/conversation fallbacks
// 5. DEFAULT_DOMAIN

// ===== CONFIGURATION =====
const USE_HARDCODED_DOMAIN = false; // Set to TRUE for testing in Botpress Studio
const HARDCODED_DOMAIN = 'flashfurnacerepair.com'; // Only used if above is TRUE
const DEFAULT_DOMAIN = 'default.com'; // Fallback if no domain found
// =========================

console.log('');
console.log('========================================');
console.log('🔍 KB SEARCH EXECUTE CODE - START');
console.log('========================================');
console.log('');

// ===== DEBUG: LOG ALL AVAILABLE DATA =====
console.log('===== ALL AVAILABLE DATA =====');
console.log('workflow.userDataResult:', JSON.stringify(workflow.userDataResult, null, 2));
console.log('user:', JSON.stringify(user, null, 2));
console.log('event.payload:', JSON.stringify(event.payload, null, 2));
console.log('conversation:', JSON.stringify(conversation, null, 2));
console.log('');

// ===== EXTRACT userData FROM "Get User Data" ACTION =====
// The "Get User Data" action stores its output in workflow.userDataResult
// The userData from init() is typically in: userDataResult.userData or userDataResult directly
const actionResult = workflow.userDataResult || {};
const userDataFromAction = actionResult.userData || actionResult.data || actionResult || {};

console.log('===== USER DATA FROM ACTION =====');
console.log('actionResult:', JSON.stringify(actionResult, null, 2));
console.log('userDataFromAction:', JSON.stringify(userDataFromAction, null, 2));
console.log('');

// ===== DETERMINE SEARCH DOMAIN =====
let searchDomain;
let kbFileId;

if (USE_HARDCODED_DOMAIN) {
    // Testing mode: use hardcoded domain
    searchDomain = HARDCODED_DOMAIN;
    kbFileId = null;
    console.log('🔧 USING HARDCODED DOMAIN:', searchDomain);
} else {
    // Production mode: Check multiple sources in priority order
    // Priority 1: "Get User Data" action result (workflow variable)
    // Priority 2: user.data (v2 API)
    // Priority 3: user.tags (legacy init userData)
    // Priority 4: Various fallbacks

    searchDomain = userDataFromAction.domain       // ← From "Get User Data" action
        || user.data?.domain                        // ← v2 API: updateUser({ data: {...} })
        || user.tags?.domain                        // ← Legacy: init({ userData: {...} })
        || user.domain                              // ← Direct property (if set)
        || user.userData?.domain                    // ← Nested userData (alternative)
        || event.payload?.domain                    // ← Event payload
        || event.payload?.metadata?.domain          // ← Event metadata
        || conversation.domain                      // ← Stored in conversation
        || conversation.tags?.domain                // ← Conversation tags
        || DEFAULT_DOMAIN;                          // ← Last resort

    // Get fileId with same priority order
    kbFileId = userDataFromAction.fileId           // ← From "Get User Data" action
        || user.data?.fileId                        // ← v2 API
        || user.tags?.fileId                        // ← Legacy
        || user.kbFileId                            // ← Direct property
        || user.userData?.fileId                    // ← Nested
        || event.payload?.fileId                    // ← Event payload
        || event.payload?.metadata?.fileId          // ← Event metadata
        || null;

    console.log('===== DOMAIN RESOLUTION =====');
    console.log('Source checks:');
    console.log('  1. userDataFromAction.domain:', userDataFromAction.domain);
    console.log('  2. user.data?.domain:', user.data?.domain);
    console.log('  3. user.tags?.domain:', user.tags?.domain);
    console.log('  4. user.domain:', user.domain);
    console.log('  5. event.payload?.domain:', event.payload?.domain);
    console.log('  6. conversation.domain:', conversation.domain);
    console.log('');
    console.log('✅ RESOLVED searchDomain:', searchDomain);
    console.log('✅ RESOLVED kbFileId:', kbFileId);
    console.log('');
}

// ===== SEARCH KB (OPTIMIZED PATH) =====
let kbResults;

if (kbFileId) {
    // FAST PATH: Use specific file ID directly (no search needed!)
    console.log('===== USING SPECIFIC KB FILE (OPTIMIZED) =====');
    console.log('File ID:', kbFileId);
    console.log('Query:', event.preview);
    console.log('');

    try {
        // Search only this specific file
        kbResults = await client.searchFiles({
            fileId: kbFileId,  // Direct file lookup - faster!
            query: event.preview,
            limit: 10
        });
    } catch (error) {
        console.error('❌ Error searching specific file:', error);
        console.log('Falling back to domain tag search');
        kbResults = null;  // Will trigger fallback below
    }
}

// FALLBACK PATH: Search by domain tag if no fileId or fileId search failed
if (!kbFileId || !kbResults) {
    console.log('===== SEARCHING KB BY DOMAIN TAG =====');
    console.log('Tags:', JSON.stringify({ domain: searchDomain }, null, 2));
    console.log('Query:', event.preview);
    console.log('');

    try {
        kbResults = await client.searchFiles({
            tags: {
                domain: searchDomain
            },
            query: event.preview,
            limit: 10
        });
    } catch (error) {
        console.error('❌ Error searching domain-specific KB by tag:', error);
        kbResults = { passages: [] };
    }
}

// Log search results (regardless of which path was used)
console.log('📊 Search results:');
console.log('  Total passages found:', kbResults?.passages?.length || 0);

if (kbResults?.passages && kbResults.passages.length > 0) {
    console.log('  Passages details:');
    kbResults.passages.forEach((passage, index) => {
        console.log(`    [${index}] fileId: ${passage.fileId}, score: ${passage.score}, length: ${passage.content?.length || 0} chars`);
    });
}
console.log('');

// ===== PROCESS RESULTS =====
let kbContext = '';
let foundDomainKB = false;

if (kbResults.passages && kbResults.passages.length > 0) {
    console.log('===== PROCESSING RESULTS =====');

    // Get unique file IDs
    const uniqueFileIds = [...new Set(kbResults.passages.map(p => p.fileId))];
    console.log('Files found:', uniqueFileIds.length);
    console.log('File IDs:', uniqueFileIds);
    console.log('');

    if (kbFileId) {
        // If specific fileId was passed, filter to only that file
        console.log('🎯 Filtering to specific file:', kbFileId);
        const filteredPassages = kbResults.passages.filter(p => p.fileId === kbFileId);

        if (filteredPassages.length > 0) {
            kbContext = filteredPassages.map(p => p.content).join('\n\n');
            foundDomainKB = true;
            console.log('✅ Found', filteredPassages.length, 'passages in file:', kbFileId);
        } else {
            console.log('⚠️ No passages found in specified file:', kbFileId);
            console.log('Falling back to all passages from domain');
            kbContext = kbResults.passages.map(p => p.content).join('\n\n');
            foundDomainKB = true;
        }
    } else {
        // Use first file only to avoid mixing different domains
        const firstFileId = uniqueFileIds[0];
        const firstFilePassages = kbResults.passages.filter(p => p.fileId === firstFileId);
        kbContext = firstFilePassages.map(p => p.content).join('\n\n');
        foundDomainKB = true;

        console.log('🎯 Using FIRST file only:', firstFileId);
        console.log('   Passages from this file:', firstFilePassages.length);

        if (uniqueFileIds.length > 1) {
            console.log('⚠️ Multiple files found for this domain, using first one only');
            console.log('   Other files ignored:', uniqueFileIds.slice(1));
        }
    }

    console.log('✅ SUCCESS: Using domain-specific KB');
    console.log('  Domain:', searchDomain);
    console.log('  File:', kbFileId || uniqueFileIds[0]);
    console.log('  Context length:', kbContext.length, 'chars');
    console.log('');
} else {
    console.log('⚠️ NO PASSAGES found for domain:', searchDomain);
    console.log('');
}

// ===== FALLBACK TO DEFAULT KB =====
if (!foundDomainKB) {
    console.log('===== SEARCHING DEFAULT KB =====');
    console.log('Tags:', JSON.stringify({ source: 'knowledge-base' }, null, 2));
    console.log('');

    try {
        const defaultKbResults = await client.searchFiles({
            tags: {
                source: 'knowledge-base'
            },
            query: event.preview,
            limit: 5
        });

        if (defaultKbResults.passages && defaultKbResults.passages.length > 0) {
            kbContext = defaultKbResults.passages.map(p => p.content).join('\n\n');
            console.log('✅ SUCCESS: Using default KB');
            console.log('  Passages found:', defaultKbResults.passages.length);
            console.log('  Context length:', kbContext.length, 'chars');
            console.log('');
        } else {
            console.log('⚠️ NO PASSAGES found in default KB either');
            console.log('');
        }
    } catch (error) {
        console.error('❌ Error searching default KB:', error);
    }
}

// ===== SET WORKFLOW VARIABLES =====
workflow.kbContext = kbContext;
workflow.searchDomain = searchDomain;
workflow.foundDomainKB = foundDomainKB;

// Store domain in conversation for future messages
if (searchDomain && searchDomain !== DEFAULT_DOMAIN) {
    conversation.domain = searchDomain;
    console.log('💾 Stored domain in conversation:', searchDomain);
}

console.log('');
console.log('========================================');
console.log('✅ KB SEARCH COMPLETE');
console.log('========================================');
console.log('Summary:');
console.log('  Found KB:', !!kbContext);
console.log('  Search method:', foundDomainKB ? 'domain-specific' : 'default');
console.log('  Domain used:', searchDomain);
console.log('  File ID used:', kbFileId || '(searched by tag)');
console.log('  Context length:', kbContext.length, 'chars');
console.log('========================================');
console.log('');
