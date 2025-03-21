import express from 'express';
import emailRoutes from './routes/emailRoutes.js';
import { startIMAPSync } from './services/imapService.js';
import { createEmailIndex } from './services/searchService.js';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/emails', emailRoutes);

const PORT = process.env.PORT || 8000;

// Update the startup sequence
async function initializeApp() {
    try {
      // First create index
      await createEmailIndex();
      
      // Then start IMAP sync
      await startIMAPSync();
      
      // Finally start server
      app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    } catch (error) {
      console.error('❌ Startup failed:', error);
      process.exit(1);
    }
  }
  
  initializeApp();

// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));