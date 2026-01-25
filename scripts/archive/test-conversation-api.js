/**
 * Test script for the conversation API
 * Run with: node scripts/test-conversation-api.js
 */

async function testConversation() {
    const baseUrl = 'http://localhost:3000';

    console.log('Testing Botpress Conversation API...\n');

    try {
        const response = await fetch(`${baseUrl}/api/botpress/test-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                domain: 'gohighlevel.com',
                fileId: 'file_01KAY582T8J423AKKXEE58XC3Q',
                message: 'What is GoHighLevel and what services do they offer?'
            })
        });

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n✓ SUCCESS');
            console.log('User ID:', data.userId);
            console.log('Conversation ID:', data.conversationId);
            console.log('Bot said:', data.botResponse?.text || '(no response)');
        } else {
            console.log('\n✗ FAILED:', data.error);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testConversation();
