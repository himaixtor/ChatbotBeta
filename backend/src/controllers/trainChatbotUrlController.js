const prisma = require('../utils/prisma');
const axios = require('axios');
const { log } = require('../utils/logger');

const INGEST_API_URL = process.env.INGEST_API_URL || 'http://localhost:8010';

// List all trained URLs
async function listUrls(req, res, next) {
  try {
    const urls = await prisma.trainChatbotWithUrl.findMany({
      orderBy: { trained_date: 'desc' },
    });

    res.json({
      success: true,
      data: urls,
      count: urls.length,
    });
  } catch (error) {
    next(error);
  }
}

// Ingest URLs
async function ingestUrls(req, res, next) {
  try {
    const { urls, pageNames } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    if (urls.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 URLs allowed' });
    }

    // Validate URLs
    const validUrls = urls.filter((url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return res.status(400).json({ error: 'No valid URLs provided' });
    }

    // Call ingest API
    let ingestResponse;
    try {
      ingestResponse = await axios.post(
        `${INGEST_API_URL}/api/v1/ingest/url`,
        {
          urls: validUrls,
          collection_name: 'ksolar',
          embedding_provider: 'openai',
          embedding_model: 'text-embedding-3-small',
          chunking: {
            strategy: 'sentence',
            chunk_size: 512,
            chunk_overlap: 50,
          },
          metadata: {
            source: 'kirloskar_website',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
        }
      );
    } catch (ingestError) {
      log(`Ingest URL API error: ${ingestError.message}`);
      return res.status(500).json({
        error: 'Failed to ingest URLs',
        details: ingestError.response?.data || ingestError.message,
      });
    }

    const ingestDataArray = ingestResponse.data || [];

    // Store in database
    const createdUrls = [];
    for (let i = 0; i < validUrls.length; i++) {
      const ingestData = ingestDataArray[i];
      const pageName = pageNames?.[i] || new URL(validUrls[i]).hostname;

      if (ingestData?.success) {
        const urlEntry = await prisma.trainChatbotWithUrl.create({
          data: {
            page_name: pageName,
            url: validUrls[i],
            ai_response_id: ingestData.document_id,
            is_active: true,
          },
        });
        createdUrls.push(urlEntry);
      }
    }

    res.status(201).json({
      success: true,
      urls: createdUrls,
      ingestData: ingestDataArray,
    });
  } catch (error) {
    next(error);
  }
}

// Revert/Delete a URL
async function revertUrl(req, res, next) {
  try {
    const { urlId } = req.params;

    const urlEntry = await prisma.trainChatbotWithUrl.findUnique({
      where: { id: urlId },
    });

    if (!urlEntry) {
      return res.status(404).json({ error: 'URL not found' });
    }

    // Call delete API if URL has ai_response_id
    if (urlEntry.ai_response_id) {
      try {
        await axios.delete(
          `${INGEST_API_URL}/api/v1/documents/${urlEntry.ai_response_id}`,
          {
            params: { collection_name: 'ksolar' }
          }
        );
      } catch (deleteError) {
        log(`Delete from ingest API failed: ${deleteError.message}`);
        // Continue anyway - mark as reverted in DB
      }
    }

    // Mark as inactive in database
    const updated = await prisma.trainChatbotWithUrl.update({
      where: { id: urlId },
      data: { is_active: false },
    });

    res.json({
      success: true,
      message: 'URL reverted from AI training',
      url: updated,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUrls,
  ingestUrls,
  revertUrl,
};
