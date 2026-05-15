import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
    directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
