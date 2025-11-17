/**
 * OpenAI-powered content extraction
 * Analyzes scraped content and extracts the most meaningful and interesting snippets
 */
import OpenAI from 'openai';

/**
 * Extract meaningful snippets using OpenAI
 *
 * @param {Array} scrapedItems - Array of scraped page data
 * @param {string} url - The website URL being analyzed
 * @param {number} maxSnippets - Maximum number of snippets to extract (default: 10)
 * @returns {Promise<Object>} Extraction results
 */
export async function extractMeaningfulSnippets(scrapedItems, url, maxSnippets = 10) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.warn('OPENAI_API_KEY not set, skipping OpenAI extraction');
        return {
            success: false,
            snippets: [],
            error: 'OpenAI API key not configured'
        };
    }

    try {
        // Prepare content for analysis
        const contentSummary = prepareContentForAnalysis(scrapedItems);

        if (!contentSummary) {
            return {
                success: false,
                snippets: [],
                error: 'No content available for analysis'
            };
        }

        console.log(`Sending ${contentSummary.length} characters to OpenAI for analysis...`);

        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: apiKey
        });

        // Create the prompt
        const prompt = `Analyze the following website content from ${url} and extract ${maxSnippets} of the most interesting and meaningful points about this business, product, or service.

Website Content:
${contentSummary}

Instructions:
- Extract the most compelling and informative points
- Focus on what makes this business unique, their key services/products, value propositions
- Keep each point concise but informative (1-2 sentences max)
- Prioritize actionable information a potential customer would want to know
- Return ONLY the numbered list, no additional commentary
- Format: Return exactly ${maxSnippets} items in the format "1. Point one\\n2. Point two\\n..." etc.

Return the ${maxSnippets} most interesting points as a numbered list:`;

        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at analyzing business websites and extracting the most compelling and meaningful information. You provide concise, informative summaries that highlight what makes a business unique and valuable.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        // Extract the response
        const extractedText = response.choices[0].message.content.trim();
        console.log(`OpenAI extraction successful. Response length: ${extractedText.length}`);

        // Parse the numbered list
        const snippets = [];
        const lines = extractedText.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            // Check if line starts with a number followed by a period
            if (trimmed && /^\d+\./.test(trimmed)) {
                // Remove the number and period
                const cleaned = trimmed.split('.').slice(1).join('.').trim();
                if (cleaned) {
                    snippets.push(cleaned);
                }
            }
        }

        // Fallback: if parsing failed, just split by newlines
        if (snippets.length === 0) {
            snippets.push(...lines.filter(s => s.trim()));
        }

        return {
            success: true,
            snippets: snippets.slice(0, maxSnippets),
            error: null
        };

    } catch (error) {
        console.error('OpenAI extraction error:', error);
        return {
            success: false,
            snippets: [],
            error: error.message
        };
    }
}

/**
 * Prepare scraped content for OpenAI analysis
 *
 * @param {Array} scrapedItems - Array of page data from scraper
 * @returns {string} Formatted content ready for OpenAI
 */
function prepareContentForAnalysis(scrapedItems) {
    const contentParts = [];
    let totalChars = 0;
    const maxChars = 8000; // Leave room for prompt + response

    for (const page of scrapedItems) {
        // Add page title
        if (page.title) {
            contentParts.push(`PAGE TITLE: ${page.title}`);
            totalChars += page.title.length + 20;
        }

        // Add headings
        if (page.headings && page.headings.length > 0) {
            const headingsText = 'HEADINGS: ' + page.headings.slice(0, 10).join(' | ');
            contentParts.push(headingsText);
            totalChars += headingsText.length;
        }

        // Add lists (often contain key features/services)
        if (page.lists && page.lists.length > 0) {
            const listsText = 'KEY POINTS: ' + page.lists.slice(0, 15).join(' | ');
            contentParts.push(listsText);
            totalChars += listsText.length;
        }

        // Add paragraphs (sample them)
        if (page.paragraphs && page.paragraphs.length > 0) {
            for (const para of page.paragraphs.slice(0, 5)) {
                if (totalChars + para.length > maxChars) {
                    break;
                }
                contentParts.push(`CONTENT: ${para}`);
                totalChars += para.length + 10;
            }
        }

        // Break if we've collected enough content
        if (totalChars >= maxChars) {
            break;
        }
    }

    return contentParts.join('\n\n');
}

/**
 * Format snippets as a numbered list string
 *
 * @param {Array} snippets - Array of snippet strings
 * @returns {string} Formatted as "1. Snippet one\n2. Snippet two\n..."
 */
export function formatSnippetsAsNumberedList(snippets) {
    return snippets.map((snippet, i) => `${i + 1}. ${snippet}`).join('\n');
}
