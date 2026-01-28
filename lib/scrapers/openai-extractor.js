/**
 * OpenAI-powered content extraction
 * Analyzes scraped content and extracts the most meaningful and interesting snippets
 * Also generates structured FAQ content for Knowledge Base (optimized for fast indexing)
 */
import { getOpenAIClient, isOpenAIConfigured } from '../openaiClient';

// Maximum KB content size (50KB limit for comprehensive content)
const MAX_KB_CONTENT_SIZE = 50000; // ~50KB for thorough business info

/**
 * Extract meaningful snippets using OpenAI
 *
 * @param {Array} scrapedItems - Array of scraped page data
 * @param {string} url - The website URL being analyzed
 * @param {number} maxSnippets - Maximum number of snippets to extract (default: 10)
 * @returns {Promise<Object>} Extraction results
 */
export async function extractMeaningfulSnippets(scrapedItems, url, maxSnippets = 10, precomputedContent = null) {
    const openai = getOpenAIClient();

    if (!openai) {
        console.warn('OPENAI_API_KEY not set, skipping OpenAI extraction');
        return {
            success: false,
            snippets: [],
            error: 'OpenAI API key not configured'
        };
    }

    try {
        // Use precomputed content if provided, otherwise compute it
        const contentSummary = precomputedContent || prepareContentForAnalysis(scrapedItems);

        if (!contentSummary) {
            return {
                success: false,
                snippets: [],
                error: 'No content available for analysis'
            };
        }

        console.log(`Sending ${contentSummary.length} characters to OpenAI for analysis...`);

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
 * Extract contact information from text using regex patterns
 * Triple-checks by looking in multiple places and formats
 *
 * @param {Array} scrapedItems - Array of page data from scraper
 * @returns {Object} Extracted contact info
 */
function extractContactInfo(scrapedItems) {
    const contact = {
        phones: new Set(),
        emails: new Set(),
        addresses: [],
        hours: []
    };

    // Regex patterns for contact info
    const phonePatterns = [
        /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,  // Standard formats
        /\b[0-9]{3}[-.\s][0-9]{3}[-.\s][0-9]{4}\b/g,  // xxx-xxx-xxxx
        /\b\([0-9]{3}\)\s?[0-9]{3}[-.\s]?[0-9]{4}\b/g,  // (xxx) xxx-xxxx
        /toll[\s-]?free[:\s]*[0-9\-\.\s\(\)]+/gi,  // Toll free numbers
    ];

    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const addressPattern = /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct|place|pl)[\s,]+[\w\s]+,?\s*(?:[A-Z]{2}|[a-zA-Z]+)[\s,]*(?:\d{5}(?:-\d{4})?|[A-Z]\d[A-Z]\s?\d[A-Z]\d)?/gi;
    const hoursPattern = /(?:hours|open|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)[\s:]+(?:[0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm|AM|PM)?[\s\-–to]+[0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm|AM|PM)?|closed)/gi;

    // Search through all scraped content
    for (const page of scrapedItems) {
        const allText = [
            page.title || '',
            ...(page.headings || []),
            ...(page.paragraphs || []),
            ...(page.lists || [])
        ].join(' ');

        // Extract phones (triple check with all patterns)
        for (const pattern of phonePatterns) {
            const matches = allText.match(pattern);
            if (matches) {
                matches.forEach(m => contact.phones.add(m.trim()));
            }
        }

        // Extract emails
        const emails = allText.match(emailPattern);
        if (emails) {
            emails.forEach(e => contact.emails.add(e.toLowerCase()));
        }

        // Extract addresses
        const addresses = allText.match(addressPattern);
        if (addresses) {
            addresses.forEach(a => {
                if (!contact.addresses.includes(a.trim())) {
                    contact.addresses.push(a.trim());
                }
            });
        }

        // Extract hours
        const hours = allText.match(hoursPattern);
        if (hours) {
            hours.forEach(h => {
                if (!contact.hours.includes(h.trim())) {
                    contact.hours.push(h.trim());
                }
            });
        }
    }

    return {
        phones: Array.from(contact.phones),
        emails: Array.from(contact.emails),
        addresses: contact.addresses.slice(0, 3),
        hours: contact.hours.slice(0, 5)
    };
}

/**
 * Prepare scraped content for OpenAI analysis
 * Exported so orchestrator can pre-compute once and pass to both functions
 *
 * @param {Array} scrapedItems - Array of page data from scraper
 * @returns {string} Formatted content ready for OpenAI
 */
export function prepareContentForAnalysis(scrapedItems) {
    const contentParts = [];
    let totalChars = 0;
    const maxChars = 12000; // Increased for more thorough analysis

    for (const page of scrapedItems) {
        // Add page title
        if (page.title) {
            contentParts.push(`PAGE TITLE: ${page.title}`);
            totalChars += page.title.length + 20;
        }

        // Add headings
        if (page.headings && page.headings.length > 0) {
            const headingsText = 'HEADINGS: ' + page.headings.slice(0, 15).join(' | ');
            contentParts.push(headingsText);
            totalChars += headingsText.length;
        }

        // Add lists (often contain key features/services)
        if (page.lists && page.lists.length > 0) {
            const listsText = 'KEY POINTS: ' + page.lists.slice(0, 20).join(' | ');
            contentParts.push(listsText);
            totalChars += listsText.length;
        }

        // Add paragraphs (more of them for thorough content)
        if (page.paragraphs && page.paragraphs.length > 0) {
            for (const para of page.paragraphs.slice(0, 10)) {
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
export async function generateKnowledgeBaseFAQ(scrapedItems, url, domain, precomputedContent = null) {
    // Pre-extract contact info using regex (triple-check method)
    const extractedContact = extractContactInfo(scrapedItems);
    console.log('[FAQ-GEN] Pre-extracted contact info:', JSON.stringify(extractedContact));

    const openai = getOpenAIClient();
    if (!openai) {
        console.warn('[FAQ-GEN] OPENAI_API_KEY not set, using fallback content');
        return {
            success: false,
            faqContent: createFallbackFAQ(scrapedItems, url, domain, extractedContact),
            error: 'OpenAI API key not configured'
        };
    }

    try {
        // Use precomputed content if provided, otherwise compute it
        const contentSummary = precomputedContent || prepareContentForAnalysis(scrapedItems);

        if (!contentSummary) {
            return {
                success: false,
                faqContent: createFallbackFAQ(scrapedItems, url, domain, extractedContact),
                error: 'No content available for analysis'
            };
        }

        console.log(`[FAQ-GEN] Generating structured FAQ for ${domain}...`);
        console.log(`[FAQ-GEN] Input content: ${contentSummary.length} characters`);
        console.log(`[FAQ-GEN] Pages scraped: ${scrapedItems.length}`);

        // Build pre-extracted contact section
        const preExtractedInfo = `
PRE-EXTRACTED CONTACT INFO (verified by regex - use these if found):
- Phone numbers found: ${extractedContact.phones.length > 0 ? extractedContact.phones.join(', ') : 'None detected'}
- Email addresses found: ${extractedContact.emails.length > 0 ? extractedContact.emails.join(', ') : 'None detected'}
- Addresses found: ${extractedContact.addresses.length > 0 ? extractedContact.addresses.join('; ') : 'None detected'}
- Hours found: ${extractedContact.hours.length > 0 ? extractedContact.hours.join('; ') : 'None detected'}
`;

        const prompt = `Analyze this website content and create a comprehensive FAQ document for a chatbot knowledge base.

WEBSITE: ${url}
DOMAIN: ${domain}
PAGES SCRAPED: ${scrapedItems.length}

${preExtractedInfo}

WEBSITE CONTENT:
${contentSummary}

CRITICAL INSTRUCTIONS:
1. TRIPLE-CHECK for contact information - every business website should have phone, email, or address
2. Look in headers, footers, "Contact Us" sections, and within paragraph text
3. Use the pre-extracted contact info above if available
4. If contact info is truly not found, explicitly state "Contact information not found on scraped pages - please visit website directly"

Create a structured FAQ with ALL the following sections:

=== BUSINESS INFORMATION ===
Business Name: [Extract from content - look in title, headers, logo text]
Website: ${url}
Domain: ${domain}

=== CONTACT INFORMATION ===
Phone: [MUST extract if exists - check pre-extracted info above]
Email: [MUST extract if exists - check pre-extracted info above]
Address: [MUST extract if exists - check pre-extracted info above]
Hours: [Extract if found]
Service Areas: [Extract if mentioned]

=== ABOUT THE BUSINESS ===
[3-5 sentences describing what this business does, their mission, and history if available]

=== PRODUCTS & SERVICES ===
[List ALL products or services mentioned, one per line with bullet points. Be thorough.]

=== KEY FEATURES & BENEFITS ===
[List 5-10 key selling points, unique features, or competitive advantages]

=== CERTIFICATIONS & CREDENTIALS ===
[List any licenses, certifications, awards, or affiliations mentioned]

=== FREQUENTLY ASKED QUESTIONS ===
Q: What does ${domain} do?
A: [Comprehensive answer based on content]

Q: What services/products does ${domain} offer?
A: [Detailed answer listing main offerings]

Q: How can I contact ${domain}?
A: [Include ALL contact methods found: phone, email, address, hours]

Q: What areas does ${domain} serve?
A: [Service areas if mentioned, otherwise state not specified]

Q: What makes ${domain} different from competitors?
A: [Key differentiators and unique selling points]

Be thorough and comprehensive. Include ALL relevant information from the scraped content.`;

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at creating comprehensive FAQ documents for chatbot knowledge bases. Your PRIMARY goal is to extract ALL contact information and business details. Triple-check for phone numbers, emails, and addresses - they are almost always present on business websites. Extract factual information only - never invent details. Be thorough and comprehensive.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2,
            max_tokens: 3000
        });

        const faqContent = response.choices[0].message.content.trim();
        console.log(`[FAQ-GEN] FAQ generated: ${faqContent.length} characters`);

        // Ensure we're under the size limit
        const truncatedContent = faqContent.length > MAX_KB_CONTENT_SIZE
            ? faqContent.substring(0, MAX_KB_CONTENT_SIZE) + '\n\n[Content truncated for optimization]'
            : faqContent;

        return {
            success: true,
            faqContent: truncatedContent,
            originalLength: faqContent.length,
            extractedContact: extractedContact,
            error: null
        };

    } catch (error) {
        console.error('[FAQ-GEN] Error generating FAQ:', error);
        return {
            success: false,
            faqContent: createFallbackFAQ(scrapedItems, url, domain, extractedContact),
            error: error.message
        };
    }
}

/**
 * Create fallback FAQ when OpenAI is unavailable
 */
function createFallbackFAQ(scrapedItems, url, domain, extractedContact = null) {
    const parts = [];

    parts.push('=== BUSINESS INFORMATION ===');
    parts.push(`Website: ${url}`);
    parts.push(`Domain: ${domain}`);

    // Extract title if available
    if (scrapedItems && scrapedItems.length > 0) {
        const firstPage = scrapedItems[0];
        if (firstPage.title) {
            parts.push(`Business Name: ${firstPage.title}`);
        }
    }

    parts.push('');
    parts.push('=== CONTACT INFORMATION ===');

    // Add pre-extracted contact info
    if (extractedContact) {
        if (extractedContact.phones.length > 0) {
            parts.push(`Phone: ${extractedContact.phones.join(', ')}`);
        }
        if (extractedContact.emails.length > 0) {
            parts.push(`Email: ${extractedContact.emails.join(', ')}`);
        }
        if (extractedContact.addresses.length > 0) {
            parts.push(`Address: ${extractedContact.addresses.join('; ')}`);
        }
        if (extractedContact.hours.length > 0) {
            parts.push(`Hours: ${extractedContact.hours.join('; ')}`);
        }
    }

    if (scrapedItems && scrapedItems.length > 0) {
        const firstPage = scrapedItems[0];

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
            firstPage.headings.slice(0, 15).forEach(h => {
                parts.push(`- ${h}`);
            });
        }

        // Add list items as services/features
        parts.push('');
        parts.push('=== PRODUCTS & SERVICES ===');
        if (firstPage.lists && firstPage.lists.length > 0) {
            firstPage.lists.slice(0, 20).forEach(item => {
                parts.push(`- ${item}`);
            });
        }
    }

    const content = parts.join('\n');
    return content.substring(0, MAX_KB_CONTENT_SIZE);
}
