import dotenv from 'dotenv';
dotenv.config();

export const imapAccounts = [
  {
    user: process.env.IMAP_USER_1,
    password: process.env.IMAP_PASSWORD_1,
    host: process.env.IMAP_HOST_1,
    port: process.env.IMAP_PORT_1,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }, 
    authTimeout: 10000,
  },
  {
    user: process.env.IMAP_USER_2,
    password: process.env.IMAP_PASSWORD_2,
    host: process.env.IMAP_HOST_2,
    port: process.env.IMAP_PORT_2,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 10000,
  },
];