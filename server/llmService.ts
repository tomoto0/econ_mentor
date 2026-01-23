import { invokeLLM } from "./_core/llm";
import { getChatLogsBySessionId } from "./db";
import { SYSTEM_PROMPT, createUserContext, getTopicSpecificPrompt } from "./prompts";
import { generateGraphFromRequest } from "./graphGenerator";

export interface LLMResponse {
  content: string;
  contentType: "text" | "graph_data" | "scenario";
  metadata?: Record<string, any>;
}

/**
 * Generate an AI response for the economics mentor
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
    const contentType = detectContentType(content, userMessage);
    let metadata: Record<string, any> | undefined;

    // If it's graph data, try to generate or parse it
    if (contentType === "graph_data") {
      // First try to parse JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          metadata = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn("Failed to parse graph data from response:", e);
      }
      
      // If no metadata, try to generate graph from request
      if (!metadata) {
        const generatedGraph = generateGraphFromRequest(userMessage);
        if (generatedGraph) {
          metadata = generatedGraph;
        }
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
  content: string,
  userMessage: string
): "text" | "graph_data" | "scenario" {
  // Check if user is asking for a graph
  const graphKeywords = ["グラフ", "描いて", "示して", "曲線", "図", "chart", "graph", "draw", "visualize"];
  const isGraphRequest = graphKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  
  if (isGraphRequest) {
    return "graph_data";
  }

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


// Quiz and Practice Problem Types
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface PracticeProblemData {
  problem: string;
  solution: string[];
  answer: string;
  hints: string[];
  difficulty: "easy" | "medium" | "hard";
}

/**
 * Generate quiz questions using LLM
 */
export async function generateQuizQuestions(
  topic: string,
  count: number = 3,
  difficulty: "easy" | "medium" | "hard" = "medium"
): Promise<QuizQuestion[]> {
  try {
    const difficultyGuide = {
      easy: "基礎的な概念の理解を確認する簡単な問題。専門用語の定義や基本的な関係性を問う。",
      medium: "概念の応用や複数の要素の関連性を問う中程度の問題。グラフの読み取りや簡単な計算を含む。",
      hard: "複雑な分析や批判的思考を必要とする難しい問題。複数の経済モデルの統合や現実世界への応用を問う。"
    };

    const prompt = `あなたは経済学の専門家です。「${topic}」に関する${count}問の選択式クイズを作成してください。

難易度: ${difficulty} - ${difficultyGuide[difficulty]}

以下のJSON形式で回答してください。必ず有効なJSONのみを出力し、他のテキストは含めないでください：

{
  "quizzes": [
    {
      "question": "問題文",
      "options": ["(A) 選択肢A", "(B) 選択肢B", "(C) 選択肢C", "(D) 選択肢D"],
      "correctAnswer": "A",
      "explanation": "正解の解説",
      "difficulty": "${difficulty}"
    }
  ]
}

注意事項：
- 選択肢は必ず(A), (B), (C), (D)の形式で記述
- correctAnswerは"A", "B", "C", "D"のいずれか
- 解説は詳しく、学習に役立つ内容を含める
- 経済学の正確な知識に基づいた問題を作成`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert economics educator. Always respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quiz_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              quizzes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correctAnswer: { type: "string" },
                    explanation: { type: "string" },
                    difficulty: { type: "string" }
                  },
                  required: ["question", "options", "correctAnswer", "explanation", "difficulty"],
                  additionalProperties: false
                }
              }
            },
            required: ["quizzes"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return parsed.quizzes || [];
    }
    
    return [];
  } catch (error) {
    console.error("Error generating quiz questions:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

/**
 * Generate practice problems using LLM
 */
export async function generatePracticeProblemsLLM(
  topic: string,
  count: number = 3,
  difficulty: "easy" | "medium" | "hard" = "medium"
): Promise<PracticeProblemData[]> {
  try {
    const difficultyGuide = {
      easy: "基礎的な計算や概念の適用。単純な需要供給の計算、基本的なグラフの読み取りなど。",
      medium: "複数のステップを必要とする問題。均衡価格の計算、弾力性の計算、簡単な最適化問題など。",
      hard: "複雑な分析や数学的推論を必要とする問題。ゲーム理論、一般均衡、動学的分析など。"
    };

    const prompt = `あなたは経済学の専門家です。「${topic}」に関する${count}問の練習問題を作成してください。

難易度: ${difficulty} - ${difficultyGuide[difficulty]}

以下のJSON形式で回答してください。必ず有効なJSONのみを出力し、他のテキストは含めないでください：

{
  "problems": [
    {
      "problem": "問題文（具体的な数値や状況を含む）",
      "solution": ["ステップ1: 解説", "ステップ2: 解説", "ステップ3: 解説"],
      "answer": "最終的な答え",
      "hints": ["ヒント1", "ヒント2"],
      "difficulty": "${difficulty}"
    }
  ]
}

注意事項：
- 問題は具体的な数値や状況を含める
- 解答は段階的に説明し、各ステップの理由を明確にする
- ヒントは問題を解く上での考え方のガイドを提供
- 経済学の正確な知識に基づいた問題を作成`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert economics educator. Always respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "practice_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              problems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    problem: { type: "string" },
                    solution: { type: "array", items: { type: "string" } },
                    answer: { type: "string" },
                    hints: { type: "array", items: { type: "string" } },
                    difficulty: { type: "string" }
                  },
                  required: ["problem", "solution", "answer", "hints", "difficulty"],
                  additionalProperties: false
                }
              }
            },
            required: ["problems"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return parsed.problems || [];
    }
    
    return [];
  } catch (error) {
    console.error("Error generating practice problems:", error);
    throw new Error("Failed to generate practice problems");
  }
}
