// Simple KB loader - hardcoded for testing
const FILE_ID = 'file_01KAS6TESS1K3VCKS0YAQBS8MR';

console.log('Loading KB file:', FILE_ID);

// Search in the specific file
const result = await client.searchFiles({
  query: event.preview,
  fileIds: [FILE_ID],
  limit: 10
});

const passages = result.passages || [];
console.log('Found passages:', passages.length);

// Combine all passages
const context = passages.map(p => p.content).join('\n\n');

console.log('Context length:', context.length);

// Set workflow variables
workflow.kbContext = context;
workflow.kbFound = passages.length > 0;
