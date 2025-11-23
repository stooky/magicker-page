// ===== BOTPRESS BOT EXECUTE CODE: KB SEARCH =====
// This code should be placed in an "Execute Code" card in your Botpress bot workflow
// Place this BEFORE your AI Task card

// Get domain from user data (passed via webchat userData)
const searchDomain = event.user?.domain || '';

console.log('===== 🔍 KB Search =====');
console.log('Domain from userData:', searchDomain);
console.log('User data:', JSON.stringify(event.user));
console.log('Query:', event.preview);

let context = "";
let found = false;
let usedFile = "";

try {
  if (searchDomain) {
    // Search domain-specific KB
    console.log('Searching domain KB with tags:', { domain: searchDomain });

    const res = await client.searchFiles({
      query: event.preview,
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
      console.log('Context preview:', context.substring(0, 200) + '...');
    } else {
      console.log('⚠️ No passages found for domain:', searchDomain);
    }
  } else {
    console.log('⚠️ No domain in userData - skipping domain KB search');
  }

  // Fallback to default KB if no domain-specific results
  if (!found) {
    console.log('Searching default KB...');

    const fb = await client.searchFiles({
      query: event.preview,
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
      console.log('Context preview:', context.substring(0, 200) + '...');
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
console.log('File used:', usedFile);
