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
  // console.log('Fetched emails:', emails.length);

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
    if (!content || content.trim() === '') {
      console.warn('⚠️ Empty email content, using fallback categorization.');
      return fallbackCategorization(content);
    }

    const text = content.slice(0, 2000); // Limit content to 2000 chars

    // console.log(`🤖 AI Categorization Input:\n${text}`);

    const response = await hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: text,
      parameters: {
        candidate_labels: CATEGORIES,
        multi_label: false
      }
    });

    // console.log(`🤖 AI Categorization Response:\n`, response);

    // ✅ Ensure response is valid before accessing properties
    if (!response || !response.labels || !response.scores || response.labels.length === 0) {
      console.warn('⚠️ AI response is invalid, using fallback categorization.');
      return fallbackCategorization(content);
    }

    // ✅ Select the best-scoring category
    const bestIndex = response.scores.indexOf(Math.max(...response.scores));
    const bestMatch = response.labels[bestIndex];
    const bestScore = response.scores[bestIndex];

    // console.log(`🏆 Best AI Category: ${bestMatch} (Score: ${bestScore})`);

    // ✅ Ensure a minimum confidence threshold
    return bestScore > 0.2 ? bestMatch : fallbackCategorization(content);

  } catch (error) {
    console.error('❌ AI Categorization Error:', error.message);
    return fallbackCategorization(content);
  }
}

function fallbackCategorization(content = '') {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('meeting') || lowerContent.includes('schedule') || lowerContent.includes('call')) {
    return 'Meeting Booked';
  }
  if (lowerContent.includes('not interested') || lowerContent.includes('unsubscribe')) {
    return 'Not Interested';
  }
  if (lowerContent.includes('spam') || lowerContent.includes('advertisement')) {
    return 'Spam';
  }
  if (lowerContent.includes('out of office') || lowerContent.includes('vacation') || lowerContent.includes('OOO')) {
    return 'Out of Office';
  }
  if (lowerContent.includes('job') || lowerContent.includes('offer') || lowerContent.includes('opportunity')) {
    return 'Interested';
  }

  return 'Uncategorized';
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