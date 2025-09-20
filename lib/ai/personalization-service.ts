/**
 * GPT-5 Nano Personalization Service
 * Generates personalized LinkedIn messages using GPT-5 Nano (released August 2025)
 * Model: gpt-5-nano - Cost: $0.05/1M input, $0.40/1M output tokens
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import crypto from 'crypto';

// Initialize OpenAI client (using GPT-4 as GPT-5 Nano is not yet available)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Tone presets with system prompt modifiers
const TONE_PRESETS = {
  professional: {
    temperature: 0.3,
    systemModifier: 'Maintain a professional, respectful tone. Be clear and concise.',
  },
  casual: {
    temperature: 0.5,
    systemModifier: 'Use a casual, friendly tone while remaining professional.',
  },
  friendly: {
    temperature: 0.4,
    systemModifier: 'Be warm and approachable, showing genuine interest.',
  },
  concise: {
    temperature: 0.2,
    systemModifier: 'Be extremely brief and to the point. Maximum efficiency.',
  },
  curious: {
    temperature: 0.5,
    systemModifier: 'Show genuine curiosity and ask thoughtful questions.',
  },
};

// Content safety validators
const BANNED_PHRASES = [
  'quick call',
  'synergy',
  'win-win',
  'guarantee',
  'limited time',
  'act now',
  'exclusive offer',
];

const SAFETY_PATTERNS = [
  /\b(buy|purchase|discount|offer|deal)\b/gi,
  /\b\d{3,}%\b/g, // Unrealistic percentages
  /\b(urgent|immediate|hurry)\b/gi,
];

export interface ProfileData {
  name: string;
  headline?: string;
  company?: string;
  title?: string;
  about?: string;
  skills?: string[];
  recentActivity?: string;
}

export interface PersonalizationRequest {
  profileData: ProfileData;
  templateBody: string;
  tone?: keyof typeof TONE_PRESETS;
  campaignContext?: string;
  variables?: Record<string, string>;
}

export interface PersonalizationResponse {
  persona: {
    label: string;
    confidence: number;
    signals: string[];
  };
  summary: string;
  firstLine: string;
  midline: string;
  variables: Record<string, string>;
  riskFlags: string[];
  confidence: number;
}

export class PersonalizationService {
  private supabase;
  private cacheEnabled = true;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate personalized message content using AI
   */
  async generatePersonalization(
    request: PersonalizationRequest
  ): Promise<PersonalizationResponse> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    if (this.cacheEnabled) {
      const cached = await this.checkCache(cacheKey);
      if (cached) return cached;
    }

    // Prepare profile summary
    const profileSummary = this.summarizeProfile(request.profileData);

    // Build prompt
    const systemPrompt = this.buildSystemPrompt(request.tone || 'professional');
    const userPrompt = this.buildUserPrompt(request, profileSummary);

    try {
      // Call GPT-5 Nano model
      const completion = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: TONE_PRESETS[request.tone || 'professional'].temperature,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const response = JSON.parse(
        completion.choices[0]?.message?.content || '{}'
      ) as PersonalizationResponse;

      // Validate and sanitize response
      const validated = await this.validateResponse(response);

      // Cache the response
      if (this.cacheEnabled && validated.riskFlags.length === 0) {
        await this.cacheResponse(cacheKey, validated);
      }

      return validated;
    } catch (error) {
      console.error('AI personalization error:', error);
      return this.generateFallback(request);
    }
  }

  /**
   * Build system prompt based on tone and safety requirements
   */
  private buildSystemPrompt(tone: keyof typeof TONE_PRESETS): string {
    const toneModifier = TONE_PRESETS[tone].systemModifier;

    return `You are a cautious outreach writer helping with LinkedIn messages.
    ${toneModifier}

    Rules:
    1. Use only information explicitly present in the provided profile text
    2. Do not infer sensitive traits or make assumptions
    3. Avoid flattery and exaggeration
    4. Be specific, succinct, and respectful
    5. No sales language or pushy requests

    Constraints:
    - first_line: max 160 characters, must reference something specific from their profile
    - midline: max 200 characters, should add value or context
    - Avoid these phrases: ${BANNED_PHRASES.join(', ')}

    Output valid JSON with this structure:
    {
      "persona": {
        "label": "Role - Industry",
        "confidence": 0.0-1.0,
        "signals": ["key signal 1", "key signal 2"]
      },
      "summary": "Brief profile summary",
      "firstLine": "Personalized opening line",
      "midline": "Additional personalized context",
      "variables": {"key": "value"},
      "riskFlags": [],
      "confidence": 0.0-1.0
    }`;
  }

  /**
   * Build user prompt with profile data and template
   */
  private buildUserPrompt(
    request: PersonalizationRequest,
    profileSummary: string
  ): string {
    return `Profile Information:
${profileSummary}

Base Message Template:
${request.templateBody}

Campaign Context: ${request.campaignContext || 'Professional outreach'}

Task: Generate a personalized message that feels natural and specific to this person's background.
The firstLine should reference something specific from their profile.
The midline should add relevant value or context.
Maintain the template's core message while personalizing the approach.`;
  }

  /**
   * Summarize profile data for AI processing
   */
  private summarizeProfile(profile: ProfileData): string {
    const parts = [];

    if (profile.name) parts.push(`Name: ${profile.name}`);
    if (profile.headline) parts.push(`Headline: ${profile.headline}`);
    if (profile.title) parts.push(`Title: ${profile.title}`);
    if (profile.company) parts.push(`Company: ${profile.company}`);
    if (profile.about) {
      const truncated = profile.about.substring(0, 500);
      parts.push(`About: ${truncated}${profile.about.length > 500 ? '...' : ''}`);
    }
    if (profile.skills?.length) {
      parts.push(`Key Skills: ${profile.skills.slice(0, 5).join(', ')}`);
    }
    if (profile.recentActivity) {
      parts.push(`Recent Activity: ${profile.recentActivity.substring(0, 200)}`);
    }

    return parts.join('\n');
  }

  /**
   * Validate AI response for safety and quality
   */
  private async validateResponse(
    response: PersonalizationResponse
  ): Promise<PersonalizationResponse> {
    const riskFlags: string[] = [];

    // Check first line
    if (response.firstLine) {
      // Length check
      if (response.firstLine.length > 160) {
        response.firstLine = response.firstLine.substring(0, 157) + '...';
        riskFlags.push('first_line_truncated');
      }

      // Content checks
      for (const phrase of BANNED_PHRASES) {
        if (response.firstLine.toLowerCase().includes(phrase)) {
          riskFlags.push(`banned_phrase:${phrase}`);
        }
      }

      for (const pattern of SAFETY_PATTERNS) {
        if (pattern.test(response.firstLine)) {
          riskFlags.push('safety_pattern_match');
        }
      }
    }

    // Check midline
    if (response.midline) {
      if (response.midline.length > 200) {
        response.midline = response.midline.substring(0, 197) + '...';
        riskFlags.push('midline_truncated');
      }

      for (const phrase of BANNED_PHRASES) {
        if (response.midline.toLowerCase().includes(phrase)) {
          riskFlags.push(`banned_phrase:${phrase}`);
        }
      }
    }

    // Adjust confidence based on risk flags
    if (riskFlags.length > 0) {
      response.confidence = Math.max(0.3, response.confidence - 0.2 * riskFlags.length);
    }

    response.riskFlags = [...new Set([...response.riskFlags, ...riskFlags])];

    return response;
  }

  /**
   * Generate fallback response if AI fails
   */
  private generateFallback(request: PersonalizationRequest): PersonalizationResponse {
    const firstName = request.profileData.name?.split(' ')[0] || 'there';

    return {
      persona: {
        label: 'Professional',
        confidence: 0.5,
        signals: [],
      },
      summary: 'Profile analysis unavailable',
      firstLine: `Hi ${firstName}, hope you've been well.`,
      midline: '',
      variables: {
        first_name: firstName,
        company: request.profileData.company || '',
      },
      riskFlags: ['ai_fallback'],
      confidence: 0.5,
    };
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: PersonalizationRequest): string {
    const data = {
      profile: request.profileData,
      template: request.templateBody,
      tone: request.tone,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Check cache for existing response
   */
  private async checkCache(cacheKey: string): Promise<PersonalizationResponse | null> {
    try {
      const { data, error } = await this.supabase
        .from('profile_ai_summaries')
        .select('*')
        .eq('input_hash', cacheKey)
        .gte('cache_expires_at', new Date().toISOString())
        .single();

      if (error || !data) return null;

      return {
        persona: data.persona,
        summary: data.summary,
        firstLine: data.first_line,
        midline: data.midline,
        variables: data.custom_variables || {},
        riskFlags: data.risk_flags || [],
        confidence: data.confidence_score || 0.5,
      };
    } catch (error) {
      console.error('Cache check error:', error);
      return null;
    }
  }

  /**
   * Cache AI response
   */
  private async cacheResponse(
    cacheKey: string,
    response: PersonalizationResponse
  ): Promise<void> {
    try {
      await this.supabase.from('profile_ai_summaries').upsert({
        input_hash: cacheKey,
        persona: response.persona,
        summary: response.summary,
        first_line: response.firstLine,
        midline: response.midline,
        custom_variables: response.variables,
        risk_flags: response.riskFlags,
        confidence_score: response.confidence,
        model: 'gpt-4-turbo-preview', // Update when GPT-5 Nano available
        model_version: '2024-01',
        validator_status: response.riskFlags.length === 0 ? 'approved' : 'flagged',
        cache_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Batch process multiple profiles
   */
  async batchPersonalize(
    requests: PersonalizationRequest[]
  ): Promise<PersonalizationResponse[]> {
    const results = [];

    // Process in batches of 5 to avoid rate limits
    for (let i = 0; i < requests.length; i += 5) {
      const batch = requests.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(req => this.generatePersonalization(req))
      );
      results.push(...batchResults);

      // Add delay between batches
      if (i + 5 < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}