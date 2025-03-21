import { Client } from '@elastic/elasticsearch';
import { categorizeEmail,sendSlackNotification ,triggerWebhook } from './emailService.js';
import dotenv from 'dotenv';


const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    apiKey: process.env.ELASTICSEARCH_API,
  },
  tls: {
    rejectUnauthorized: false
  }
});


export async function createEmailIndex() {
    try {
      console.log('🔍 Checking if Elasticsearch index exists...');
  
      const exists = await esClient.indices.exists({ index: 'emails' });

      if (!exists) {
        console.log('🔄 Creating Elasticsearch email index...');
        await esClient.indices.create({
          index: 'emails',
          body: {
            settings: {
              index: {
                number_of_shards: 1,
                number_of_replicas: 1,
              },
            },
            mappings: {
              properties: {
                subject: { type: 'text' },
                from: { type: 'keyword' },
                to: { type: 'keyword' },
                date: { type: 'text' },
                content: { type: 'text' },
                text: { type: 'text' },
                html: { type: 'text' },
                folder: { type: 'keyword' },
                category: {
                    type: 'keyword',
                    fields: {
                      analyzed: { type: 'text' }
                    }
                  }
              },
            },
          },
        });
        console.log('✅ Elasticsearch email index created.');
      } else {
        console.log('✅ Elasticsearch email index already exists.');
      }
    } catch (error) {
      console.error('❌ Elasticsearch index creation error:', error.meta?.body?.error?.reason || error);
    }
  }

// Store an email in Elasticsearch
export async function indexEmail(email) {
    try {
      console.log(`📨 Attempting to index email: ${email.subject}`);
      // AI categorization
      const emailContent = [email.text, email.html].filter(Boolean).join('\n');
     // In your indexEmail function
     const category = await categorizeEmail(emailContent);
  
  
      const response = await esClient.index({
        index: 'emails',
        body: {
          subject: email.subject,
          from: email.from,
          to: email.to,
          date: email.date,
          content: email.content,
          category: category, // ✅ Store AI category
        },
      });
  
      console.log(`📨 Indexed Email: ${email.subject} (Category: ${category})`, response);

      if (category === "Meeting Booked") {

          await sendSlackNotification({
            from: email.from || "Unknown",
            subject: email.subject || "No Subject",
            text: email.text || email.html || "No Content Available",
          });
    
          await triggerWebhook({
            from: email.from || "Unknown",
            subject: email.subject || "No Subject",
            text: email.text || email.html || "No Content Available",
          });
      }
    } catch (error) {
      console.error('❌ Error indexing email:', error);
    }
  }

// Search emails in Elasticsearch
export async function searchEmails(query, category) {
  try {
    const searchQuery = {
      bool: {
        must: [],
      },
    };

    if (query) {
      searchQuery.bool.must.push({ match: { content: query } });
    }
    if (category) {
      searchQuery.bool.must.push({ match: { category } });
    }

    const result = await esClient.search({
      index: 'emails',
      body: {
        query: searchQuery,
      },
    });

    return result.body.hits.hits;
  } catch (error) {
    console.error('❌ Error searching emails:', error);
    return [];
  }
}


