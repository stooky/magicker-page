# Knowledge Base Manager Utility

A command-line tool for managing Knowledge Base files in Botpress Cloud.

## Quick Start

### 1. Upload a Default KB

```bash
node scripts/kb-manager.js -push scripts/default-kb.txt source=default,type=fallback
```

This will:
- Upload the `default-kb.txt` file to Botpress Cloud
- Tag it as `source=default` and `type=fallback`
- Index it for semantic search
- Save the file ID to `scripts/kb-config.json`
- Display the file ID for use in your bot code

### 2. Get KB Information

```bash
node scripts/kb-manager.js -fetch file_01KAPB2RFA32CJX290Q24NES5A
```

This will display all details about the specified KB file.

### 3. List All KB Files

```bash
# List all files
node scripts/kb-manager.js -list

# List only default files
node scripts/kb-manager.js -list source=default
```

## Usage in Botpress Bot

After uploading a default KB, use it in your Execute Code card:

```javascript
// Read userData from Get User Data
const sessionID = workflow.userData?.sessionID
const website = workflow.userData?.website
const domain = workflow.userData?.domain

// Build search tags - only include defined values
const searchTags = {}
if (sessionID) searchTags.sessionID = sessionID
if (website) searchTags.website = website
if (domain) searchTags.domain = domain

// Check if we have any tags to search with
if (Object.keys(searchTags).length > 0) {
  // Search for domain-specific KB
  const res = await client.searchFiles({
    query: event.preview,
    contextDepth: 1,
    tags: searchTags,
    limit: 10
  })

  const passages = res.data?.passages || []
  workflow.kbContext = passages.map(p => p.content).join('\n\n')
  workflow.kbFound = passages.length > 0
} else {
  // FALLBACK: Use default KB
  const DEFAULT_KB_FILE_ID = 'file_01KAPB2RFA32CJX290Q24NES5A' // Replace with your file ID

  const res = await client.searchFiles({
    query: event.preview,
    contextDepth: 1,
    tags: { source: 'default' }, // Search for default KB
    limit: 10
  })

  const passages = res.data?.passages || []
  workflow.kbContext = passages.map(p => p.content).join('\n\n')
  workflow.kbFound = passages.length > 0
}
```

## Configuration File

After uploading, the tool saves configuration to `scripts/kb-config.json`:

```json
{
  "defaultKB": {
    "fileId": "file_01KAPB2RFA32CJX290Q24NES5A",
    "fileName": "default-kb.txt",
    "tags": {
      "source": "default",
      "type": "fallback",
      "uploadedAt": "2025-11-22T20:00:00.000Z",
      "uploadedBy": "kb-manager-script"
    },
    "uploadedAt": "2025-11-22T20:00:00.000Z",
    "botId": "3809961f-f802-40a3-aa5a-9eb91c0dedbb"
  }
}
```

## Examples

### Upload with Multiple Tags

```bash
node scripts/kb-manager.js -push ./my-kb.txt source=default,type=fallback,version=1.0
```

### Create Domain-Specific KB

```bash
node scripts/kb-manager.js -push ./acme-corp.txt domain=acme.com,source=manual
```

### List Production KBs

```bash
node scripts/kb-manager.js -list type=production
```

## Tag Conventions

Recommended tags for organizing KB files:

- **source**: `default`, `website`, `manual`, `api`
- **type**: `fallback`, `primary`, `test`, `production`
- **domain**: Website domain (e.g., `example.com`)
- **sessionID**: User session identifier
- **website**: Full website URL
- **version**: KB version number

## Troubleshooting

### "Missing BOTPRESS_API_TOKEN"

Make sure your `.env.local` file contains:
```
BOTPRESS_API_TOKEN=bp_pat_...
BOTPRESS_BOT_ID=3809961f-f802-40a3-aa5a-9eb91c0dedbb
```

### "File not found"

Use the full path or relative path from the project root:
```bash
node scripts/kb-manager.js -push ./scripts/default-kb.txt source=default
```

### Upload Fails

- Check that your Botpress API token is valid
- Verify the bot ID is correct
- Ensure file size is reasonable (<1MB recommended)

## Integration with Main Flow

To integrate the default KB into your Magic Page flow:

1. Upload a default KB: `node scripts/kb-manager.js -push scripts/default-kb.txt source=default`
2. Copy the file ID from the output
3. Update your Botpress Execute Code card with the fallback logic above
4. Test in the emulator (should use default KB)
5. Test in production (should use domain-specific KB when available)

## File ID Reference

Keep track of important KB file IDs:

- **Default/Fallback KB**: `file_XXXXX` (get from kb-config.json)
- **Test KB**: `file_YYYYY`
- **Production KB**: `file_ZZZZZ`

Store these in your Botpress workflow as constants for easy reference.
