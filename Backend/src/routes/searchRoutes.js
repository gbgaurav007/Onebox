import express from 'express';
import { searchEmails } from '../services/searchService.js';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const results = await searchEmails({
      query: req.query.q,
      category: req.query.category,
      folder: req.query.folder,
      account: req.query.account
    });

    res.json({
      success: true,
      count: results.length,
      results: results.map(r => ({
        id: r.id,
        subject: r.subject,
        from: r.from,
        date: r.date,
        snippet: r.text?.substring(0, 200) || ''
      }))
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

export default router;