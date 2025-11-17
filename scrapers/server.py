"""
Flask server to expose scraping service as HTTP API
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from scraper_orchestrator import scrape_website

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js to call this service


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'scraper'}), 200


@app.route('/scrape', methods=['POST'])
def scrape():
    """
    Scrape a website using Scrapy/Playwright orchestration

    Expected POST body:
    {
        "url": "https://example.com"
    }

    Returns:
    {
        "status": "success" | "error",
        "message": "1. Item one\n2. Item two\n...",
        "method_used": "scrapy" | "playwright",
        "pages_found": 5
    }
    """
    try:
        # Get URL from request
        data = request.get_json()
        url = data.get('url')

        if not url:
            return jsonify({
                'status': 'error',
                'message': '1. URL parameter is required',
                'error_details': 'Missing URL in request body'
            }), 400

        # Validate URL format
        if not url.startswith(('http://', 'https://')):
            url = f'http://{url}'

        logger.info(f"Received scrape request for: {url}")

        # Perform scraping
        result = scrape_website(url)

        # Return results
        status_code = 200 if result['status'] == 'success' else 500
        return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Error in scrape endpoint: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': '1. Internal server error occurred while scraping',
            'error_details': str(e)
        }), 500


if __name__ == '__main__':
    import os

    port = int(os.environ.get('SCRAPER_PORT', 5001))
    debug = os.environ.get('FLASK_ENV') == 'development'

    logger.info(f"Starting scraper service on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=debug)
