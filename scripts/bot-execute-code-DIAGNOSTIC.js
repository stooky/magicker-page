// ===== DIAGNOSTIC VERSION - Use this to debug userData =====
// This logs EVERYTHING to help us find where the userData is

console.log('===== 🔍 DIAGNOSTIC: Full Event Object =====');
console.log('event.type:', event.type);
console.log('Full event:', JSON.stringify(event, null, 2));
console.log('');

// Check if this is our custom setDomain event
if (event.type === 'custom:setDomain') {
  console.log('🎯 CUSTOM EVENT DETECTED: custom:setDomain');
  console.log('event.payload.domain:', event.payload?.domain);
  console.log('event.payload.website:', event.payload?.website);
  console.log('event.payload.sessionID:', event.payload?.sessionID);

  // Store in conversation state
  conversation.domain = event.payload?.domain;
  conversation.website = event.payload?.website;
  conversation.sessionID = event.payload?.sessionID;

  console.log('✅ Stored in conversation state');
  workflow.domainSet = true;

  // Don't process this as a message - just end
  return;
}

console.log('');

console.log('===== Checking event.user =====');
console.log('event.user:', JSON.stringify(event.user, null, 2));
console.log('event.user?.domain:', event.user?.domain);
console.log('event.user?.website:', event.user?.website);
console.log('event.user?.sessionID:', event.user?.sessionID);
console.log('');

console.log('===== Checking event.payload =====');
console.log('event.payload:', JSON.stringify(event.payload, null, 2));
console.log('event.payload?.domain:', event.payload?.domain);
console.log('event.payload?.website:', event.payload?.website);
console.log('event.payload?.sessionID:', event.payload?.sessionID);
console.log('');

console.log('===== Checking userData variations =====');
console.log('event.userData:', JSON.stringify(event.userData, null, 2));
console.log('event.context:', JSON.stringify(event.context, null, 2));
console.log('event.tags:', JSON.stringify(event.tags, null, 2));
console.log('');

console.log('===== Checking user object variations =====');
console.log('user:', typeof user !== 'undefined' ? JSON.stringify(user, null, 2) : 'undefined');
console.log('user?.tags:', typeof user !== 'undefined' ? JSON.stringify(user?.tags, null, 2) : 'N/A');
console.log('');

console.log('===== Checking conversation =====');
console.log('conversation:', JSON.stringify(conversation, null, 2));
console.log('conversation.tags:', JSON.stringify(conversation?.tags, null, 2));
console.log('conversation.domain (from custom event):', conversation.domain);
console.log('conversation.website (from custom event):', conversation.website);
console.log('conversation.sessionID (from custom event):', conversation.sessionID);
console.log('');

console.log('===== Other possible locations =====');
console.log('event.preview (user message):', event.preview);
console.log('event.userId:', event.userId);
console.log('event.conversationId:', event.conversationId);
console.log('');

// Try to search with hardcoded domain to prove KB search works
console.log('===== Testing with HARDCODED domain =====');
const hardcodedDomain = 'gibbonheating.com';

try {
  const res = await client.searchFiles({
    query: event.preview,
    contextDepth: 1,
    tags: { domain: hardcodedDomain },
    limit: 10
  });

  const passages = res.passages || [];
  console.log('✅ Hardcoded search found passages:', passages.length);

  if (passages.length > 0) {
    console.log('First passage fileId:', passages[0].fileId);
    console.log('First passage content preview:', passages[0].content.substring(0, 100));
  }
} catch (err) {
  console.error('❌ Hardcoded search failed:', err.message);
}

console.log('');
console.log('===== END DIAGNOSTIC =====');

// Set empty workflow variables for now
workflow.kbContext = "DIAGNOSTIC MODE - Check logs above to find userData location";
workflow.kbFound = false;
workflow.diagnosticComplete = true;
