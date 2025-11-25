/**
 * OpenAI-powered content extraction
 * Analyzes scraped content and extracts the most meaningful and interesting snippets
 * Also generates structured FAQ content for Knowledge Base (optimized for fast indexing)
 */
import OpenAI from 'openai';

// Maximum KB content size for fast Botpress indexing (demo purposes)
const MAX_KB_CONTENT_SIZE = 4000; // ~4KB keeps indexing fast

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

/**
 * Generate structured FAQ content for Knowledge Base
 * Creates a compact, structured FAQ optimized for chatbot retrieval
 * Focuses on: business name, domain, contact info, products/services, key facts
 *
 * @param {Array} scrapedItems - Array of scraped page data
 * @param {string} url - The website URL being analyzed
 * @param {string} domain - The domain name
 * @returns {Promise<Object>} FAQ generation results
 */
export async function generateKnowledgeBaseFAQ(scrapedItems, url, domain) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.warn('[FAQ-GEN] OPENAI_API_KEY not set, using fallback content');
        return {
            success: false,
            faqContent: createFallbackFAQ(scrapedItems, url, domain),
            error: 'OpenAI API key not configured'
        };
    }

    try {
        // Prepare content for analysis
        const contentSummary = prepareContentForAnalysis(scrapedItems);

        if (!contentSummary) {
            return {
                success: false,
                faqContent: createFallbackFAQ(scrapedItems, url, domain),
                error: 'No content available for analysis'
            };
        }

        console.log(`[FAQ-GEN] Generating structured FAQ for ${domain}...`);
        console.log(`[FAQ-GEN] Input content: ${contentSummary.length} characters`);

        // Initialize OpenAI client
        const openai = new OpenAI({ apiKey });

        const prompt = `Analyze this website content and create a structured FAQ document for a chatbot knowledge base.

WEBSITE: ${url}
DOMAIN: ${domain}

CONTENT:
${contentSummary}

Create a structured FAQ with the following sections. Extract ONLY information found in the content - do not make up details. If information is not available, write "Not specified on website".

FORMAT (use exactly this structure):

=== BUSINESS INFORMATION ===
Business Name: [Extract from content]
Website: ${url}
Domain: ${domain}

=== CONTACT INFORMATION ===
Phone: [Extract if found]
Email: [Extract if found]
Address: [Extract if found]
Hours: [Extract if found]

=== ABOUT THE BUSINESS ===
[2-3 sentences describing what this business does]

=== PRODUCTS & SERVICES ===
[List the main products or services offered, one per line with bullet points]

=== KEY FEATURES & BENEFITS ===
[List 3-5 key selling points or unique features]

=== FREQUENTLY ASKED QUESTIONS ===
Q: What does ${domain} do?
A: [Brief answer based on content]

Q: What services/products does ${domain} offer?
A: [Brief answer listing main offerings]

Q: How can I contact ${domain}?
A: [Contact info if available, otherwise "Visit ${url} for contact details"]

Keep the total response under ${MAX_KB_CONTENT_SIZE} characters. Be concise but informative.`;

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at creating structured FAQ documents for chatbot knowledge bases. Extract factual information only - never invent details. Keep responses concise and well-organized.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2,
            max_tokens: 1500
        });

        const faqContent = response.choices[0].message.content.trim();
        console.log(`[FAQ-GEN] ✅ FAQ generated: ${faqContent.length} characters`);

        // Ensure we're under the size limit
        const truncatedContent = faqContent.length > MAX_KB_CONTENT_SIZE
            ? faqContent.substring(0, MAX_KB_CONTENT_SIZE) + '\n\n[Content truncated for optimization]'
            : faqContent;

        return {
            success: true,
            faqContent: truncatedContent,
            originalLength: faqContent.length,
            error: null
        };

    } catch (error) {
        console.error('[FAQ-GEN] Error generating FAQ:', error);
        return {
            success: false,
            faqContent: createFallbackFAQ(scrapedItems, url, domain),
            error: error.message
        };
    }
}

/**
 * Create fallback FAQ when OpenAI is unavailable
 */
function createFallbackFAQ(scrapedItems, url, domain) {
    const parts = [];

    parts.push('=== BUSINESS INFORMATION ===');
    parts.push(`Website: ${url}`);
    parts.push(`Domain: ${domain}`);
    parts.push('');

    // Extract title if available
    if (scrapedItems && scrapedItems.length > 0) {
        const firstPage = scrapedItems[0];
        if (firstPage.title) {
            parts.push(`Business Name: ${firstPage.title}`);
        }

        parts.push('');
        parts.push('=== ABOUT THE BUSINESS ===');

        // Add first paragraph if available
        if (firstPage.paragraphs && firstPage.paragraphs.length > 0) {
            parts.push(firstPage.paragraphs[0].substring(0, 500));
        }

        parts.push('');
        parts.push('=== KEY INFORMATION ===');

        // Add headings as key info
        if (firstPage.headings && firstPage.headings.length > 0) {
            firstPage.headings.slice(0, 10).forEach(h => {
                parts.push(`- ${h}`);
            });
        }
    }

    const content = parts.join('\n');
    return content.substring(0, MAX_KB_CONTENT_SIZE);
}
