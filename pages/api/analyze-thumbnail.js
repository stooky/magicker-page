/**
 * Analyze Thumbnail API
 *
 * Uses OpenAI Vision to analyze a website thumbnail and generate:
 * - A cute avatar name
 * - Avatar characteristics for Dicebear
 * - Primary and secondary colors based on the website's design
 *
 * POST /api/analyze-thumbnail
 * Body: { thumbnailBase64: "data:image/png;base64,..." }
 *
 * Returns: { success: true, theme: { name, avatar, primaryColor, secondaryColor } }
 */

import OpenAI from 'openai';

// Increase body size limit for base64 images (default is 1MB)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

// Default fallback theme (Marv, blue, super happy smiley)
const DEFAULT_THEME = {
    name: 'Marv',
    avatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=marv&backgroundColor=b6e3f4&eyes=happy&mouth=smile01',
    primaryColor: '#2563eb', // Blue
    secondaryColor: '#1e40af',
    description: 'Your friendly assistant'
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { thumbnailBase64 } = req.body;

    if (!thumbnailBase64) {
        console.log('[ANALYZE] No thumbnail provided, using default theme');
        return res.status(200).json({ success: true, theme: DEFAULT_THEME, source: 'default' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('[ANALYZE] OpenAI API key not configured');
        return res.status(200).json({ success: true, theme: DEFAULT_THEME, source: 'default' });
    }

    try {
        const openai = new OpenAI({ apiKey });

        console.log('[ANALYZE] Sending thumbnail to OpenAI Vision...');

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a brand analyst. Analyze website screenshots to extract branding information.

You must respond with ONLY a valid JSON object (no markdown, no backticks, no explanation).

The JSON must have this exact structure:
{
    "name": "A cute, friendly 4-8 letter name for an AI assistant that fits the website's vibe",
    "avatarSeed": "A single descriptive word for the avatar (like: sunny, nova, pixel, spark, cozy)",
    "primaryColor": "#XXXXXX hex color - the dominant brand color from the website",
    "secondaryColor": "#XXXXXX hex color - a complementary accent color",
    "backgroundColor": "#XXXXXX hex color - a light pastel version of the primary for avatar background",
    "description": "A short 3-5 word tagline like 'Your helpful assistant'"
}

Guidelines for colors:
- Extract the actual dominant colors from the website's logo, header, or buttons
- primaryColor should be the main brand color (avoid pure white/black)
- secondaryColor should complement the primary
- backgroundColor should be a very light/pastel version suitable for avatar backgrounds

Guidelines for name:
- Short, friendly, memorable (4-8 letters)
- Should match the website's tone (professional, playful, technical, warm, etc.)
- Examples: Luna, Buddy, Scout, Sage, Pixel, Nova, Ember, Chip

Guidelines for avatar:
- The avatar should ALWAYS be super happy and friendly
- Use words like: happy, cheerful, sunny, bright, joyful, beaming
- The avatarSeed should evoke happiness and warmth`
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Analyze this website screenshot and provide the branding information as JSON.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: thumbnailBase64,
                                detail: 'low' // Use low detail to save tokens
                            }
                        }
                    ]
                }
            ],
            max_tokens: 300,
            temperature: 0.7
        });

        const content = response.choices[0]?.message?.content;
        console.log('[ANALYZE] OpenAI response:', content);

        if (!content) {
            console.error('[ANALYZE] Empty response from OpenAI');
            return res.status(200).json({ success: true, theme: DEFAULT_THEME, source: 'default' });
        }

        // Parse the JSON response
        let parsed;
        try {
            // Remove any markdown code blocks if present
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error('[ANALYZE] Failed to parse OpenAI response:', parseError.message);
            console.error('[ANALYZE] Raw content:', content);
            return res.status(200).json({ success: true, theme: DEFAULT_THEME, source: 'default' });
        }

        // Validate and build theme
        // Always use happy eyes for a super friendly avatar
        const theme = {
            name: parsed.name || DEFAULT_THEME.name,
            avatar: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(parsed.avatarSeed || parsed.name || 'marv')}&backgroundColor=${encodeURIComponent((parsed.backgroundColor || '#b6e3f4').replace('#', ''))}&eyes=happy&mouth=smile01`,
            primaryColor: isValidHex(parsed.primaryColor) ? parsed.primaryColor : DEFAULT_THEME.primaryColor,
            secondaryColor: isValidHex(parsed.secondaryColor) ? parsed.secondaryColor : DEFAULT_THEME.secondaryColor,
            description: parsed.description || DEFAULT_THEME.description
        };

        console.log('[ANALYZE] Generated theme:', theme);

        return res.status(200).json({
            success: true,
            theme,
            source: 'ai',
            raw: parsed
        });

    } catch (error) {
        console.error('[ANALYZE] Error analyzing thumbnail:', error.message);
        return res.status(200).json({ success: true, theme: DEFAULT_THEME, source: 'default' });
    }
}

/**
 * Validate hex color format
 */
function isValidHex(color) {
    if (!color || typeof color !== 'string') return false;
    return /^#[0-9A-Fa-f]{6}$/.test(color);
}
