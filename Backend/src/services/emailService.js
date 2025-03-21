import Imap from 'imap-simple';
import { imapAccounts } from '../config/imapConfig.js';
import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

export async function syncEmails() {
  const config = imapAccounts[0];
  const connection = await Imap.connect({ imap: config });
  await connection.openBox('INBOX');

  const searchCriteria = [['SINCE', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]];
  const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true };

  const emails = await connection.search(searchCriteria, fetchOptions);

  return emails;
}


const hf = new HfInference(process.env.HF_TOKEN);


const CATEGORIES = [
  'Interested',
  'Meeting Booked',
  'Not Interested',
  'Spam',
  'Out of Office'
];

export async function categorizeEmail(content) {
  try {
    console.log('🤖 Categorizing Email:', typeof content);
    if (!content || content.trim() === '') {
      console.warn('⚠️ Empty email content, skipping categorization.');
      return 'Uncategorized';
    }

    // Limit content to 2000 chars to stay within API limits
    const text = content.slice(0, 2000);
    
    const response = await hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: text,
      parameters: {
        candidate_labels: CATEGORIES,
        multi_label: false
      }
    });
    console.log('🤖 AI Categorization:', response);

    // ✅ Check if response is valid before calling reduce()
    if (!response || !response.labels || !response.scores) {
      console.warn('⚠️ AI response is invalid, returning Uncategorized.');
      return 'Uncategorized';
    }

    // ✅ Safely get the best category with confidence threshold
    const bestMatch = response.labels.reduce((best, label, index) => {
      const score = response.scores[index] || 0;
      return score > best.score ? { label, score } : best;
    }, { label: 'Uncategorized', score: 0 });

    return bestMatch.score > 0.6 ? bestMatch.label : 'Uncategorized';
    
  } catch (error) {
    console.error('❌ AI Categorization Error:', error.message);
    return 'Uncategorized';
  }
}


import axios from 'axios';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

export async function sendSlackNotification(email) {
  try {
    // console.log("📩 Preparing Slack Notification for:", email); // Debugging log

    const message = {
      text: `📩 *New Interested Email*\n🔹 *From:* ${email.from || "Unknown"}\n🔹 *Subject:* ${email.subject || "No Subject"}\n🔹 *Preview:* ${email.text?.slice(0, 100) || "No Content Available"}`,
    };

    await axios.post(SLACK_WEBHOOK_URL, message);
    console.log("✅ Slack notification sent");
  } catch (error) {
    console.error("❌ Error sending Slack notification:", error.message);
  }
}

export async function triggerWebhook(email) {
  try {
    // console.log("🔗 Triggering Webhook for:", email); // Debugging log

    await axios.post(WEBHOOK_URL, {
      event: "New Interested Email",
      email: {
        from: email.from || "Unknown",
        subject: email.subject || "No Subject",
        preview: email.text?.slice(0, 100) || "No Content Available",
      },
    });

    console.log("✅ Webhook triggered");
  } catch (error) {
    console.error("❌ Error triggering webhook:", error.message);
  }
}