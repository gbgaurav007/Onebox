import Imap from 'imap-simple';
import { imapAccounts } from '../config/imapConfig.js';
import { simpleParser } from 'mailparser';
import { indexEmail } from '../services/searchService.js';
import { json } from 'express';


const connections = new Map();

async function connectAccount(account) {
  try {
    const connection = await Imap.connect({ imap: account });
    await connection.openBox('INBOX');
    
    console.log(`✅ Connected to: ${account.user}`);
    connections.set(account.user, connection);
    
    // Initial sync
    await fetchEmails(connection, account);
    
    // Real-time updates
    connection.on('mail', async () => {
      console.log(`📩 New emails detected`);
      await fetchEmails(connection, account);
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Connection failed for ${account.user}:`, error.message);
    return false;
  }
}

async function fetchEmails(connection, account) {
  try {
    const searchCriteria = [['SINCE', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]];
    const fetchOptions = { 
      bodies: ['HEADER', 'TEXT'],
      markSeen: false,
      struct: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`📨 Processing ${messages.length} emails`);

    for (const msg of messages) {
      try {
        // console.log(`📧 Processing email: ${JSON.stringify(msg)}`);
        const parsed = await parseEmail(msg);
        if (!parsed || !parsed.subject) {
          console.warn('⚠️ Skipping email with no subject');
          continue;
        }
        await indexEmail({
          ...parsed,
          folder: 'INBOX',
          account: account.user
        });
      } catch (error) {
        console.error('❌ Failed to process email:', error.message);
      }
    }
  } catch (error) {
    console.error('📭 Fetch failed:', error.message);
  }
}



async function parseEmail(email) {
  try {

    const parsed = email?.parts[1]?.body ?? undefined;
    const text = email?.parts[0].text ?? undefined;

    const subject = parsed.subject || "No Subject";
    const from = parsed.from || "Unknown";
    const to = parsed.to || "Unknown";
    const date = parsed.date;

    // ✅ Log parsed email details for debugging
    console.log("📧 Parsed Email Details:");
    console.log("📌 Subject:", subject);
    console.log("📌 From:", from);
    console.log("📌 To:", to);
    console.log("📌 Date:", date);
    console.log("📌 Text Preview:", parsed.text?.slice(0, 100) || "No Text Content");

    return {
      messageId: parsed.messageId || "",
      subject,
      from,
      to,
      date ,
      text: text || parsed.html || "No Content Available",
      html: text ||"",
    };
  } catch (error) {
    console.error("📧 Parsing failed:", error.message);
    return null;
  }
}

// Start IMAP listeners
async function startIMAPSync() {
  for (const account of imapAccounts) {
    await connectAccount(account);
  }
}

export { startIMAPSync };