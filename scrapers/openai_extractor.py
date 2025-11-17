"""
OpenAI-powered content extraction
Analyzes scraped content and extracts the most meaningful and interesting snippets
"""
import os
import logging
from openai import OpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def extract_meaningful_snippets(scraped_items, url, max_snippets=10):
    """
    Use OpenAI to extract the most meaningful and interesting snippets from scraped content

    Args:
        scraped_items: List of scraped page data (from Scrapy or Playwright)
        url: The website URL being analyzed
        max_snippets: Maximum number of snippets to extract (default: 10)

    Returns:
        dict: {
            'success': bool,
            'snippets': list of strings,
            'error': str (if failed)
        }
    """
    api_key = os.environ.get('OPENAI_API_KEY')

    if not api_key:
        logger.warning("OPENAI_API_KEY not set, falling back to basic extraction")
        return {
            'success': False,
            'snippets': [],
            'error': 'OpenAI API key not configured'
        }

    try:
        # Prepare content for OpenAI analysis
        content_summary = prepare_content_for_analysis(scraped_items)

        if not content_summary:
            return {
                'success': False,
                'snippets': [],
                'error': 'No content available for analysis'
            }

        logger.info(f"Sending {len(content_summary)} characters to OpenAI for analysis...")

        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)

        # Create the prompt
        prompt = f"""Analyze the following website content from {url} and extract {max_snippets} of the most interesting and meaningful points about this business, product, or service.

Website Content:
{content_summary}

Instructions:
- Extract the most compelling and informative points
- Focus on what makes this business unique, their key services/products, value propositions
- Keep each point concise but informative (1-2 sentences max)
- Prioritize actionable information a potential customer would want to know
- Return ONLY the numbered list, no additional commentary
- Format: Return exactly {max_snippets} items in the format "1. Point one\\n2. Point two\\n..." etc.

Return the {max_snippets} most interesting points as a numbered list:"""

        # Call OpenAI API
        response = client.chat.completions.create(
            model=os.environ.get('OPENAI_MODEL', 'gpt-4o-mini'),  # Use gpt-4o-mini for cost efficiency
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at analyzing business websites and extracting the most compelling and meaningful information. You provide concise, informative summaries that highlight what makes a business unique and valuable."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,  # Lower temperature for more consistent, factual extraction
            max_tokens=500
        )

        # Extract the response
        extracted_text = response.choices[0].message.content.strip()
        logger.info(f"OpenAI extraction successful. Response length: {len(extracted_text)}")

        # Parse the numbered list
        snippets = []
        for line in extracted_text.split('\n'):
            line = line.strip()
            # Remove numbering and clean up
            if line and any(line.startswith(f"{i}.") for i in range(1, max_snippets + 2)):
                # Remove the number and period
                cleaned = line.split('.', 1)[1].strip() if '.' in line else line
                if cleaned:
                    snippets.append(cleaned)

        if not snippets:
            # Fallback: just split by newlines if parsing failed
            snippets = [s.strip() for s in extracted_text.split('\n') if s.strip()]

        return {
            'success': True,
            'snippets': snippets[:max_snippets],  # Ensure we don't exceed max
            'error': None
        }

    except Exception as e:
        logger.error(f"OpenAI extraction error: {str(e)}", exc_info=True)
        return {
            'success': False,
            'snippets': [],
            'error': str(e)
        }


def prepare_content_for_analysis(scraped_items):
    """
    Prepare scraped content for OpenAI analysis by combining and formatting it

    Args:
        scraped_items: List of page data from scraper

    Returns:
        str: Formatted content ready for OpenAI
    """
    content_parts = []
    total_chars = 0
    max_chars = 8000  # Leave room for prompt + response

    for page in scraped_items:
        # Add page title
        if page.get('title'):
            content_parts.append(f"PAGE TITLE: {page['title']}")
            total_chars += len(page['title']) + 20

        # Add headings
        if page.get('headings'):
            headings_text = "HEADINGS: " + " | ".join(page['headings'][:10])
            content_parts.append(headings_text)
            total_chars += len(headings_text)

        # Add lists (often contain key features/services)
        if page.get('lists'):
            lists_text = "KEY POINTS: " + " | ".join(page['lists'][:15])
            content_parts.append(lists_text)
            total_chars += len(lists_text)

        # Add paragraphs (sample them)
        if page.get('paragraphs'):
            for para in page['paragraphs'][:5]:
                if total_chars + len(para) > max_chars:
                    break
                content_parts.append(f"CONTENT: {para}")
                total_chars += len(para) + 10

        # Break if we've collected enough content
        if total_chars >= max_chars:
            break

    return '\n\n'.join(content_parts)


def format_snippets_as_numbered_list(snippets):
    """
    Format snippets as a numbered list string (for compatibility with existing frontend)

    Args:
        snippets: List of snippet strings

    Returns:
        str: Formatted as "1. Snippet one\n2. Snippet two\n..."
    """
    return '\n'.join([f"{i+1}. {snippet}" for i, snippet in enumerate(snippets)])


if __name__ == '__main__':
    # Test the extractor
    test_items = [
        {
            'url': 'https://example.com',
            'title': 'Example Business - Web Solutions',
            'headings': ['Welcome to Our Business', 'Our Services', 'About Us'],
            'paragraphs': [
                'We provide top-tier web development services for businesses of all sizes.',
                'Our team has over 10 years of experience in creating custom solutions.',
                'We specialize in e-commerce, mobile apps, and cloud infrastructure.'
            ],
            'lists': [
                'Custom Web Development',
                'Mobile App Design',
                'Cloud Infrastructure',
                'SEO Optimization'
            ]
        }
    ]

    print("Testing OpenAI extractor...")
    result = extract_meaningful_snippets(test_items, 'https://example.com')

    if result['success']:
        print(f"\nExtracted {len(result['snippets'])} snippets:")
        formatted = format_snippets_as_numbered_list(result['snippets'])
        print(formatted)
    else:
        print(f"Error: {result['error']}")
