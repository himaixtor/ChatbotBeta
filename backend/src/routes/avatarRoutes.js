/**
 * Avatar Routes
 * Endpoints for D-ID avatar WebRTC streaming
 */

const express = require('express');
const avatarController = require('../controllers/avatarController');

const router = express.Router();

// Create new WebRTC stream
router.post('/stream', avatarController.createStream);

// Send SDP Answer
router.post('/sdp', avatarController.sendSdp);

// Send ICE Candidate
router.post('/ice', avatarController.sendIce);

// Send talk/TTS request
router.post('/talk', avatarController.sendTalk);

// Close stream
router.post('/close', avatarController.closeStream);

module.exports = router;
