import OpenAI from 'openai';
import { env } from '@/config/env.js';
import { logger } from './logger.js';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    logger.info('OpenAI client initialized');
  }
  return openaiClient;
}

export async function createEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    if (!response.data[0]?.embedding) {
      throw new Error('No embedding returned from OpenAI');
    }

    return response.data[0].embedding;
  } catch (error) {
    logger.error({ error, text: text.substring(0, 100) }, 'Failed to create embedding');
    throw new Error('Failed to create embedding');
  }
}

export async function createChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  tools?: OpenAI.Chat.ChatCompletionTool[],
  toolChoice?: OpenAI.Chat.ChatCompletionToolChoiceOption
): Promise<OpenAI.Chat.ChatCompletion> {
  const client = getOpenAIClient();

  try {
    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      model: env.OPENAI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    };

    if (tools && tools.length > 0) {
      params.tools = tools;
      if (toolChoice) {
        params.tool_choice = toolChoice;
      }
    }

    const response = await client.chat.completions.create(params);
    return response;
  } catch (error) {
    logger.error({ error, messageCount: messages.length }, 'Failed to create chat completion');
    throw new Error('Failed to create chat completion');
  }
}
