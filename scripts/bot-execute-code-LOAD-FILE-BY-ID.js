// ===== LOAD KB FILE DIRECTLY BY FILE ID =====
// This approach loads a specific file instead of searching

// ========== CONFIGURATION ==========
const USE_HARDCODED_FILE = true; // Set to FALSE to use dynamic lookup
const HARDCODED_FILE_ID = 'file_01KAS6TESS1K3VCKS0YAQBS8MR'; // flashfurnacerepair.com latest

// Domain → FileId mapping (for dynamic mode)
const DOMAIN_TO_FILE_MAP = {
  'flashfurnacerepair.com': 'file_01KAS6TESS1K3VCKS0YAQBS8MR',
  'gibbonheating.com': 'file_xxxxx', // Add as needed
  // Add more domains as you create KB files
};
// ===================================

console.log('');
console.log('========================================');
console.log('🔍 KB FILE LOADER - START');
console.log('========================================');
console.log('Timestamp:', new Date().toISOString());
console.log('');

// Log configuration
console.log('===== CONFIGURATION =====');
console.log('USE_HARDCODED_FILE:', USE_HARDCODED_FILE);
console.log('HARDCODED_FILE_ID:', HARDCODED_FILE_ID);
console.log('');

// Log event
console.log('===== EVENT INFO =====');
console.log('User message:', event.preview);
console.log('');

// Determine which file to load
let fileIdToLoad = '';

if (USE_HARDCODED_FILE) {
  fileIdToLoad = HARDCODED_FILE_ID;
  console.log('🔧 USING HARDCODED FILE ID:', fileIdToLoad);
} else {
  // Get domain from conversation state
  let domain = conversation.domain || '';

  // Try to extract from message if not stored
  if (!domain && event.preview) {
    const domainMatch = event.preview.match(/^\[DOMAIN:(.+?)\]/);
    if (domainMatch) {
      domain = domainMatch[1];
      conversation.domain = domain;
      console.log('✅ EXTRACTED domain from message:', domain);

      // Strip domain prefix
      const actualQuestion = event.preview.replace(/^\[DOMAIN:.+?\]\s*/, '');
      workflow.userQuestion = actualQuestion || event.preview;
    } else {
      workflow.userQuestion = event.preview;
    }
  } else {
    workflow.userQuestion = event.preview;
  }

  // Look up file ID from domain
  if (domain && DOMAIN_TO_FILE_MAP[domain]) {
    fileIdToLoad = DOMAIN_TO_FILE_MAP[domain];
    console.log('✅ MAPPED domain to file:', domain, '→', fileIdToLoad);
  } else {
    console.log('⚠️ NO MAPPING found for domain:', domain || 'NONE');
  }
}

console.log('');
console.log('===== FILE TO LOAD =====');
console.log('File ID:', fileIdToLoad || 'NONE (will use default)');
console.log('');

// Initialize result variables
let context = "";
let found = false;
let usedFile = "";

try {
  if (fileIdToLoad) {
    console.log('===== LOADING SPECIFIC FILE =====');
    console.log('Fetching file:', fileIdToLoad);
    console.log('');

    // Get the file details
    const fileResponse = await client.getFile({ id: fileIdToLoad });

    console.log('📄 File details:');
    console.log('  ID:', fileResponse.file.id);
    console.log('  Key:', fileResponse.file.key);
    console.log('  Size:', fileResponse.file.size, 'bytes');
    console.log('  Status:', fileResponse.file.status);
    console.log('  Indexed:', fileResponse.file.index);
    console.log('  Tags:', JSON.stringify(fileResponse.file.tags));
    console.log('');

    // Now search for content from this specific file
    console.log('Searching content in file:', fileIdToLoad);

    const searchResponse = await client.searchFiles({
      query: workflow.userQuestion || event.preview,
      contextDepth: 1,
      fileIds: [fileIdToLoad], // Search only in this file
      limit: 10
    });

    const passages = searchResponse.passages || [];
    console.log('📊 Search results from file:');
    console.log('  Passages found:', passages.length);

    if (passages.length > 0) {
      console.log('  Passage details:');
      passages.forEach((p, idx) => {
        console.log(`    [${idx}] score: ${p.score || 'N/A'}, length: ${p.content?.length || 0} chars`);
      });
      console.log('');

      // Combine all passages from this file
      context = passages.map(p => p.content).join("\n\n");
      found = true;
      usedFile = fileIdToLoad;

      console.log('✅ SUCCESS: Loaded content from file');
      console.log('  File ID:', fileIdToLoad);
      console.log('  Passages used:', passages.length);
      console.log('  Total context length:', context.length, 'chars');
      console.log('  Context preview (first 200 chars):', context.substring(0, 200) + '...');
    } else {
      console.log('⚠️ No passages found in file');
      console.log('  This might mean the query didn\'t match well');
      console.log('  Will fall back to default KB');
    }
    console.log('');
  } else {
    console.log('⚠️ NO FILE ID specified - will use default KB');
    console.log('');
  }

  // Fallback to default KB if file didn't have content
  if (!found) {
    console.log('===== SEARCHING DEFAULT KB =====');
    console.log('Tags:', JSON.stringify({ source: "default" }));
    console.log('');

    const fb = await client.searchFiles({
      query: workflow.userQuestion || event.preview,
      contextDepth: 1,
      tags: { source: "default" },
      limit: 10
    });

    const fbPassages = fb.passages || [];
    console.log('📊 Default KB search results:');
    console.log('  Passages found:', fbPassages.length);

    if (fbPassages.length > 0) {
      context = fbPassages.map(p => p.content).join("\n\n");
      found = true;
      usedFile = 'default-kb';

      console.log('✅ SUCCESS: Using default KB');
      console.log('  Context length:', context.length, 'chars');
    } else {
      console.log('❌ NO DEFAULT KB found');
    }
    console.log('');
  }
} catch (err) {
  console.error('');
  console.error('========================================');
  console.error('❌ ERROR LOADING FILE');
  console.error('========================================');
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  console.error('========================================');
  console.error('');
}

// Set workflow variables
workflow.kbContext = context;
workflow.kbFound = found;
workflow.kbFile = usedFile;
workflow.fileIdUsed = fileIdToLoad;

console.log('');
console.log('========================================');
console.log('✅ KB LOAD COMPLETE');
console.log('========================================');
console.log('Summary:');
console.log('  Found KB:', found);
console.log('  File ID used:', usedFile || 'none');
console.log('  Context length:', context.length, 'chars');
console.log('  User question:', workflow.userQuestion || event.preview);
console.log('========================================');
console.log('');
