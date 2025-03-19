import express from 'express';
import { searchEmails } from '../services/searchService.js';

const router = express.Router();

// API Endpoint: Search Emails
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query parameter is required' });
    }

    const results = await searchEmails(query);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;