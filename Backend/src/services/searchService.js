import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200',
  auth: {
    username: 'elastic',
    password: 'changeme' // Only if you enabled security
  },
  tls: {
    rejectUnauthorized: false // For development only
  }
});

let bulkQueue = []; // For batch indexing

export async function createEmailIndex() {
    try {
      console.log('🔍 Checking if Elasticsearch index exists...');
  
      const exists = await esClient.indices.exists({ index: 'emails' });

      if (!exists.body) {
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
                date: { type: 'date' },
                content: { type: 'text' },
                text: { type: 'text' },
                html: { type: 'text' },
                folder: { type: 'keyword' },
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
    const response = await esClient.index({
      index: 'emails',
      body: email, // ✅ Corrected
    });

    console.log(`📨 Indexed Email: ${email.subject}`, response);
  } catch (error) {
    console.error('❌ Error indexing email:', error);
  }
}

// Search emails in Elasticsearch
export async function searchEmails(query) {
  try {
    const result = await esClient.search({
      index: 'emails',
      body: {
        query: {
          match: { content: query },
        },
      },
    });

    return result.body.hits.hits;
  } catch (error) {
    console.error('❌ Error searching emails:', error);
    return [];
  }
}