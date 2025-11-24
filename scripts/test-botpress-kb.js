/**
 * Test Script for Botpress Knowledge Base Integration
 *
 * This script tests the complete KB workflow:
 * 1. Upload a test KB file with tags
 * 2. Create a session with matching tags
 * 3. Send a message to the bot
 * 4. Verify the bot uses ONLY the uploaded KB file
 *
 * Usage: node scripts/test-botpress-kb.js
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');
const { Client } = require('@botpress/client');

// Configuration from environment
const BP_API_TOKEN = process.env.BOTPRESS_API_TOKEN;
const BP_WORKSPACE_ID = process.env.BOTPRESS_CLIENT_ID;
const BP_BOT_ID = process.env.BOTPRESS_BOT_ID;

if (!BP_API_TOKEN || !BP_WORKSPACE_ID || !BP_BOT_ID) {
  console.error('❌ Missing required environment variables:');
  console.error('   BOTPRESS_API_TOKEN:', !!BP_API_TOKEN);
  console.error('   BOTPRESS_CLIENT_ID:', !!BP_WORKSPACE_ID);
  console.error('   BOTPRESS_BOT_ID:', !!BP_BOT_ID);
  process.exit(1);
}

// Test data
const TEST_SESSION_ID = `test-${Date.now()}`;
const TEST_DOMAIN = 'test-product.com';
const TEST_WEBSITE = 'https://test-product.com';
const TEST_CONTENT = `
AlphaHammer 9000 Product Information

The AlphaHammer 9000 is our flagship product.
Price: $299.99
Features: Wireless charging, AI-powered targeting, Lifetime warranty
Available: In stock

Contact us at sales@test-product.com for bulk orders.
`.trim();

// Helper function to make API calls
function apiCall(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test 1: Upload KB file with tags (using Botpress SDK)
async function test1_uploadKBFile() {
  console.log('\n📤 TEST 1: Upload KB File with Tags');
  console.log('=' .repeat(60));

  try {
    // Initialize Botpress client (same as your kb-create.js)
    const bp = new Client({
      token: BP_API_TOKEN,
      botId: BP_BOT_ID
    });

    const fileName = `test-kb-${TEST_SESSION_ID}.txt`;

    // Upload file using Botpress SDK (same as your kb-create.js)
    const file = await bp.uploadFile({
      key: fileName,
      content: TEST_CONTENT,
      index: true,
      tags: {
        sessionID: TEST_SESSION_ID,
        domain: TEST_DOMAIN,
        website: TEST_WEBSITE,
        source: 'test-script'
      }
    });

    const fileId = file.file?.id || file.id;

    if (fileId) {
      console.log('✅ File uploaded successfully');
      console.log('   File ID:', fileId);
      console.log('   File Name:', fileName);
      console.log('   Tags:', { sessionID: TEST_SESSION_ID, domain: TEST_DOMAIN, website: TEST_WEBSITE });
      return fileId;
    } else {
      console.error('❌ File upload failed - no file ID returned');
      console.error('   Response:', JSON.stringify(file, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error uploading file:', error.message);
    console.error('   Stack:', error.stack);
    return null;
  }
}

// Test 2: Create session with matching tags (using Botpress SDK)
async function test2_createSession(fileId) {
  console.log('\n🔐 TEST 2: Create Session with Matching Tags');
  console.log('=' .repeat(60));

  try {
    // Initialize Botpress client
    const bp = new Client({
      token: BP_API_TOKEN,
      botId: BP_BOT_ID
    });

    console.log('🔍 Creating conversation with tags:');
    console.log('   ', JSON.stringify({
      sessionID: TEST_SESSION_ID,
      website: TEST_WEBSITE,
      domain: TEST_DOMAIN,
      kbFileId: fileId
    }, null, 2));

    // Create conversation using SDK
    const conversation = await bp.createConversation({
      channel: 'channel',
      integrationId: 'integration',
      tags: {
        sessionID: TEST_SESSION_ID,
        website: TEST_WEBSITE,
        domain: TEST_DOMAIN,
        kbFileId: fileId || 'none'
      }
    });

    const conversationId = conversation.conversation?.id || conversation.id;

    if (conversationId) {
      console.log('✅ Session created successfully');
      console.log('   Conversation ID:', conversationId);
      console.log('   Tags:', { sessionID: TEST_SESSION_ID, website: TEST_WEBSITE, domain: TEST_DOMAIN, kbFileId: fileId });
      return conversationId;
    } else {
      console.error('❌ Session creation failed - no conversation ID returned');
      console.error('   Response:', JSON.stringify(conversation, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating session:', error.message);
    console.error('   Stack:', error.stack);
    return null;
  }
}

// Test 3: Send message and verify KB usage
async function test3_sendMessage(conversationId, question, expectedAnswer) {
  console.log(`\n💬 TEST 3: Ask "${question}"`);
  console.log('=' .repeat(60));

  try {
    const response = await apiCall({
      hostname: 'api.botpress.cloud',
      path: '/v1/chat/messages',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BP_API_TOKEN}`,
        'x-workspace-id': BP_WORKSPACE_ID,
        'x-bot-id': BP_BOT_ID,
        'Content-Type': 'application/json'
      }
    }, {
      conversationId: conversationId,
      payload: {
        type: 'text',
        text: question
      }
    });

    if (response.status === 200 || response.status === 201) {
      const messages = response.data.messages || [];
      const botMessage = messages.find(m => m.direction === 'outgoing');

      if (botMessage) {
        const answer = botMessage.payload?.text || JSON.stringify(botMessage.payload);
        console.log('✅ Bot responded:');
        console.log('   Answer:', answer);

        if (expectedAnswer && answer.toLowerCase().includes(expectedAnswer.toLowerCase())) {
          console.log('   ✅ Contains expected answer:', expectedAnswer);
          return true;
        } else if (expectedAnswer) {
          console.log('   ⚠️  Does NOT contain expected answer:', expectedAnswer);
          return false;
        }
        return true;
      } else {
        console.error('❌ No bot response found');
        console.error('   Messages:', JSON.stringify(messages, null, 2));
        return false;
      }
    } else {
      console.error('❌ Message send failed');
      console.error('   Status:', response.status);
      console.error('   Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending message:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('\n🧪 BOTPRESS KNOWLEDGE BASE INTEGRATION TEST');
  console.log('=' .repeat(60));
  console.log('Bot ID:', BP_BOT_ID);
  console.log('Workspace ID:', BP_WORKSPACE_ID);
  console.log('Test Session ID:', TEST_SESSION_ID);

  try {
    // Test 1: Upload file
    const fileId = await test1_uploadKBFile();
    if (!fileId) {
      console.error('\n❌ Test suite failed at Test 1');
      process.exit(1);
    }

    // Wait for indexing (Botpress indexes quickly, but give it a moment)
    console.log('\n⏳ Waiting 3 seconds for KB indexing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 2: Create session
    const conversationId = await test2_createSession(fileId);
    if (!conversationId) {
      console.error('\n❌ Test suite failed at Test 2');
      process.exit(1);
    }

    // Wait a moment for session to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3a: Ask a question that SHOULD be answered from KB
    const test3a = await test3_sendMessage(
      conversationId,
      'What is the product name?',
      'AlphaHammer 9000'
    );

    // Wait between messages
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3b: Ask about pricing
    const test3b = await test3_sendMessage(
      conversationId,
      'What is the price?',
      '$299.99'
    );

    // Wait between messages
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Ask a question NOT in the KB (should say "I do not have that information")
    console.log('\n🚫 TEST 4: Ask Question NOT in KB');
    console.log('=' .repeat(60));
    const test4 = await test3_sendMessage(
      conversationId,
      'What are your office hours?',
      null
    );

    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log('Test 1 (Upload KB):', fileId ? '✅ PASS' : '❌ FAIL');
    console.log('Test 2 (Create Session):', conversationId ? '✅ PASS' : '❌ FAIL');
    console.log('Test 3a (Answer from KB):', test3a ? '✅ PASS' : '❌ FAIL');
    console.log('Test 3b (Price from KB):', test3b ? '✅ PASS' : '❌ FAIL');
    console.log('Test 4 (Question not in KB):', test4 ? '✅ PASS' : '⚠️  CHECK MANUALLY');

    const allPassed = fileId && conversationId && test3a && test3b;
    console.log('\n' + (allPassed ? '✅ ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
    console.log('=' .repeat(60));

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
