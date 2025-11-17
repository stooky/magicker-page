/**
 * Botpress Action: Save Lead to Magic Page Database
 *
 * This action sends captured lead data back to Magic Page API
 * Place this file in your bot's actions folder
 */

const axios = require('axios');

/**
 * @title Save Lead to Magic Page
 * @category Custom
 * @author Magic Page Team
 */
const saveLeadToMagicPage = async () => {
  const magicPageDomain = process.env.MAGIC_PAGE_DOMAIN || 'localhost:3000';
  const webhookUrl = `http://${magicPageDomain}/api/botpress/webhook`;

  const leadData = {
    type: 'custom',
    payload: {
      action: 'save_lead',
      data: {
        sessionID: session.magicPageSessionID,
        email: session.email,
        website: session.website,
        company: session.company,
        name: session.name,
        interest: session.interest,
        leadData: {
          name: session.name,
          email: session.email,
          company: session.company,
          website: session.website,
          interest: session.interest,
          capturedAt: new Date().toISOString()
        }
      }
    }
  };

  try {
    const response = await axios.post(webhookUrl, leadData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Botpress-Signature': process.env.BOTPRESS_WEBHOOK_SECRET || ''
      }
    });

    console.log('Lead saved to Magic Page:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error saving lead to Magic Page:', error.message);
    throw error;
  }
};

return saveLeadToMagicPage();
