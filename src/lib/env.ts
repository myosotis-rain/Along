export function validateEnv() {
  const requiredEnvVars = [
    'ENCRYPTION_KEY',
    'OPENAI_API_KEY'
  ];

  const optionalEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI'
  ];

  // Check required env vars
  const missingRequired = requiredEnvVars.filter(env => !process.env[env]);
  if (missingRequired.length > 0) {
    throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
  }

  // Check optional env vars and log warnings
  const missingOptional = optionalEnvVars.filter(env => !process.env[env]);
  if (missingOptional.length > 0) {
    console.warn(`Warning: Missing optional environment variables: ${missingOptional.join(', ')}\nSome features may be disabled.`);
  }

  // Validate ENCRYPTION_KEY length
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  }

  // Validate OpenAI API key format
  if (!process.env.OPENAI_API_KEY?.startsWith('sk-')) {
    throw new Error('Invalid OPENAI_API_KEY format. Must start with "sk-"');
  }
}