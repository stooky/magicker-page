// ===== WORKING VERSION: Domain from Conversation State =====
// This version stores domain on first message and retrieves it on subsequent messages

console.log('===== 🔍 KB Search Start =====');
console.log('User message:', event.preview);

// Check if domain is already stored in conversation
let searchDomain = conversation.domain || '';

// If no domain stored yet, try to extract from the message
// The frontend will prepend domain info to the first message
if (!searchDomain && event.preview) {
  const domainMatch = event.preview.match(/^\[DOMAIN:(.+?)\]/);
  if (domainMatch) {
    searchDomain = domainMatch[1];
    conversation.domain = searchDomain; // Store for future messages
    console.log('✅ Extracted and stored domain:', searchDomain);

    // Remove the domain prefix from the actual question
    const actualQuestion = event.preview.replace(/^\[DOMAIN:.+?\]\s*/, '');
    console.log('Actual question:', actualQuestion);

    // Update event.preview for downstream processing
    workflow.userQuestion = actualQuestion || event.preview;
  } else {
    workflow.userQuestion = event.preview;
  }
} else {
  console.log('Using stored domain:', searchDomain);
  workflow.userQuestion = event.preview;
}

console.log('Search domain:', searchDomain);
console.log('Query:', workflow.userQuestion);

let context = "";
let found = false;
let usedFile = "";

try {
  if (searchDomain) {
    // Search domain-specific KB
    console.log('Searching domain KB with tags:', { domain: searchDomain });

    const res = await client.searchFiles({
      query: workflow.userQuestion,
      contextDepth: 1,
      tags: { domain: searchDomain },
      limit: 10
    });

    const passages = res.passages || [];
    console.log('Total passages found:', passages.length);

    if (passages.length > 0) {
      // Get the fileId from the first passage (most relevant)
      const firstFileId = passages[0].fileId;
      console.log('Using only first file:', firstFileId);

      // Filter to only use passages from the first file
      const firstFilePassages = passages.filter(p => p.fileId === firstFileId);
      console.log('Passages from first file:', firstFilePassages.length);

      context = firstFilePassages.map(p => p.content).join("\n\n");
      found = true;
      usedFile = firstFileId;

      console.log('✅ Using domain-specific KB for:', searchDomain);
      console.log('✅ Using only file:', firstFileId);
      console.log('Context length:', context.length);
    } else {
      console.log('⚠️ No passages found for domain:', searchDomain);
    }
  } else {
    console.log('⚠️ No domain available - will use default KB');
  }

  // Fallback to default KB if no domain-specific results
  if (!found) {
    console.log('Searching default KB...');

    const fb = await client.searchFiles({
      query: workflow.userQuestion,
      contextDepth: 1,
      tags: { source: "default" },
      limit: 10
    });

    const fbPassages = fb.passages || [];
    console.log('Default KB passages found:', fbPassages.length);

    if (fbPassages.length > 0) {
      // Also only use first file from default KB
      const firstFileId = fbPassages[0].fileId;
      const firstFilePassages = fbPassages.filter(p => p.fileId === firstFileId);

      context = firstFilePassages.map(p => p.content).join("\n\n");
      found = true;
      usedFile = firstFileId;

      console.log('✅ Using default KB');
      console.log('✅ Using only file:', firstFileId);
      console.log('Context length:', context.length);
    } else {
      console.log('⚠️ No default KB passages found');
    }
  }
} catch (err) {
  console.error('❌ KB Search Error:', err.message);
  console.error('Error stack:', err.stack);
}

// Set workflow variables for use in AI Task
workflow.kbContext = context;
workflow.kbFound = found;
workflow.kbFile = usedFile;
workflow.searchDomain = searchDomain;

console.log('===== ✅ KB Search Complete =====');
console.log('Found KB:', found);
console.log('Context length:', context.length);
console.log('Domain:', searchDomain);
