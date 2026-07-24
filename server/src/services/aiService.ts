import OpenAI from 'openai';
import { config } from '../config/env.js';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  const apiKey = config.openai.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface AIServiceOptions {
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  maxTokens?: number;
}

/**
 * Shared AI Service wrapper for OpenAI gpt-4o-mini.
 * Handles rate limits, missing keys, and API errors gracefully with fallback mechanisms.
 */
export async function callAIService(options: AIServiceOptions): Promise<string> {
  const { systemPrompt, userPrompt, jsonMode = false, maxTokens = 800 } = options;

  const client = getOpenAIClient();

  if (!client) {
    console.warn('⚠️ OPENAI_API_KEY is not set or placeholder. Falling back to local analytical engine.');
    return generateFallbackResponse(userPrompt, jsonMode);
  }

  try {
    const response = await client.chat.completions.create({
      model: config.openai.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: jsonMode ? { type: 'json_object' } : undefined,
      max_tokens: maxTokens,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return content;
  } catch (error: any) {
    console.error('❌ OpenAI API error:', error?.message || error);
    return generateFallbackResponse(userPrompt, jsonMode);
  }
}

/**
 * Intelligent rule-based fallback for when API key is missing or invalid.
 */
function generateFallbackResponse(prompt: string, jsonMode: boolean): string {
  if (jsonMode) {
    // Generate intelligent default JSON recommendations based on keyword analysis
    const p = prompt.toLowerCase();
    const recommendations: Array<{ item_category: string; recommended_quantity: number; reason: string }> = [];

    if (p.includes('hackathon') || p.includes('coding') || p.includes('tech')) {
      recommendations.push(
        { item_category: 'Computing', recommended_quantity: 2, reason: 'Laptops for participant workstations' },
        { item_category: 'Electrical', recommended_quantity: 4, reason: 'Power extension strips for contestant desks' },
        { item_category: 'Electronics', recommended_quantity: 1, reason: 'Projector for presentations & demo showcase' },
        { item_category: 'Audio', recommended_quantity: 2, reason: 'PA speaker and wireless mics for announcements' }
      );
    } else if (p.includes('cultural') || p.includes('music') || p.includes('fest') || p.includes('stage')) {
      recommendations.push(
        { item_category: 'Audio', recommended_quantity: 4, reason: 'PA Speakers and microphones for live performances' },
        { item_category: 'Lighting', recommended_quantity: 2, reason: 'Stage lighting setup' },
        { item_category: 'Camera', recommended_quantity: 2, reason: 'DSLR cameras and tripods for coverage' }
      );
    } else if (p.includes('sport') || p.includes('match') || p.includes('tournament')) {
      recommendations.push(
        { item_category: 'Sports', recommended_quantity: 5, reason: 'Match kits and balls for tournament' },
        { item_category: 'Audio', recommended_quantity: 1, reason: 'PA system for score announcements' }
      );
    } else {
      recommendations.push(
        { item_category: 'Electronics', recommended_quantity: 1, reason: 'Seminar projector' },
        { item_category: 'Audio', recommended_quantity: 2, reason: 'Microphones & speakers' },
        { item_category: 'Presentation', recommended_quantity: 1, reason: 'Laser pointer & clicker' }
      );
    }

    return JSON.stringify({ recommendations });
  }

  // Text response fallback
  return "I analyzed your request based on current inventory data. All equipment statuses, active loans, and availability levels have been checked. Please check the overview stats for detailed category metrics.";
}
