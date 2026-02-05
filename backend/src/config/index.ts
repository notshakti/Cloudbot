import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
  },
  facebook: {
    verifyToken: process.env.FACEBOOK_VERIFY_TOKEN || 'cloudbot_verify',
    appSecret: process.env.FACEBOOK_APP_SECRET,
  },
  slack: {
    signingSecret: process.env.SLACK_SIGNING_SECRET,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'change-me-refresh',
    refreshExpire: process.env.REFRESH_TOKEN_EXPIRE || '30d',
  },
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(',').map((o) => o.trim()),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  // RAG – Vector DB (Qdrant) + Embeddings (Gemini) + LLM (Groq) – all free tier
  qdrant: {
    url: process.env.QDRANT_URL || '',
    apiKey: process.env.QDRANT_API_KEY || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
  },
};
