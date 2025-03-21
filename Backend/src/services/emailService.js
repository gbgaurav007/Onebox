import Imap from 'imap-simple';
import { imapAccounts } from '../config/imapConfig.js';
import { InferenceClient } from '@huggingface/inference';

export async function syncEmails() {
  const config = imapAccounts[0]; // Use the first IMAP account for now
  const connection = await Imap.connect({ imap: config });
  await connection.openBox('INBOX');

  // Fetch last 30 days emails
  const searchCriteria = [['SINCE', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]];
  const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true };

  const emails = await connection.search(searchCriteria, fetchOptions);
  console.log('Fetched emails:', emails.length);

  return emails;
}

const hf = new InferenceClient({ model: 'facebook/bart-large-mnli' });

export async function categorizeEmail(emailContent) {
  try {
    const categories = ['Work', 'Personal', 'Spam', 'Promotions', 'Important'];

    const response = await hf.textClassification({
      inputs: emailContent,
      parameters: { candidate_labels: categories },
    });

    const bestCategory = response[0]?.label || 'Uncategorized';
    console.log(`🔍 Email categorized as: ${bestCategory}`);
    return bestCategory;
  } catch (error) {
    console.error('❌ Error in AI categorization:', error);
    return 'Uncategorized';
  }
}