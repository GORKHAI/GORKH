import { z } from 'zod';

const configSchema = z.object({
  PORT: z.string().transform((s) => parseInt(s, 10)).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

function loadConfig() {
  const raw = {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };

  const result = configSchema.safeParse(raw);

  if (!result.success) {
    console.error('❌ Invalid configuration:');
    for (const issue of result.error.issues) {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    }
    console.error('\nRequired environment variables:');
    console.error('   PORT (default: 3001)');
    console.error('   NODE_ENV (default: development)');
    console.error('   LOG_LEVEL (default: info)');
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
