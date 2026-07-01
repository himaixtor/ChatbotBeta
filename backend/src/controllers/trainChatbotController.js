const prisma = require('../utils/prisma');
const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');
const { log } = require('../utils/logger');

const INGEST_API_URL = process.env.INGEST_API_URL || 'http://localhost:8010';

// List all trained documents
async function listDocuments(req, res, next) {
  try {
    const documents = await prisma.trainChatbot.findMany({
      orderBy: { trained_date: 'desc' },
    });

    res.json({
      success: true,
      data: documents,
      count: documents.length,
    });
  } catch (error) {
    next(error);
  }
}

// Upload and ingest a new document
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { file } = req;
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (file.size > maxSize) {
      return res.status(400).json({ error: 'File size exceeds 50MB limit' });
    }

    // Call ingest API with multipart form data
    const formData = new FormData();
    const stream = Readable.from(file.buffer);
    formData.append('files', stream, file.originalname);

    const config = {
      collection_name: 'ksolar',
      content_type: 'auto',
    };
    formData.append('config', JSON.stringify(config));

    let ingestResponse;
    try {
      ingestResponse = await axios.post(`${INGEST_API_URL}/api/v1/ingest`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
    } catch (ingestError) {
      log(`Ingest API error: ${ingestError.message}`);
      return res.status(500).json({
        error: 'Failed to ingest document',
        details: ingestError.response?.data || ingestError.message,
      });
    }

    const ingestData = ingestResponse.data?.[0];
    if (!ingestData?.success) {
      return res.status(500).json({
        error: 'Document ingestion failed',
        details: ingestData,
      });
    }

    // Store in database
    const document = await prisma.trainChatbot.create({
      data: {
        filename: file.originalname,
        file_data: file.buffer,
        ai_response_id: ingestData.document_id,
        is_active: true,
      },
    });

    res.status(201).json({
      success: true,
      document,
      ingestData,
    });
  } catch (error) {
    next(error);
  }
}

// Revert a document (mark as inactive and call delete API)
async function revertDocument(req, res, next) {
  try {
    const { documentId } = req.params;

    const document = await prisma.trainChatbot.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Call delete API if document has ai_response_id
    if (document.ai_response_id) {
      try {
        await axios.delete(`${INGEST_API_URL}/api/v1/documents/${document.ai_response_id}`, {
          params: { collection_name: 'ksolar' },
        });
      } catch (deleteError) {
        log(`Delete from ingest API failed: ${deleteError.message}`);
        // Continue anyway - mark as reverted in DB
      }
    }

    // Mark as inactive in database
    const updated = await prisma.trainChatbot.update({
      where: { id: documentId },
      data: { is_active: false },
    });

    res.json({
      success: true,
      message: 'Document reverted from AI training',
      document: updated,
    });
  } catch (error) {
    next(error);
  }
}

// Get document file for viewing
async function getDocument(req, res, next) {
  try {
    const { documentId } = req.params;

    const document = await prisma.trainChatbot.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Determine mime type from filename
    const ext = document.filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      md: 'text/markdown',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      json: 'application/json',
      html: 'text/html',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);
    res.send(document.file_data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listDocuments,
  uploadDocument,
  revertDocument,
  getDocument,
};
