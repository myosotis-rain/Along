import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

const DB_PATH = join(process.cwd(), 'data', 'tokens.json');

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}

interface UserTokens {
  [userId: string]: {
    encrypted: string;
    updatedAt: string;
  };
}

// Simple encryption (in production, use proper key management)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-here-123';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function ensureDataDir() {
  try {
    await writeFile(DB_PATH, '{}', { flag: 'wx' });
  } catch (error) {
    // File already exists, which is fine
  }
}

export async function saveTokensForUser(userId: string, tokens: TokenData): Promise<void> {
  await ensureDataDir();
  
  let data: UserTokens = {};
  try {
    const fileContent = await readFile(DB_PATH, 'utf-8');
    data = JSON.parse(fileContent);
  } catch (error) {
    // File doesn't exist or is invalid, start fresh
  }

  const encrypted = encrypt(JSON.stringify(tokens));
  data[userId] = {
    encrypted,
    updatedAt: new Date().toISOString()
  };

  await writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export async function loadTokensForUser(userId: string): Promise<TokenData | null> {
  try {
    const fileContent = await readFile(DB_PATH, 'utf-8');
    const data: UserTokens = JSON.parse(fileContent);
    
    if (!data[userId]) {
      return null;
    }

    const decrypted = decrypt(data[userId].encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    return null;
  }
}

export async function removeTokensForUser(userId: string): Promise<void> {
  try {
    const fileContent = await readFile(DB_PATH, 'utf-8');
    const data: UserTokens = JSON.parse(fileContent);
    
    delete data[userId];
    
    await writeFile(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    // File doesn't exist, which is fine
  }
}