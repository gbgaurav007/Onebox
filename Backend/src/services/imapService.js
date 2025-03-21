import Imap from 'imap-simple';
import { imapAccounts } from '../config/imapConfig.js';
import { simpleParser } from 'mailparser';
import { indexEmail } from '../services/searchService.js';


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
        const parsed = await parseEmail(msg);
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
    const parsed = await simpleParser(email.parts.find(p => p.which === 'TEXT').body);
    return {
      messageId: parsed.messageId,
      subject: parsed.subject,
      from: parsed.from?.value[0]?.address,
      to: parsed.to?.value[0]?.address,
      date: parsed.date?.toISOString(),
      text: parsed.text,
      html: parsed.html
    };
  } catch (error) {
    console.error('📧 Parsing failed:', error.message);
    return {};
  }
}
// Start IMAP listeners
async function startIMAPSync() {
  for (const account of imapAccounts) {
    await connectAccount(account);
  }
}

export { startIMAPSync };