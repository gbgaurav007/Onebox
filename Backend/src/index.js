import dotenv from 'dotenv';
import express from 'express';
import emailRoutes from './routes/emailRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import { startIMAPSync } from './services/imapService.js';
import { createEmailIndex } from './services/searchService.js';

dotenv.config();
const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/emails', emailRoutes);
app.use('/api/search', searchRoutes);

// Start IMAP sync & create Elasticsearch index
createEmailIndex();
startIMAPSync();

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));