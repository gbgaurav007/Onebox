import Imap from 'imap-simple';
import { imapAccounts } from '../config/imapConfig.js';
import MailParser from 'mailparser';

const connections = {}; // Store active IMAP connections

async function connectIMAP(account) {
  try {
    const connection = await Imap.connect({ imap: account });
    await connection.openBox('INBOX');

    console.log(`✅ Connected to IMAP: ${account.user}`);

    // Handle new incoming emails in real-time (IDLE mode)
    connection.on('mail', async (numNewMsgs) => {
      console.log(`📩 New Email(s) received (${numNewMsgs}) for ${account.user}`);
      fetchLatestEmails(connection);
    });

    connections[account.user] = connection;
  } catch (error) {
    console.error(`❌ IMAP connection failed for ${account.user}:`, error.message);
  }
}

// Fetch last 30 days emails
async function fetchLatestEmails(connection) {
  const searchCriteria = [['SINCE', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]];
  const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true };

  const emails = await connection.search(searchCriteria, fetchOptions);

  for (const email of emails) {
    const parsed = await parseEmail(email.body);
    console.log(`📨 Processed Email: ${parsed.subject}`);
  }
}

// Parse email content
async function parseEmail(email) {
  const parser = new MailParser.MailParser();
  parser.write(email.parts.find((part) => part.which === 'TEXT')?.body || '');
  parser.end();

  return new Promise((resolve) => {
    parser.on('end', (mail) => resolve(mail));
  });
}

// Start IMAP listeners
async function startIMAPSync() {
  for (const account of imapAccounts) {
    await connectIMAP(account);
  }
}

export { startIMAPSync };