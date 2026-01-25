/**
 * Simplified test - assumes you already created a conversation via your web app
 * Just tests if the bot answers from KB
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('@botpress/client');

const BP_API_TOKEN = process.env.BOTPRESS_API_TOKEN;
const BP_BOT_ID = process.env.BOTPRESS_BOT_ID;

// YOU NEED TO PROVIDE A CONVERSATION ID FROM YOUR WEB APP
const CONVERSATION_ID = process.argv[2];

if (!CONVERSATION_ID) {
  console.error('❌ Usage: node scripts/test-message-only.js <conversation-id>');
  console.error('');
  console.error('To get a conversation ID:');
  console.error('1. Run your app: npm run dev');
  console.error('2. Submit the form at http://localhost:3000');
  console.error('3. Check the browser console or network tab for the conversation ID');
  console.error('4. Run: node scripts/test-message-only.js <that-id>');
  process.exit(1);
}

async function testMessage() {
  console.log('\n💬 Testing Bot Message with Conversation ID');
  console.log('='.repeat(60));
  console.log('Conversation ID:', CONVERSATION_ID);

  try {
    const bp = new Client({
      token: BP_API_TOKEN,
      botId: BP_BOT_ID
    });

    console.log('\n📤 Sending message: "What is the product name?"');

    const message = await bp.createMessage({
      conversationId: CONVERSATION_ID,
      type: 'text',
      payload: {
        text: 'What is the product name?'
      }
    });

    console.log('✅ Message sent:', message.message?.id);

    // Wait for bot response
    console.log('\n⏳ Waiting 3 seconds for bot to respond...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // List messages to see the response
    const messages = await bp.listMessages({
      conversationId: CONVERSATION_ID
    });

    console.log('\n📨 Recent messages:');
    const recentMessages = messages.messages.slice(-5);
    recentMessages.forEach(msg => {
      const direction = msg.direction === 'incoming' ? '👤 User' : '🤖 Bot';
      const text = msg.payload?.text || JSON.stringify(msg.payload);
      console.log(`${direction}: ${text}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMessage();
