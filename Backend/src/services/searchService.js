import client from '../config/elasticsearchConfig.js';

export async function createEmailIndex() {
  try {
    console.log('🔍 Checking if Elasticsearch index exists...');

    // Fetch index details instead of using indices.exists()
    let exists;
    try {
      const response = await client.indices.get({ index: 'emails' });
      exists = !!response;
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        exists = false;
      } else {
        throw error; // Rethrow if it's not a "not found" error
      }
    }

    if (!exists) {
      console.log('🔄 Creating Elasticsearch email index...');
      await client.indices.create({
        index: 'emails',
        body: {
          mappings: {
            properties: {
              subject: { type: 'text' },
              from: { type: 'keyword' },
              to: { type: 'keyword' },
              date: { type: 'date' },
              content: { type: 'text' },
            },
          },
        },
      });
      console.log('✅ Elasticsearch email index created.');
    } else {
      console.log('✅ Elasticsearch email index already exists.');
    }
  } catch (error) {
    console.error('❌ Elasticsearch index creation error:', JSON.stringify(error, null, 2));
  }
}
// Store an email in Elasticsearch
export async function indexEmail(email) {
  await client.index({
    index: 'emails',
    body: {
        mappings: {
          properties: {
            subject: { type: 'text' },
            from: { type: 'keyword' },
            to: { type: 'keyword' },
            date: { type: 'date' },
            content: { type: 'text' },
          },
        },
      },
    });

  console.log(`📨 Indexed Email: ${email.subject}`);
}

// Search emails in Elasticsearch
export async function searchEmails(query) {
  const result = await client.search({
    index: 'emails',
    body: {
      query: {
        match: { content: query },
      },
    },
  });

  return result.body.hits.hits;
}