/**
 * Knowledge Base Manager Utility
 *
 * Upload and manage Knowledge Base files in Botpress Cloud
 *
 * Usage:
 *   node scripts/kb-manager.js -push <file-path> [tags]
 *   node scripts/kb-manager.js -fetch <fileId>
 *   node scripts/kb-manager.js -list [tag-filter]
 *
 * Examples:
 *   node scripts/kb-manager.js -push ./default-kb.txt source=default,type=fallback
 *   node scripts/kb-manager.js -fetch file_01KAPB2RFA32CJX290Q24NES5A
 *   node scripts/kb-manager.js -list source=default
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('@botpress/client');
const fs = require('fs');
const path = require('path');

// Configuration
const BOTPRESS_API_TOKEN = process.env.BOTPRESS_API_TOKEN;
const BOTPRESS_BOT_ID = process.env.BOTPRESS_BOT_ID;

if (!BOTPRESS_API_TOKEN || !BOTPRESS_BOT_ID) {
    console.error('❌ Error: Missing BOTPRESS_API_TOKEN or BOTPRESS_BOT_ID in .env.local');
    process.exit(1);
}

// Initialize Botpress client
const bp = new Client({
    token: BOTPRESS_API_TOKEN,
    botId: BOTPRESS_BOT_ID
});

/**
 * Parse command line tags
 * Format: "key1=value1,key2=value2"
 */
function parseTags(tagsString) {
    if (!tagsString) return {};

    const tags = {};
    const pairs = tagsString.split(',');

    pairs.forEach(pair => {
        const [key, value] = pair.split('=').map(s => s.trim());
        if (key && value) {
            tags[key] = value;
        }
    });

    return tags;
}

/**
 * Upload a KB file to Botpress Cloud
 */
async function pushKB(filePath, tagsString) {
    console.log('\n📤 Uploading Knowledge Base file...\n');

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Error: File not found: ${filePath}`);
        process.exit(1);
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    // Parse tags
    const tags = parseTags(tagsString);
    tags.uploadedAt = new Date().toISOString();
    tags.uploadedBy = 'kb-manager-script';

    console.log('📄 File:', fileName);
    console.log('📏 Size:', content.length, 'characters');
    console.log('🏷️  Tags:', JSON.stringify(tags, null, 2));
    console.log('\nUploading...\n');

    try {
        // Upload file using Botpress SDK
        const result = await bp.uploadFile({
            key: fileName,
            content: content,
            index: true,
            tags: tags
        });

        const fileId = result.file?.id || result.id;

        console.log('✅ Upload successful!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 KB File Information:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('File ID:', fileId);
        console.log('File Name:', fileName);
        console.log('Status:', result.file?.status || 'uploaded');
        console.log('Indexed:', result.file?.index ? 'Yes' : 'No');
        console.log('Bot ID:', BOTPRESS_BOT_ID);
        console.log('Tags:', JSON.stringify(tags, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('💡 To use this KB as a fallback in your bot code:\n');
        console.log('   const DEFAULT_KB_FILE_ID = \'' + fileId + '\';');
        console.log('   const DEFAULT_KB_TAGS = ' + JSON.stringify(tags) + ';\n');

        // Save to a config file for easy reference
        const configPath = path.join(__dirname, 'kb-config.json');
        let config = {};

        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }

        config.defaultKB = {
            fileId: fileId,
            fileName: fileName,
            tags: tags,
            uploadedAt: new Date().toISOString(),
            botId: BOTPRESS_BOT_ID
        };

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('📝 Configuration saved to:', configPath, '\n');

        return result;

    } catch (error) {
        console.error('❌ Upload failed:', error.message);
        if (error.response?.data) {
            console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

/**
 * Fetch KB file details from Botpress Cloud
 */
async function fetchKB(fileId) {
    console.log('\n🔍 Fetching Knowledge Base file...\n');
    console.log('File ID:', fileId);
    console.log('\nFetching...\n');

    try {
        const result = await bp.getFile({ id: fileId });

        console.log('✅ File found!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 KB File Information:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('File ID:', result.file.id);
        console.log('File Name:', result.file.key);
        console.log('Size:', result.file.size, 'bytes');
        console.log('Status:', result.file.status);
        console.log('Indexed:', result.file.index ? 'Yes' : 'No');
        console.log('Content Type:', result.file.contentType);
        console.log('Created:', result.file.createdAt);
        console.log('Updated:', result.file.updatedAt);
        console.log('Tags:', JSON.stringify(result.file.tags, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return result;

    } catch (error) {
        console.error('❌ Fetch failed:', error.message);
        if (error.response?.data) {
            console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

/**
 * List all KB files (optionally filtered by tags)
 */
async function listKB(tagFilter) {
    console.log('\n📚 Listing Knowledge Base files...\n');

    if (tagFilter) {
        console.log('Filter:', tagFilter);
    }

    console.log('\nFetching...\n');

    try {
        const tags = tagFilter ? parseTags(tagFilter) : undefined;
        const result = await bp.listFiles({ tags });

        const files = result.files || [];

        console.log('✅ Found', files.length, 'file(s)\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        files.forEach((file, index) => {
            console.log(`\n📄 File ${index + 1}:`);
            console.log('   ID:', file.id);
            console.log('   Name:', file.key);
            console.log('   Size:', file.size, 'bytes');
            console.log('   Status:', file.status);
            console.log('   Indexed:', file.index ? 'Yes' : 'No');
            console.log('   Created:', file.createdAt);
            console.log('   Tags:', JSON.stringify(file.tags, null, 2));
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return result;

    } catch (error) {
        console.error('❌ List failed:', error.message);
        if (error.response?.data) {
            console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

/**
 * Show usage help
 */
function showHelp() {
    console.log(`
Knowledge Base Manager Utility

Usage:
  node scripts/kb-manager.js -push <file-path> [tags]
  node scripts/kb-manager.js -fetch <fileId>
  node scripts/kb-manager.js -list [tag-filter]
  node scripts/kb-manager.js -help

Commands:
  -push <file-path> [tags]   Upload a new KB file
                             Tags format: key1=value1,key2=value2

  -fetch <fileId>            Get details of a specific KB file

  -list [tag-filter]         List all KB files (optionally filtered)

  -help                      Show this help message

Examples:
  # Upload a default KB file
  node scripts/kb-manager.js -push ./knowledge/default-kb.txt source=default,type=fallback

  # Fetch a specific KB file
  node scripts/kb-manager.js -fetch file_01KAPB2RFA32CJX290Q24NES5A

  # List all default KB files
  node scripts/kb-manager.js -list source=default

  # List all KB files
  node scripts/kb-manager.js -list
`);
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '-help' || args[0] === '--help') {
        showHelp();
        process.exit(0);
    }

    const command = args[0];

    try {
        switch (command) {
            case '-push':
                if (!args[1]) {
                    console.error('❌ Error: File path required');
                    console.log('Usage: node scripts/kb-manager.js -push <file-path> [tags]');
                    process.exit(1);
                }
                await pushKB(args[1], args[2]);
                break;

            case '-fetch':
                if (!args[1]) {
                    console.error('❌ Error: File ID required');
                    console.log('Usage: node scripts/kb-manager.js -fetch <fileId>');
                    process.exit(1);
                }
                await fetchKB(args[1]);
                break;

            case '-list':
                await listKB(args[1]);
                break;

            default:
                console.error('❌ Error: Unknown command:', command);
                showHelp();
                process.exit(1);
        }
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { pushKB, fetchKB, listKB };
