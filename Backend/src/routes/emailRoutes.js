import express from 'express';
import { syncEmails } from '../services/emailService.js';

const router = express.Router();

// API Endpoint: Sync Emails
router.get('/sync', async (req, res) => {
  try {
    const result = await syncEmails();
    res.json({ success: true, message: 'Emails synchronized!', data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;