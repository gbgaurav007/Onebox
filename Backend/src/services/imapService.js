import Imap from 'imap';
import { MailParser } from 'mailparser';
import { imapAccounts } from '../config/imapConfig.js';
import { indexEmail } from '../services/searchService.js';
import dotenv from 'dotenv';

dotenv.config();

// 🔄 Maintain connections for multiple accounts
const connections = new Map();

async function connectAccount(account) {
  try {
    const imap = new Imap({
      user: account.user,
      password: account.password,
      host: account.host,
      port: account.port,
      tls: account.tls,
      tlsOptions: account.tlsOptions,
      authTimeout: account.authTimeout,
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, () => {
        console.log(`✅ Connected to: ${account.user}`);
        connections.set(account.user, imap);

        // Initial fetch
        fetchEmails(imap, account);

        // Listen for new emails
        imap.on('mail', () => {
          console.log('📩 New email detected');
          fetchEmails(imap, account);
        });
      });
    });

    imap.once('error', (err) => {
      console.error(`❌ IMAP Error for ${account.user}:`, err.message);
    });

    imap.once('end', () => {
      console.log(`🔚 Connection closed for ${account.user}`);
      connections.delete(account.user);
    });

    imap.connect();
  } catch (error) {
    console.error(`❌ Connection failed for ${account.user}:`, error.message);
  }
}

const fetchEmails = (imap, account) => {
  imap.search(['UNSEEN', ['SINCE', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]], (err, results) => {
    if (err || !results.length) {
      console.log('📭 No new unread emails.');
      return;
    }

    const fetchStream = imap.fetch(results, { bodies: ['HEADER', 'TEXT'], struct: true });

    fetchStream.on('message', (msg, seqno) => {
      console.log(`📨 Fetching email #${seqno}`);

      const mailParser = new MailParser();

      msg.on('body', (stream, info) => {
        stream.pipe(mailParser);

        mailParser.on('headers', (headers) => {
          console.log('📌 Extracted Headers:', headers.get('from'), headers.get('to'), headers.get('subject'));
        });

        mailParser.on('data', async (data) => {
          if (data.type === 'text') {
            const email = {
              subject: data.subject || 'No Subject',
              from: data.from?.value?.[0]?.address || 'Unknown',
              to: data.to?.value?.[0]?.address || 'Unknown',
              date: data.date?.toISOString() || new Date().toISOString(),
              text: data.text || 'No Text Available',
              html: data.html || '',
            };

            console.log('📧 Parsed Email:', email);
            await indexEmail(email);
          }
        });

        mailParser.on('error', (err) => console.error('📧 Parsing failed:', err.message));
      });

      msg.once('attributes', (attrs) => {
        const { uid } = attrs;
        imap.addFlags(uid, ['\\Seen'], () => {
          console.log('✅ Marked as read!');
        });
      });
    });

    fetchStream.once('error', (ex) => {
      console.error('❌ Fetch error:', ex);
    });

    fetchStream.once('end', () => {
      console.log('✅ Done fetching all messages!');
    });
  });
};

async function parseEmail(email) {
  try {
    const rawBody = email.parts.find((p) => p.which === "TEXT")?.body || "";

    if (!rawBody) {
      console.warn("⚠️ Email has no text content, skipping...");
      return null;
    }

    const mailParser = new MailParser();

    return new Promise((resolve, reject) => {
      mailParser.on('headers', (headers) => {
        console.log("📧 Extracted Headers:", headers);
      });

      mailParser.on('data', (data) => {
        if (data.type === 'text') {
          const parsedEmail = {
            subject: data.subject || 'No Subject',
            from: data.from?.value?.[0]?.address || 'Unknown',
            to: data.to?.value?.[0]?.address || 'Unknown',
            date: data.date?.toISOString() || new Date().toISOString(),
            text: data.text || 'No Text Available',
            html: data.html || '',
          };
          console.log("📧 Parsed Email:", parsedEmail);
          resolve(parsedEmail);
        }
      });

      mailParser.on('error', (err) => reject(err));

      mailParser.write(rawBody);
      mailParser.end();
    });
  } catch (error) {
    console.error("📧 Parsing failed:", error.message);
    return null;
  }
}

// Start IMAP listeners for all accounts
async function startIMAPSync() {
  for (const account of imapAccounts) {
    await connectAccount(account);
  }
}

export { startIMAPSync };