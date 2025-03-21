import { Client } from '@elastic/elasticsearch';

const esClient = new Client({ node: 'http://localhost:9200' });

async function resetElasticsearch() {
  try {
    // Delete index if exists
    const { body: exists } = await esClient.indices.exists({ index: 'emails' });
    if (exists) {
      await esClient.indices.delete({ index: 'emails' });
      console.log('🗑️ Deleted existing index');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
    
    // Create fresh index
    await esClient.indices.create({
      index: 'emails',
      body: { /* your index mapping */ }
    });
    console.log('✅ Created new index');
    
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

resetElasticsearch();