// ===== KB SEARCH WITH DEBUG TOGGLE =====
// Toggle between hardcoded domain (for testing) and dynamic domain (production)

// ========== CONFIGURATION ==========
const USE_HARDCODED_DOMAIN = true; // Set to FALSE for production
const HARDCODED_DOMAIN = 'flashfurnacerepair.com'; // Domain to use when testing
// ===================================

console.log('');
console.log('========================================');
console.log('🔍 KB SEARCH EXECUTE CODE - START');
console.log('========================================');
console.log('Timestamp:', new Date().toISOString());
console.log('');

// Log configuration
console.log('===== CONFIGURATION =====');
console.log('USE_HARDCODED_DOMAIN:', USE_HARDCODED_DOMAIN);
console.log('HARDCODED_DOMAIN:', HARDCODED_DOMAIN);
console.log('');

// Log full event object
console.log('===== FULL EVENT OBJECT =====');
console.log('event.type:', event.type);
console.log('event.preview:', event.preview);
console.log('event.userId:', event.userId);
console.log('event.conversationId:', event.conversationId);
console.log('event.payload:', JSON.stringify(event.payload, null, 2));
console.log('');

// Log conversation state
console.log('===== CONVERSATION STATE =====');
console.log('conversation.domain (stored):', conversation.domain || 'NOT SET');
console.log('conversation.website (stored):', conversation.website || 'NOT SET');
console.log('conversation.sessionID (stored):', conversation.sessionID || 'NOT SET');
console.log('Full conversation object keys:', Object.keys(conversation));
console.log('');

// Determine search domain
let searchDomain = '';

if (USE_HARDCODED_DOMAIN) {
  searchDomain = HARDCODED_DOMAIN;
  console.log('🔧 USING HARDCODED DOMAIN:', searchDomain);
} else {
  // Check if domain is already stored in conversation
  searchDomain = conversation.domain || '';

  // If no domain stored yet, try to extract from the message
  if (!searchDomain && event.preview) {
    const domainMatch = event.preview.match(/^\[DOMAIN:(.+?)\]/);
    if (domainMatch) {
      searchDomain = domainMatch[1];
      conversation.domain = searchDomain; // Store for future messages
      console.log('✅ EXTRACTED and STORED domain from message:', searchDomain);

      // Remove the domain prefix from the actual question
      const actualQuestion = event.preview.replace(/^\[DOMAIN:.+?\]\s*/, '');
      console.log('Stripped domain prefix. Actual question:', actualQuestion);
      workflow.userQuestion = actualQuestion || event.preview;
    } else {
      workflow.userQuestion = event.preview;
      console.log('⚠️ NO DOMAIN found in message');
    }
  } else {
    console.log('✅ USING STORED domain from conversation:', searchDomain);
    workflow.userQuestion = event.preview;
  }
}

console.log('');
console.log('===== SEARCH PARAMETERS =====');
console.log('Final search domain:', searchDomain || 'NONE (will use default KB)');
console.log('User question:', workflow.userQuestion || event.preview);
console.log('');

// Initialize result variables
let context = "";
let found = false;
let usedFile = "";
let searchMethod = "";

try {
  if (searchDomain) {
    console.log('===== SEARCHING DOMAIN-SPECIFIC KB =====');
    console.log('Tags:', JSON.stringify({ domain: searchDomain }));
    console.log('Query:', workflow.userQuestion || event.preview);
    console.log('');

    const res = await client.searchFiles({
      query: workflow.userQuestion || event.preview,
      contextDepth: 1,
      tags: { domain: searchDomain },
      limit: 10
    });

    const passages = res.passages || [];
    console.log('📊 Search results:');
    console.log('  Total passages found:', passages.length);

    if (passages.length > 0) {
      console.log('  Passages details:');
      passages.forEach((p, idx) => {
        console.log(`    [${idx}] fileId: ${p.fileId}, score: ${p.score || 'N/A'}, length: ${p.content?.length || 0} chars`);
      });
      console.log('');

      // Get the fileId from the first passage (most relevant)
      const firstFileId = passages[0].fileId;
      console.log('🎯 Using FIRST file only:', firstFileId);

      // Filter to only use passages from the first file
      const firstFilePassages = passages.filter(p => p.fileId === firstFileId);
      console.log('  Passages from first file:', firstFilePassages.length);

      context = firstFilePassages.map(p => p.content).join("\n\n");
      found = true;
      usedFile = firstFileId;
      searchMethod = 'domain-specific';

      console.log('✅ SUCCESS: Using domain-specific KB');
      console.log('  Domain:', searchDomain);
      console.log('  File:', firstFileId);
      console.log('  Context length:', context.length, 'chars');
      console.log('  Context preview (first 200 chars):', context.substring(0, 200) + '...');
    } else {
      console.log('⚠️ NO PASSAGES found for domain:', searchDomain);
      console.log('  Will fall back to default KB');
    }
    console.log('');
  } else {
    console.log('⚠️ NO DOMAIN available - skipping domain KB search');
    console.log('  Will use default KB');
    console.log('');
  }

  // Fallback to default KB if no domain-specific results
  if (!found) {
    console.log('===== SEARCHING DEFAULT KB =====');
    console.log('Tags:', JSON.stringify({ source: "default" }));
    console.log('Query:', workflow.userQuestion || event.preview);
    console.log('');

    const fb = await client.searchFiles({
      query: workflow.userQuestion || event.preview,
      contextDepth: 1,
      tags: { source: "default" },
      limit: 10
    });

    const fbPassages = fb.passages || [];
    console.log('📊 Default KB search results:');
    console.log('  Total passages found:', fbPassages.length);

    if (fbPassages.length > 0) {
      console.log('  Passages details:');
      fbPassages.forEach((p, idx) => {
        console.log(`    [${idx}] fileId: ${p.fileId}, score: ${p.score || 'N/A'}, length: ${p.content?.length || 0} chars`);
      });
      console.log('');

      // Only use first file from default KB
      const firstFileId = fbPassages[0].fileId;
      console.log('🎯 Using FIRST default KB file:', firstFileId);

      const firstFilePassages = fbPassages.filter(p => p.fileId === firstFileId);
      console.log('  Passages from first file:', firstFilePassages.length);

      context = firstFilePassages.map(p => p.content).join("\n\n");
      found = true;
      usedFile = firstFileId;
      searchMethod = 'default';

      console.log('✅ SUCCESS: Using default KB');
      console.log('  File:', firstFileId);
      console.log('  Context length:', context.length, 'chars');
      console.log('  Context preview (first 200 chars):', context.substring(0, 200) + '...');
    } else {
      console.log('❌ NO DEFAULT KB passages found');
      console.log('  Bot will respond without KB context');
    }
    console.log('');
  }
} catch (err) {
  console.error('');
  console.error('========================================');
  console.error('❌ KB SEARCH ERROR');
  console.error('========================================');
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  console.error('========================================');
  console.error('');
}

// Set workflow variables for use in AI Task
workflow.kbContext = context;
workflow.kbFound = found;
workflow.kbFile = usedFile;
workflow.searchDomain = searchDomain;
workflow.searchMethod = searchMethod;

console.log('');
console.log('========================================');
console.log('✅ KB SEARCH COMPLETE');
console.log('========================================');
console.log('Summary:');
console.log('  Found KB:', found);
console.log('  Search method:', searchMethod || 'none');
console.log('  Domain used:', searchDomain || 'none');
console.log('  File used:', usedFile || 'none');
console.log('  Context length:', context.length, 'chars');
console.log('  User question:', workflow.userQuestion || event.preview);
console.log('========================================');
console.log('');
