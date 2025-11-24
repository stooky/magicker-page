// ========================================
// BOTPRESS EXECUTE CODE - Dynamic KB Search with userData
// ========================================
// This version uses userData passed from webchat initialization
// to search for domain-specific knowledge base files

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
console.log('user:', JSON.stringify(user, null, 2));
console.log('event.payload:', JSON.stringify(event.payload, null, 2));
console.log('conversation:', JSON.stringify(conversation, null, 2));
console.log('');

// ===== DETERMINE SEARCH DOMAIN =====
let searchDomain;

if (USE_HARDCODED_DOMAIN) {
    // Testing mode: use hardcoded domain
    searchDomain = HARDCODED_DOMAIN;
    console.log('🔧 USING HARDCODED DOMAIN:', searchDomain);
} else {
    // Production mode: try to get domain from userData
    // NOTE: userData from init() is stored in user.tags, NOT user.userData
    searchDomain = user.tags?.domain        // ← userData from init() goes here!
        || user.domain                      // ← Direct property (if set)
        || user.userData?.domain            // ← Nested userData (alternative)
        || event.payload?.domain            // ← Event payload
        || event.tags?.domain               // ← Event tags
        || conversation.domain              // ← Stored in conversation
        || conversation.tags?.domain        // ← Conversation tags
        || DEFAULT_DOMAIN;                  // ← Last resort

    console.log('===== DYNAMIC DOMAIN RESOLUTION =====');
    console.log('user.tags?.domain:', user.tags?.domain);
    console.log('user.domain:', user.domain);
    console.log('user.userData?.domain:', user.userData?.domain);
    console.log('event.payload?.domain:', event.payload?.domain);
    console.log('event.tags?.domain:', event.tags?.domain);
    console.log('conversation.domain:', conversation.domain);
    console.log('conversation.tags?.domain:', conversation.tags?.domain);
    console.log('RESOLVED searchDomain:', searchDomain);
    console.log('');
}

// Get optional fileId (if passed from frontend)
const kbFileId = user.tags?.fileId || user.kbFileId || user.userData?.fileId || null;
console.log('KB File ID (if passed):', kbFileId);
console.log('');

// ===== SEARCH DOMAIN-SPECIFIC KB =====
console.log('===== SEARCHING DOMAIN-SPECIFIC KB =====');
console.log('Tags:', JSON.stringify({ domain: searchDomain }, null, 2));
console.log('Query:', event.preview);
console.log('');

let kbResults;
try {
    kbResults = await client.searchFiles({
        tags: {
            domain: searchDomain
        },
        query: event.preview,
        limit: 10
    });

    console.log('📊 Search results:');
    console.log('  Total passages found:', kbResults.passages?.length || 0);

    if (kbResults.passages && kbResults.passages.length > 0) {
        console.log('  Passages details:');
        kbResults.passages.forEach((passage, index) => {
            console.log(`    [${index}] fileId: ${passage.fileId}, score: ${passage.score}, length: ${passage.content?.length || 0} chars`);
        });
    }
    console.log('');
} catch (error) {
    console.error('❌ Error searching domain-specific KB:', error);
    kbResults = { passages: [] };
}

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
console.log('  Context length:', kbContext.length, 'chars');
console.log('========================================');
console.log('');
