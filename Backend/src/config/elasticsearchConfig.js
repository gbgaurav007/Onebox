import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: process.env.ELASTICSEARCH_USERNAME
    ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      }
    : undefined,
  tls: {
    rejectUnauthorized: false, // Prevent SSL issues
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // ✅ Enable compatibility mode for Elasticsearch 7.x
  apiVersion: '7.10',
});

export default client;