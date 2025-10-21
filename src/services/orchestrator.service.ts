import { Agent, run } from '@openai/agents';
import { retrieveDocumentContextTool, queryDatabaseTool } from '@/tools/agent-tools.js';
import { OrchestratorResult, ToolTrace } from '@/domain/types.js';
import { logger } from '@/infra/logger.js';
import { env } from '@/config/env.js';
import { agentResponseCache } from '@/utils/cache.js';
import { generateQueryCacheKey, shouldCacheQuery, getQueryCacheTTL } from '@/utils/cache-key.js';

let aiAgent: Agent | null = null;

// Lazy-load the AI agent to avoid circular dependencies and env loading issues
function getAgent(): Agent {
  if (!aiAgent) {
    aiAgent = new Agent({
      name: 'AI Assistant',
      instructions:
        'You are a helpful AI assistant for an internal analytics platform. You have access to two specialized tools:\n\n' +
        '## Tool Selection Guidelines:\n\n' +
        '### Use retrieveDocumentContext for:\n' +
        '- Policy questions (refund, warranty, cancellation, shipping, returns)\n' +
        '- Documentation and guideline lookups\n' +
        '- Product manuals and troubleshooting guides\n' +
        '- Account management procedures\n' +
        '- Support contact information\n' +
        '- Any "What does the policy say..." or "How do I..." questions\n' +
        '- General knowledge about company procedures\n\n' +
        '### Use queryDatabase for:\n' +
        '- Specific order lookups (by order ID, customer name, or date)\n' +
        '- Customer purchase history\n' +
        '- Order status checks\n' +
        '- Product sales data and statistics\n' +
        '- Transactional data queries\n' +
        '- Any "Show me orders..." or "Find purchases..." requests\n\n' +
        '## Important:\n' +
        '- ONLY call a tool if the user query clearly requires it\n' +
        '- DO NOT call both tools unless absolutely necessary\n' +
        '- If you receive relevant context from a tool, use it to provide a complete, well-formatted answer\n' +
        '- Always cite the source when using document context\n' +
        '- Be concise but thorough in your responses',
      model: env.OPENAI_MODEL,
      tools: [retrieveDocumentContextTool, queryDatabaseTool],
    });
  }
  return aiAgent;
}

export async function askOrchestrator(userQuery: string): Promise<OrchestratorResult> {
  const trace: ToolTrace[] = [];
  const startTime = Date.now();

  try {
    logger.info({ query: userQuery }, 'Starting orchestration with OpenAI Agent');

    // Check if query should use cache
    const useCaching = shouldCacheQuery(userQuery);
    let cacheKey: string | null = null;

    if (useCaching) {
      cacheKey = generateQueryCacheKey(userQuery);

      // Try to get cached response
      const cachedAnswer = await agentResponseCache.get(cacheKey);

      if (cachedAnswer) {
        const totalTime = Date.now() - startTime;
        logger.info(
          {
            query: userQuery,
            cacheHit: true,
            totalTime,
            answerLength: cachedAnswer.length,
          },
          'Returning cached response'
        );

        return { answer: cachedAnswer, trace };
      }

      logger.info({ query: userQuery, cacheKey }, 'Cache miss - running agent');
    } else {
      logger.info({ query: userQuery }, 'Query not cacheable - running agent');
    }

    // Run the agent with the user query using the run function from the SDK
    const agent = getAgent();
    const result = await run(agent, userQuery);

    logger.info(
      {
        finalOutput: result.finalOutput,
        historyLength: result.history?.length,
      },
      'Agent run completed'
    );

    // Extract tool traces from result.history
    if (result.history && Array.isArray(result.history)) {
      for (const message of result.history) {
        // Type guard to check if message has role and tool_calls
        if ('role' in message && message.role === 'assistant' && 'tool_calls' in message) {
          const toolCalls = (message as any).tool_calls;
          if (Array.isArray(toolCalls)) {
            for (const toolCall of toolCalls) {
              try {
                trace.push({
                  toolName: toolCall.function.name as 'retrieveDocumentContext' | 'queryDatabase',
                  arguments: JSON.parse(toolCall.function.arguments || '{}'),
                  result: 'Tool executed successfully', // Placeholder as actual result is in next message
                  executionTime: 0, // Will be updated if we track timing
                });
                logger.info(
                  {
                    toolName: toolCall.function.name,
                    arguments: toolCall.function.arguments,
                  },
                  'Tool call detected in agent history'
                );
              } catch (error) {
                logger.warn({ error, toolCall }, 'Failed to parse tool call from history');
              }
            }
          }
        }
      }
    }

    // Extract the final answer from result.finalOutput
    const answer =
      typeof result.finalOutput === 'string'
        ? result.finalOutput
        : JSON.stringify(result.finalOutput);

    // Cache the response if applicable
    if (useCaching && cacheKey) {
      const ttl = getQueryCacheTTL(userQuery);
      const cached = await agentResponseCache.set(cacheKey, answer, ttl);

      logger.info(
        {
          query: userQuery,
          cacheKey,
          ttl,
          cached,
        },
        'Response cached'
      );
    }

    const totalTime = Date.now() - startTime;
    logger.info(
      {
        query: userQuery,
        totalTime,
        answerLength: answer.length,
        cached: useCaching,
      },
      'Orchestration completed with OpenAI Agent'
    );

    return { answer, trace };
  } catch (error: any) {
    logger.error(
      {
        error: {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        },
        query: userQuery,
      },
      'Orchestration failed'
    );
    throw new Error('Failed to process query');
  }
}
