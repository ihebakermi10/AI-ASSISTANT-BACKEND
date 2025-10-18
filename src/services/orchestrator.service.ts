import { Agent } from '@openai/agents';
import { retrieveDocumentContextTool, queryDatabaseTool } from '@/tools/index.js';
import { OrchestratorResult, ToolTrace } from '@/domain/types.js';
import { logger } from '@/infra/logger.js';
import { env } from '@/config/env.js';

let aiAgent: Agent | null = null;

// Lazy-load the AI agent to avoid circular dependencies and env loading issues
function getAgent(): Agent {
  if (!aiAgent) {
    aiAgent = new Agent({
      name: 'AI Assistant',
      instructions:
        'You are a helpful AI assistant that can answer questions about company documents and query order data from the database. Choose the appropriate tool based on the user\'s question:\n\n' +
        '- Use retrieveDocumentContext when the question is about policies, documentation, guidelines, refund procedures, product manuals, or any information that would be found in company documents.\n' +
        '- Use queryDatabase when the question is about specific orders, customer purchases, order history, product sales, or any transactional data.\n\n' +
        'Provide clear, helpful, and accurate answers based on the tool results.',
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

    // Run the agent with the user query
    const agent = getAgent();
    const result = await agent.run(userQuery);

    // Extract tool traces from the agent's run
    if (result.messages) {
      for (const message of result.messages) {
        if (message.role === 'tool' && message.tool_calls) {
          for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function?.name as 'retrieveDocumentContext' | 'queryDatabase';
            const args = toolCall.function?.arguments
              ? JSON.parse(toolCall.function.arguments)
              : {};

            trace.push({
              toolName,
              arguments: args,
              result: message.content?.substring(0, 500) || '',
              executionTime: 0, // Agent SDK doesn't provide individual execution times
            });
          }
        }
      }
    }

    // Get the final answer from the agent
    const answer = result.finalMessage?.content || 'I could not process your request.';

    const totalTime = Date.now() - startTime;
    logger.info(
      {
        query: userQuery,
        totalTime,
        answerLength: answer.length,
        toolsUsed: trace.length,
      },
      'Orchestration completed with OpenAI Agent'
    );

    return { answer, trace };
  } catch (error) {
    logger.error({ error, query: userQuery }, 'Orchestration failed');
    throw new Error('Failed to process query');
  }
}
