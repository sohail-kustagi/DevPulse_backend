import { z } from 'zod';

const ConfigSchema = z.object({
  port: z.coerce.number().default(8000),
  nodeEnv: z.string().default('development'),
  corsOrigins: z
    .string()
    .default(
      'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080,http://localhost:3000,http://127.0.0.1:3000'
    )
    .transform((val) =>
      val.split(',').map((origin) => origin.trim()).filter(Boolean)
    ),
  bedrockMantleApiKey: z.string().default(''),
  awsRegion: z.string().default('us-east-1'),
  githubToken: z.string().default(''),
  workspaceDir: z.string().default(process.cwd()),
});

export type Config = z.infer<typeof ConfigSchema>;

export const config: Config = ConfigSchema.parse({
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  corsOrigins: process.env.CORS_ORIGIN,
  bedrockMantleApiKey:
    process.env.BEDROCK_MANTLE_API_KEY ||
    process.env.AWS_BEARER_TOKEN_BEDROCK ||
    '',
  awsRegion: process.env.AWS_REGION,
  githubToken: process.env.GITHUB_TOKEN,
  workspaceDir: process.env.WORKSPACE_DIR,
});
