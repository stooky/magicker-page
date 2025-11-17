# Botpress Bot Configuration for Magic Page

This directory contains configuration files for setting up your Botpress bot for Magic Page lead capture.

## Directory Structure

```
botpress-bot-config/
├── README.md                      # This file
├── flows/
│   └── lead-capture.json          # Pre-built conversation flow
└── actions/
    └── saveLeadToMagicPage.js     # Custom action to save leads
```

## Files Overview

### 1. flows/lead-capture.json

**Purpose:** Complete conversation flow for capturing lead information

**Features:**
- Welcome greeting
- Name capture
- Email capture with validation
- Company name capture
- Website URL capture
- Qualification question
- Thank you message
- Webhook integration

**How to Use:**
1. Copy the JSON structure
2. In Botpress Studio, create a new flow named "lead-capture"
3. Use the visual editor to rebuild, OR
4. Import via Code Editor (advanced)

### 2. actions/saveLeadToMagicPage.js

**Purpose:** Custom Botpress action that sends lead data to Magic Page API

**Features:**
- Sends captured session data to Magic Page webhook
- Handles errors gracefully
- Logs success/failure

**How to Use:**
1. In Botpress Studio → Code Editor
2. Navigate to `data/bots/YOUR-BOT-ID/actions/`
3. Create file: `saveLeadToMagicPage.js`
4. Paste the code
5. Call this action from your flow's "Thank You" node

## Setup Instructions

### Method 1: Visual Flow Builder (Recommended)

1. **Open Botpress Studio:** http://localhost:3001/studio/YOUR-BOT-ID

2. **Create Flow:**
   - Click "Flows" in sidebar
   - Create new flow: "lead-capture"
   - Set as Main/Start flow

3. **Build Nodes:** Follow the structure in `flows/lead-capture.json`:
   - Add Standard nodes for each step
   - Configure "On Enter" actions (text messages)
   - Configure "On Receive" actions (save to session)
   - Set transitions between nodes

4. **Add Custom Action:**
   - Code Editor → Actions
   - Create `saveLeadToMagicPage.js`
   - Copy code from `actions/saveLeadToMagicPage.js`

5. **Call Action:**
   - In "Thank You" node
   - On Enter → Execute Code → `saveLeadToMagicPage`

6. **Publish:** Click "Publish" button

### Method 2: Import Configuration (Advanced)

**Note:** Requires access to Botpress container filesystem

1. **Access Bot Directory:**
```bash
# Enter Botpress container
docker exec -it botpress /bin/bash

# Navigate to bot data
cd /botpress/data/bots/YOUR-BOT-ID
```

2. **Copy Flow:**
```bash
# From your host machine, copy to container
docker cp botpress-bot-config/flows/lead-capture.json botpress:/botpress/data/bots/YOUR-BOT-ID/flows/lead-capture.flow.json
```

3. **Copy Action:**
```bash
docker cp botpress-bot-config/actions/saveLeadToMagicPage.js botpress:/botpress/data/bots/YOUR-BOT-ID/actions/saveLeadToMagicPage.js
```

4. **Restart Botpress:**
```bash
docker-compose restart botpress
```

5. **Verify in Studio:**
   - Check Flows → should see "lead-capture"
   - Check Actions → should see "saveLeadToMagicPage"

## Customization Guide

### Change Welcome Message

Edit the welcome node:
```javascript
// On Enter
say #!builtin_text-welcome

// Update text content in Studio:
"Hi there! 👋 Welcome to [Your Company]! I'm here to help."
```

### Add More Fields

Add a new node between existing ones:

```javascript
// Example: Capture phone number
// Node: capture-phone
// On Enter:
"What's the best phone number to reach you?"

// On Receive:
session.phone = event.preview

// Validation (optional):
temp.valid = !!session.phone.match(/^\d{10}$/)
```

### Add Conditional Logic

```javascript
// In transitions, add conditions:
if (session.company === "Enterprise") {
  // Transition to enterprise-flow
} else {
  // Transition to standard-flow
}
```

### Customize Thank You Message

```javascript
// Use captured variables
"Thanks {{session.name}}! We'll send demo details to {{session.email}}."
```

### Add Quick Replies

In any text node, add quick replies:
```json
{
  "text": "What's your main interest?",
  "quick_replies": [
    "Lead Generation",
    "Customer Support",
    "E-commerce",
    "Other"
  ]
}
```

## Session Variables

Available in all nodes after capture:

- `session.name` - User's name
- `session.email` - User's email
- `session.company` - Company name
- `session.website` - Website URL
- `session.interest` - Qualification response
- `session.magicPageSessionID` - Magic Page session ID

## Integration with Magic Page

### How Data Flows:

1. **User fills Magic Page form** → Creates session in Botpress
2. **Bot captures data** → Stores in session variables
3. **saveLeadToMagicPage action** → POSTs to Magic Page webhook
4. **Magic Page webhook** → Saves to PostgreSQL database

### Webhook Payload Structure:

```json
{
  "type": "custom",
  "payload": {
    "action": "save_lead",
    "data": {
      "sessionID": "abc123",
      "email": "user@example.com",
      "website": "https://example.com",
      "company": "Acme Corp",
      "name": "John Doe",
      "interest": "Lead generation",
      "leadData": {
        "name": "John Doe",
        "email": "user@example.com",
        "company": "Acme Corp",
        "website": "https://example.com",
        "interest": "Lead generation",
        "capturedAt": "2024-01-15T10:30:00Z"
      }
    }
  }
}
```

## Testing Your Flow

### Test in Studio:

1. Go to Emulator (bottom right panel)
2. Click "New Conversation"
3. Type "start" or trigger your flow
4. Walk through conversation
5. Check session variables in debug panel

### Test in Magic Page:

1. Start Magic Page: `npm run dev`
2. Fill form at http://localhost:3000
3. Wait for "Your AI Agent is ready!"
4. Click "Give it a try!"
5. Complete conversation
6. Check database: `SELECT * FROM websitevisitors ORDER BY created_at DESC LIMIT 1;`

## Advanced Features

### Add NLU (Natural Language Understanding)

1. Enable NLU in bot settings
2. Create intents (e.g., "greeting", "ask-pricing")
3. Add training phrases
4. Use in flow transitions:
   ```
   if (event.nlu.intent.name === 'ask-pricing') {
     // Go to pricing node
   }
   ```

### Add AI-Powered Responses

1. Install GPT module in Botpress
2. Configure API key
3. Use in nodes:
   ```javascript
   const aiResponse = await generateText({
     prompt: `User asked: ${event.preview}`,
     temperature: 0.7
   })
   say aiResponse
   ```

### Multi-Language Support

1. Enable languages in bot config (en, es, fr, etc.)
2. Translate text in each node
3. Bot auto-detects user language

### Add Analytics

```javascript
// In any node
bp.events.trackEvent({
  type: 'lead_captured',
  payload: {
    email: session.email,
    source: 'magic-page'
  }
})
```

## Troubleshooting

**Flow not triggering:**
- Check it's set as Main flow in Studio
- Verify trigger conditions
- Check published status

**Action not executing:**
- Verify file location in actions folder
- Check for syntax errors in console
- Ensure axios is available (installed by default)

**Variables not saving:**
- Check On Receive handlers
- Verify variable names (case-sensitive)
- Use session. prefix for persistence

## Resources

- [Botpress Flow Documentation](https://botpress.com/docs/building-chatbots/flow-editor/)
- [Actions Guide](https://botpress.com/docs/building-chatbots/actions/)
- [NLU Guide](https://botpress.com/docs/building-chatbots/nlu/)
- [API Reference](https://botpress.com/docs/building-chatbots/developers/api/)

## Support

Questions? Check:
- Botpress logs: `docker logs -f botpress`
- Flow debugging in Studio Emulator
- Magic Page console logs
- Database for saved leads
