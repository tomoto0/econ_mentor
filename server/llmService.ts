import { invokeLLM } from "./_core/llm";
import { getChatLogsBySessionId } from "./db";
import { SYSTEM_PROMPT, createUserContext, getTopicSpecificPrompt } from "./prompts";

export interface LLMResponse {
  content: string;
  contentType: "text" | "graph_data" | "scenario";
  metadata?: Record<string, any>;
}

/**
 * Generate an AI response for the economics mentor
 * @param topic The economic topic being discussed
 * @param userMessage The user's question or input
 * @param sessionId The session ID for context
 * @returns The AI response with content and metadata
 */
export async function generateMentorResponse(
  topic: string,
  userMessage: string,
  sessionId: string
): Promise<LLMResponse> {
  try {
    // Get previous chat history for context
    const chatHistory = await getChatLogsBySessionId(sessionId);
    
    // Build conversation history for the LLM
    const messages: Array<{ role: string; content: string }> = [
      {
        role: "system",
        content: buildSystemPrompt(topic),
      },
    ];

    // Add previous messages to context (limit to last 10 for token efficiency)
    const recentMessages = chatHistory.slice(-10);
    recentMessages.forEach((log) => {
      messages.push({
        role: log.role,
        content: log.content,
      });
    });

    // Add the current user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    // Call the LLM API
    const response = await invokeLLM({
      messages: messages as any,
    });

    // Extract the response content - handle both string and array types
    let content = "Unable to generate response";
    const rawContent = response.choices?.[0]?.message?.content;
    
    if (typeof rawContent === "string") {
      content = rawContent;
    } else if (Array.isArray(rawContent)) {
      // If it's an array of content blocks, extract text
      const textBlock = rawContent.find((block: any) => block.type === "text");
      if (textBlock && (textBlock as any).text) {
        content = (textBlock as any).text;
      }
    }

    // Determine content type based on the response
    const contentType = detectContentType(content);
    let metadata: Record<string, any> | undefined;

    // If it's graph data, try to parse it
    if (contentType === "graph_data") {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          metadata = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn("Failed to parse graph data:", e);
      }
    }

    return {
      content,
      contentType,
      metadata,
    };
  } catch (error) {
    console.error("Error generating mentor response:", error);
    throw new Error("Failed to generate AI response");
  }
}

/**
 * Build the system prompt with topic-specific guidance
 */
function buildSystemPrompt(topic: string): string {
  let prompt = SYSTEM_PROMPT;

  // Add topic-specific guidance if available
  const topicSpecificPrompt = getTopicSpecificPrompt(topic);
  if (topicSpecificPrompt) {
    prompt += `\n\nTopic-specific guidance:\n${topicSpecificPrompt}`;
  }

  return prompt;
}

/**
 * Detect the type of content in the response
 */
function detectContentType(
  content: string
): "text" | "graph_data" | "scenario" {
  // Check for JSON structure (graph data)
  if (content.includes('{"type"') || content.includes('"axes"')) {
    return "graph_data";
  }

  // Check for scenario analysis keywords
  if (
    content.includes("Initial Situation") ||
    content.includes("Short-term Effects") ||
    content.includes("Long-term Effects")
  ) {
    return "scenario";
  }

  // Default to text
  return "text";
}

/**
 * Generate a response specifically for graph visualization
 */
export async function generateGraphData(
  topic: string,
  request: string,
  sessionId: string
): Promise<LLMResponse> {
  const graphPrompt = `The user is asking for a graph or visualization about ${topic}.
User request: "${request}"

Please provide the graph data in JSON format with type, title, description, axes, and series.`;

  const response = await generateMentorResponse(topic, graphPrompt, sessionId);
  return {
    ...response,
    contentType: "graph_data",
  };
}

/**
 * Generate a scenario analysis response
 */
export async function generateScenarioAnalysis(
  topic: string,
  scenario: string,
  sessionId: string
): Promise<LLMResponse> {
  const scenarioPrompt = `Analyze this economic scenario about ${topic}:
"${scenario}"

Structure your response with:
1. Initial Situation
2. Change/Shock
3. Short-term Effects
4. Long-term Effects
5. Equilibrium Outcome
6. Key Insights`;

  const response = await generateMentorResponse(topic, scenarioPrompt, sessionId);
  return {
    ...response,
    contentType: "scenario",
  };
}
