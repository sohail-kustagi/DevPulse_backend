import OpenAI from 'openai';
import { config } from '../config.js';

export const MODEL_ID = 'openai.gpt-oss-120b';

// Regional Amazon Bedrock Mantle OpenAI-compatible endpoint
export const mantleBaseURL = `https://bedrock-mantle.${config.awsRegion}.api.aws/v1`;

export const mantleClient = new OpenAI({
  apiKey: config.bedrockMantleApiKey || 'mock-mantle-api-key',
  baseURL: mantleBaseURL,
});

export async function checkMantleConnectivity(): Promise<boolean> {
  if (!config.bedrockMantleApiKey) return false;
  try {
    const list = await mantleClient.models.list();
    return Boolean(list.data);
  } catch {
    return false;
  }
}
