/**
 * SuperDebate Outreach Service v2
 * AI-powered profile analysis and message generation for SuperDebate.org
 *
 * Features:
 * - 4-audience classification (Funder, Ambassador, Debater, Friend)
 * - AI-enhanced personalization with John's voice
 * - Fit assessment (Resonance, Relevance, Reach)
 * - Message deduplication
 * - Response classification
 * - Configurable templates
 */

import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  JOHN_VOICE,
  AUDIENCES,
  SUPERDEBATE_FACTS,
  QUALITY_RULES,
  FOLLOW_UP_SEQUENCES,
  RESPONSE_TEMPLATES,
  OBJECTIONS,
  AudienceType,
  ConversationStage,
} from './config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// ============================================================================
// TYPES
// ============================================================================

export interface ProfileData {
  name: string;
  headline?: string;
  company?: string;
  title?: string;
  about?: string;
  location?: string;
  skills?: string[];
  recentActivity?: string;
  connectionDegree?: string;
  linkedinUrl?: string;
}

export interface FitAssessment {
  resonance: number;      // 0-1: How likely to care about the mission
  relevance: number;      // 0-1: How well they match target audience
  reach: number;          // 0-1: Potential impact if they engage
  overall: number;        // Weighted average
  reasoning: string[];
}

export interface AudienceClassification {
  primary: AudienceType;
  secondary?: AudienceType;
  confidence: number;
  signals: string[];
  personalizationHooks: string[];
  fitAssessment: FitAssessment;
  aiEnhanced: boolean;
}

export interface GeneratedMessage {
  fullMessage: string;
  parts: {
    greeting: string;
    warmPhrase: string;
    personalization: string;
    mission: string;
    traction: string;
    cta: string;
    signOff: string;
  };
  audienceType: AudienceType;
  confidence: number;
  riskFlags: string[];
  messageHash: string;
  isUnique: boolean;
}

export interface ResponseClassification {
  type: 'positive' | 'send_more_info' | 'busy' | 'intro_offered' | 'hard_no' | 'unclear';
  confidence: number;
  suggestedReply: string;
  escalateToJohn: boolean;
  reasoning: string;
}

// ============================================================================
// MESSAGE TEMPLATES (Configurable)
// ============================================================================

export const MESSAGE_TEMPLATES = {
  // Structure mirrors the spec examples exactly
  funder: {
    structure: [
      '{greeting}',
      '',
      '{warm_phrase}.',
      '',
      '{personalization}',
      '',
      '{mission}',
      '',
      '{traction}',
      '',
      '{cta}',
      '',
      '{sign_off}',
    ],
    defaultPersonalization: '', // AI generates this
    tractionVariant: `I've run events across {locations}, built the core platform, and now I'm recruiting ambassadors to launch clubs in {target_cities} cities while raising {raising}.`,
  },
  ambassador: {
    structure: [
      '{greeting}',
      '',
      '{warm_phrase}.',
      '',
      '{personalization}',
      '',
      '{mission_short}',
      '',
      '{ambassador_pitch}',
      '',
      '{cta}',
      '',
      '{sign_off}',
    ],
    defaultPersonalization: '',
    missionShort: `I'm building SuperDebate.org—competitive debate leagues for adults in {target_cities}+ cities.`,
    ambassadorPitch: `I'm recruiting ambassadors to run local clubs. It pays {ambassador_pay}/event plus bonuses, and the larger your club grows, the more you earn.`,
  },
  debater: {
    structure: [
      '{greeting}',
      '',
      '{warm_phrase}.',
      '',
      '{personalization} {debate_connection}',
      '',
      '{mission}',
      '',
      '{traction_debater}',
      '',
      '{cta}',
      '',
      '{sign_off}',
    ],
    debateConnection: `I was a policy debater too, and I coached kids who became the first national champions from an urban debate league.`,
    tractionDebater: `We've run events in {locations}, and we're building toward regional and national championships.`,
  },
  friend: {
    structure: [
      '{greeting}',
      '',
      '{warm_phrase}.',
      '',
      '{personalization}',
      '',
      '{mission}',
      '',
      '{traction}',
      '',
      '{cta}',
      '',
      '{sign_off}',
    ],
  },
};

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class SuperDebateOutreachService {
  private supabase: SupabaseClient;
  // Message hashes now persisted to database instead of in-memory Set
  // This survives API restarts and serverless cold starts
  private currentCampaignId: string | null = null;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // AUDIENCE CLASSIFICATION
  // ==========================================================================

  async classifyAudience(profile: ProfileData): Promise<AudienceClassification> {
    // Step 1: Keyword-based classification
    const keywordResult = this.classifyByKeywords(profile);

    // Step 2: If confidence is low or ambiguous, use AI enhancement
    let finalResult = keywordResult;
    if (keywordResult.confidence < 0.7 || this.isAmbiguousClassification(keywordResult)) {
      const aiResult = await this.classifyWithAI(profile, keywordResult);
      if (aiResult) {
        finalResult = aiResult;
      }
    }

    // Step 3: Calculate fit assessment
    finalResult.fitAssessment = this.calculateFitAssessment(profile, finalResult);

    // Step 4: Find personalization hooks
    finalResult.personalizationHooks = await this.findPersonalizationHooks(profile, finalResult.primary);

    return finalResult;
  }

  private classifyByKeywords(profile: ProfileData): AudienceClassification {
    const profileText = this.buildProfileText(profile).toLowerCase();
    const signals: string[] = [];
    const scores: Record<AudienceType, number> = {
      funder: 0,
      ambassador: 0,
      debater: 0,
      friend: 0,
    };

    // Check each audience's signals
    for (const [audienceKey, audience] of Object.entries(AUDIENCES)) {
      const key = audienceKey as AudienceType;

      // Primary signals (high weight)
      for (const signal of audience.signals) {
        if (profileText.includes(signal.toLowerCase())) {
          scores[key] += 3;
          signals.push(`${key}: "${signal}"`);
        }
      }

      // Investment interests for funders
      if (key === 'funder' && 'investmentInterests' in audience) {
        for (const interest of audience.investmentInterests) {
          if (profileText.includes(interest.toLowerCase())) {
            scores[key] += 1.5;
            signals.push(`funder interest: "${interest}"`);
          }
        }
      }

      // Interests for debaters
      if (key === 'debater' && 'interests' in audience) {
        for (const interest of audience.interests) {
          if (profileText.includes(interest.toLowerCase())) {
            scores[key] += 1;
            signals.push(`debater interest: "${interest}"`);
          }
        }
      }

      // FIXED: Network value for friends (was missing!)
      if (key === 'friend' && 'networkValue' in audience) {
        for (const value of audience.networkValue) {
          if (profileText.includes(value.toLowerCase())) {
            scores[key] += 2;
            signals.push(`friend network value: "${value}"`);
          }
        }
      }
    }

    // Disambiguation: Ambassador vs Debater
    // Ambassador signals: entrepreneurial, side-hustle, organizer
    const ambassadorIntent = /entrepreneur|side.?hustle|organiz|run.*event|host|chapter|lead/i;
    // Debater signals: miss competing, former debater looking back
    const debaterIntent = /miss.*debat|former.*debat|used to.*debat|love.*compet/i;

    if (ambassadorIntent.test(profileText)) {
      scores.ambassador += 2;
      signals.push('ambassador intent: entrepreneurial/organizer signals');
    }
    if (debaterIntent.test(profileText)) {
      scores.debater += 2;
      signals.push('debater intent: misses competing signals');
    }

    // Find primary and secondary
    const sortedAudiences = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);

    const primary = (sortedAudiences[0]?.[0] as AudienceType) || 'friend';
    const secondary = sortedAudiences[1]?.[0] as AudienceType | undefined;
    const scoreValues = Object.values(scores);
    const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;

    // Calculate confidence based on score and differentiation (safe from NaN)
    const secondMaxScore = sortedAudiences[1]?.[1] || 0;
    const differentiation = maxScore > 0 ? (maxScore - secondMaxScore) / maxScore : 0;
    const rawConfidence = maxScore > 0
      ? Math.min(0.95, 0.4 + (maxScore * 0.05) + (differentiation * 0.3))
      : 0.3;
    // Guard against NaN
    const confidence = Number.isFinite(rawConfidence) ? rawConfidence : 0.3;

    return {
      primary,
      secondary: secondary && scores[secondary] > 1 ? secondary : undefined,
      confidence,
      signals,
      personalizationHooks: [],
      fitAssessment: { resonance: 0, relevance: 0, reach: 0, overall: 0, reasoning: [] },
      aiEnhanced: false,
    };
  }

  private isAmbiguousClassification(result: AudienceClassification): boolean {
    // Ambiguous if secondary audience is close to primary
    return result.secondary !== undefined && result.confidence < 0.75;
  }

  private async classifyWithAI(
    profile: ProfileData,
    keywordResult: AudienceClassification
  ): Promise<AudienceClassification | null> {
    try {
      const prompt = `Classify this LinkedIn profile into one of four audiences for SuperDebate.org outreach:

AUDIENCES:
1. FUNDER - Angel investors, VCs, grant-makers, sponsors who can financially support
2. AMBASSADOR - People who could run local debate clubs (former debaters + organizers + entrepreneurial)
3. DEBATER - People who want to COMPETE in debate events (miss competing, former debaters)
4. FRIEND - Mission-aligned people who could make intros, share, give advice

PROFILE:
Name: ${profile.name}
Headline: ${profile.headline || 'N/A'}
Title: ${profile.title || 'N/A'}
Company: ${profile.company || 'N/A'}
About: ${(profile.about || '').substring(0, 500)}
Skills: ${(profile.skills || []).join(', ')}

KEYWORD ANALYSIS SUGGESTS: ${keywordResult.primary} (${Math.round(keywordResult.confidence * 100)}% confidence)
Signals found: ${keywordResult.signals.join(', ')}

Respond with JSON:
{
  "primary": "funder|ambassador|debater|friend",
  "secondary": "funder|ambassador|debater|friend|null",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const aiResult = JSON.parse(completion.choices[0]?.message?.content || '{}');

      // Validate AI response schema to prevent invalid values propagating
      const validAudienceTypes = ['funder', 'ambassador', 'debater', 'friend'] as const;
      const validatedPrimary = validAudienceTypes.includes(aiResult.primary)
        ? aiResult.primary
        : keywordResult.primary;
      const validatedSecondary = validAudienceTypes.includes(aiResult.secondary)
        ? aiResult.secondary
        : keywordResult.secondary;
      const validatedConfidence = typeof aiResult.confidence === 'number' &&
        aiResult.confidence >= 0 && aiResult.confidence <= 1
        ? aiResult.confidence
        : keywordResult.confidence;

      return {
        ...keywordResult,
        primary: validatedPrimary,
        secondary: validatedSecondary,
        confidence: Math.max(keywordResult.confidence, validatedConfidence),
        signals: [...keywordResult.signals, `AI: ${aiResult.reasoning || ''}`],
        aiEnhanced: true,
      };
    } catch (error) {
      console.error('AI classification failed:', error);
      return null;
    }
  }

  // ==========================================================================
  // FIT ASSESSMENT
  // ==========================================================================

  private calculateFitAssessment(
    profile: ProfileData,
    classification: AudienceClassification
  ): FitAssessment {
    const profileText = this.buildProfileText(profile).toLowerCase();
    const reasoning: string[] = [];

    // RESONANCE: How likely to care about the mission
    let resonance = 0.3; // Base
    const resonanceSignals = [
      'discourse', 'debate', 'ideas', 'intellectual', 'civic', 'democracy',
      'free speech', 'community', 'critical thinking', 'rhetoric',
    ];
    for (const signal of resonanceSignals) {
      if (profileText.includes(signal)) {
        resonance += 0.1;
        reasoning.push(`Resonance: "${signal}" suggests mission alignment`);
      }
    }
    resonance = Math.min(0.95, resonance);

    // RELEVANCE: How well they match target audience
    let relevance = classification.confidence;
    if (classification.signals.length > 3) {
      relevance = Math.min(0.95, relevance + 0.1);
      reasoning.push(`Relevance: Strong signal match (${classification.signals.length} signals)`);
    }

    // REACH: Potential impact if they engage
    let reach = 0.3; // Base
    const reachSignals = [
      'founder', 'ceo', 'investor', 'partner', 'director', 'head of',
      'influencer', 'author', 'speaker', 'podcast', 'newsletter',
      '10k+ followers', '50k+ connections',
    ];
    for (const signal of reachSignals) {
      if (profileText.includes(signal)) {
        reach += 0.15;
        reasoning.push(`Reach: "${signal}" indicates influence`);
      }
    }
    reach = Math.min(0.95, reach);

    // Overall weighted score
    const overall = (resonance * 0.35) + (relevance * 0.4) + (reach * 0.25);

    return { resonance, relevance, reach, overall, reasoning };
  }

  // ==========================================================================
  // PERSONALIZATION HOOKS
  // ==========================================================================

  private async findPersonalizationHooks(
    profile: ProfileData,
    audience: AudienceType
  ): Promise<string[]> {
    const hooks: string[] = [];
    const profileText = this.buildProfileText(profile);

    // Debate background (with specific extraction)
    const debatePatterns = [
      { pattern: /debated? at (\w+\s?\w*)/i, label: 'Debated at' },
      { pattern: /(\w+)\s+debate team/i, label: 'Debate team at' },
      { pattern: /(policy|lincoln.?douglas|parliamentary|public forum)\s+debate/i, label: 'Format' },
      { pattern: /debate (captain|president|coach)/i, label: 'Debate leadership' },
      { pattern: /model un at (\w+)/i, label: 'Model UN at' },
      { pattern: /mock trial/i, label: 'Mock trial background' },
      { pattern: /speech.{1,5}debate/i, label: 'Speech & Debate' },
    ];

    for (const { pattern, label } of debatePatterns) {
      const match = profileText.match(pattern);
      if (match) {
        hooks.push(`${label}: ${match[0]}`);
      }
    }

    // Community building experience
    const communityMatch = profileText.match(
      /(organiz|founded?|built|run|lead).{1,30}(community|club|chapter|meetup|event)/i
    );
    if (communityMatch) {
      hooks.push(`Community builder: ${communityMatch[0].substring(0, 50)}`);
    }

    // Investment focus (for funders)
    if (audience === 'funder') {
      const investMatch = profileText.match(
        /invest.{1,30}(community|consumer|media|education|civic|sports|edtech)/i
      );
      if (investMatch) {
        hooks.push(`Investment focus: ${investMatch[1]}`);
      }
    }

    // Location (for ambassadors and debaters)
    if ((audience === 'ambassador' || audience === 'debater') && profile.location) {
      hooks.push(`Location: ${profile.location}`);
    }

    // Recent activity relevance
    if (profile.recentActivity?.match(/discourse|debate|ideas|speech|civic|community/i)) {
      hooks.push('Recent activity: Engaged with relevant topics');
    }

    // Shared connections or background
    if (profileText.match(/chicago|portland|bali/i)) {
      hooks.push('Location overlap: SuperDebate has run events there');
    }

    return hooks;
  }

  // ==========================================================================
  // MESSAGE GENERATION
  // ==========================================================================

  async generateMessage(
    profile: ProfileData,
    classification: AudienceClassification
  ): Promise<GeneratedMessage> {
    const firstName = profile.name?.split(' ')[0] || 'there';
    const audience = AUDIENCES[classification.primary];
    const template = MESSAGE_TEMPLATES[classification.primary];

    // Generate personalization with AI
    const personalization = await this.generatePersonalization(profile, classification);

    // Build message parts
    const parts = this.buildMessageParts(firstName, classification, personalization);

    // Construct full message from template structure
    const fullMessage = this.constructMessage(template, parts);

    // Check for banned phrases
    const riskFlags = this.checkQualityRules(fullMessage, personalization);

    // Generate hash for deduplication (include audience type)
    const messageHash = this.hashMessage(fullMessage, classification.primary);

    // Check uniqueness against database (not in-memory)
    const isUnique = await this.isMessageUnique(messageHash);

    if (!isUnique) {
      riskFlags.push('duplicate_message');
    }

    return {
      fullMessage,
      parts,
      audienceType: classification.primary,
      confidence: classification.confidence,
      riskFlags,
      messageHash,
      isUnique,
    };
  }

  private async generatePersonalization(
    profile: ProfileData,
    classification: AudienceClassification
  ): Promise<string> {
    try {
      const prompt = `Write a personalized opening line for a LinkedIn message from John Thomas Connor (founder of SuperDebate) to this person.

PROFILE:
Name: ${profile.name}
Headline: ${profile.headline || 'N/A'}
Company: ${profile.company || 'N/A'}
About: ${(profile.about || '').substring(0, 300)}

AUDIENCE TYPE: ${classification.primary}
HOOKS TO REFERENCE: ${classification.personalizationHooks.join(', ') || 'None specific'}

JOHN'S VOICE:
- Warm and genuine, not corporate
- Reference something SPECIFIC from their profile
- If they have debate background, mention John was a policy debater too
- Max 160 characters

Return JSON: { "personalization": "The opening line" }`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 100,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      let personalization = result.personalization || '';

      // Truncate if needed
      if (personalization.length > 160) {
        personalization = personalization.substring(0, 157) + '...';
      }

      return personalization;
    } catch (error) {
      console.error('Personalization generation failed:', error);
      return '';
    }
  }

  private buildMessageParts(
    firstName: string,
    classification: AudienceClassification,
    personalization: string
  ): GeneratedMessage['parts'] {
    const audience = AUDIENCES[classification.primary];
    const isDebater = classification.primary === 'debater' ||
                      classification.personalizationHooks.some(h => h.toLowerCase().includes('debate'));

    // Traction varies by audience
    let traction: string;
    if (classification.primary === 'debater') {
      traction = `We've run events in ${SUPERDEBATE_FACTS.eventLocations.join(', ')}, and we're building toward regional and national championships.`;
    } else if (classification.primary === 'ambassador') {
      traction = `I've run ${SUPERDEBATE_FACTS.eventsRun} across ${SUPERDEBATE_FACTS.eventLocations.join(', ')} and built the core platform.`;
    } else {
      traction = `I've run events across ${SUPERDEBATE_FACTS.eventLocations.join(', ')}, built the core platform, and now I'm recruiting ambassadors to launch clubs in ${SUPERDEBATE_FACTS.targetCities} cities while raising ${SUPERDEBATE_FACTS.raising}.`;
    }

    // Add debate connection if relevant
    let enhancedPersonalization = personalization;
    if (isDebater && personalization && !personalization.includes('debater too')) {
      // Check if we should add John's debate background
      const hasDebateHook = classification.personalizationHooks.some(
        h => h.toLowerCase().includes('debate')
      );
      if (hasDebateHook && !personalization.toLowerCase().includes('policy debater')) {
        enhancedPersonalization = personalization.replace(/\.?\s*$/, '—') +
          `I was a policy debater too.`;
      }
    }

    return {
      greeting: `${JOHN_VOICE.opener} ${firstName}!`,
      warmPhrase: JOHN_VOICE.warmPhrases[0],
      personalization: enhancedPersonalization,
      mission: JOHN_VOICE.missionStatement,
      traction,
      cta: audience.cta,
      signOff: JOHN_VOICE.signOff,
    };
  }

  private constructMessage(
    template: typeof MESSAGE_TEMPLATES[AudienceType],
    parts: GeneratedMessage['parts']
  ): string {
    // Use the structure from template, or default structure
    const structure = template.structure || MESSAGE_TEMPLATES.friend.structure;

    return structure
      .map(line => {
        return line
          .replace('{greeting}', parts.greeting)
          .replace('{warm_phrase}', parts.warmPhrase)
          .replace('{personalization}', parts.personalization)
          .replace('{mission}', parts.mission)
          .replace('{mission_short}', `I'm building SuperDebate.org—competitive debate leagues for adults in ${SUPERDEBATE_FACTS.targetCities}+ cities.`)
          .replace('{ambassador_pitch}', `I'm recruiting ambassadors to run local clubs. It pays ${SUPERDEBATE_FACTS.ambassadorPay.perEvent}/event plus bonuses, and the larger your club grows, the more you earn.`)
          .replace('{debate_connection}', '')
          .replace('{traction}', parts.traction)
          .replace('{traction_debater}', parts.traction)
          .replace('{cta}', parts.cta)
          .replace('{sign_off}', parts.signOff)
          .replace('{locations}', SUPERDEBATE_FACTS.eventLocations.join(', '))
          .replace('{target_cities}', SUPERDEBATE_FACTS.targetCities)
          .replace('{raising}', SUPERDEBATE_FACTS.raising)
          .replace('{ambassador_pay}', SUPERDEBATE_FACTS.ambassadorPay.perEvent);
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // Clean up extra newlines
      .trim();
  }

  private checkQualityRules(fullMessage: string, personalization: string): string[] {
    const riskFlags: string[] = [];
    const lowerMessage = fullMessage.toLowerCase();

    // Check banned phrases
    for (const phrase of QUALITY_RULES.bannedPhrases) {
      if (lowerMessage.includes(phrase.toLowerCase())) {
        riskFlags.push(`banned_phrase:${phrase}`);
      }
    }

    // Check if personalization is too generic or missing
    if (!personalization || personalization.length < 20) {
      riskFlags.push('weak_personalization');
    }

    // Check for corporate-speak patterns
    const corporatePatterns = [
      /leverage/i, /utilize/i, /synergize/i, /circle back/i,
      /touch base/i, /low.hanging fruit/i, /move the needle/i,
    ];
    for (const pattern of corporatePatterns) {
      if (pattern.test(fullMessage)) {
        riskFlags.push('corporate_speak');
        break;
      }
    }

    return riskFlags;
  }

  private hashMessage(message: string, audienceType?: AudienceType): string {
    // Normalize message for comparison (remove names, lowercase)
    // Include audience type to allow same message structure for different audiences
    const normalized = message
      .toLowerCase()
      .replace(/howdy \w+/g, 'howdy NAME')
      .replace(/hey \w+/g, 'hey NAME')
      .replace(/hi \w+/g, 'hi NAME');

    // Include audience type in hash so same template for different audiences isn't flagged
    const hashInput = audienceType ? `${audienceType}:${normalized}` : normalized;
    // Use SHA-256 instead of MD5 - MD5 is cryptographically broken
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  // ==========================================================================
  // RESPONSE CLASSIFICATION
  // ==========================================================================

  async classifyResponse(responseText: string): Promise<ResponseClassification> {
    const lowerResponse = responseText.toLowerCase();

    // Quick pattern matching first
    const patterns: Array<{ type: ResponseClassification['type']; patterns: RegExp[]; escalate: boolean }> = [
      {
        type: 'positive',
        patterns: [/love to (connect|chat|talk)/i, /sounds (great|interesting|amazing)/i, /i'm in/i, /let's (do it|chat)/i],
        escalate: true,
      },
      {
        type: 'send_more_info',
        patterns: [/send.*(more|info|details)/i, /tell me more/i, /deck/i, /learn more/i],
        escalate: false,
      },
      {
        type: 'busy',
        patterns: [/busy|swamped|not a good time|circle back|later/i],
        escalate: false,
      },
      {
        type: 'intro_offered',
        patterns: [/know someone|introduce|connect you with|put you in touch/i],
        escalate: true,
      },
      {
        type: 'hard_no',
        patterns: [/not interested|no thanks|pass|unsubscribe|stop/i],
        escalate: false,
      },
    ];

    for (const { type, patterns: regexes, escalate } of patterns) {
      for (const pattern of regexes) {
        if (pattern.test(lowerResponse)) {
          // Only access RESPONSE_TEMPLATES for types that exist in it
          const templateType = type as keyof typeof RESPONSE_TEMPLATES;
          const suggestedReply = templateType in RESPONSE_TEMPLATES
            ? RESPONSE_TEMPLATES[templateType]
            : '';
          return {
            type,
            confidence: 0.8,
            suggestedReply,
            escalateToJohn: escalate,
            reasoning: `Matched pattern: ${pattern}`,
          };
        }
      }
    }

    // If no pattern match, use AI
    try {
      const prompt = `Classify this LinkedIn response to a SuperDebate outreach message:

RESPONSE: "${responseText}"

Categories:
- positive: Wants to connect, interested
- send_more_info: Wants to see deck/details first
- busy: Not now but maybe later
- intro_offered: Can introduce to someone else
- hard_no: Not interested, please stop
- unclear: Can't determine intent

Return JSON:
{
  "type": "positive|send_more_info|busy|intro_offered|hard_no|unclear",
  "confidence": 0.0-1.0,
  "escalate": true/false (true if high-value or needs human touch),
  "reasoning": "brief explanation"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 150,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      const type = result.type as ResponseClassification['type'] || 'unclear';

      return {
        type,
        confidence: result.confidence || 0.5,
        suggestedReply: RESPONSE_TEMPLATES[type as keyof typeof RESPONSE_TEMPLATES] || '',
        escalateToJohn: result.escalate || type === 'positive' || type === 'intro_offered',
        reasoning: result.reasoning || 'AI classification',
      };
    } catch (error) {
      return {
        type: 'unclear',
        confidence: 0.3,
        suggestedReply: '',
        escalateToJohn: true,
        reasoning: 'Classification failed, escalating for human review',
      };
    }
  }

  // ==========================================================================
  // FOLLOW-UP MANAGEMENT
  // ==========================================================================

  generateFollowUp(
    firstName: string,
    daysSinceContact: number
  ): { template: string; type: string } | null {
    // Day 3-4 range
    if (daysSinceContact >= 3 && daysSinceContact <= 4) {
      return {
        template: FOLLOW_UP_SEQUENCES.no_response_day_3.template.replace('{first_name}', firstName),
        type: 'day_3',  // Matches database CHECK constraint: 'day_3', 'day_7', 'custom'
      };
    }

    // Day 7-10 range
    if (daysSinceContact >= 7 && daysSinceContact <= 10) {
      return {
        template: FOLLOW_UP_SEQUENCES.no_response_day_7.template.replace('{first_name}', firstName),
        type: 'day_7',  // Matches database CHECK constraint: 'day_3', 'day_7', 'custom'
      };
    }

    return null;
  }

  // ==========================================================================
  // DATABASE OPERATIONS
  // ==========================================================================

  /**
   * Check if a message hash already exists in the database
   * Replaces in-memory Set check to survive restarts/cold starts
   *
   * SECURITY: Fails CLOSED - if we can't verify uniqueness, block the message
   * This prevents duplicate sends when the database is unavailable
   *
   * NOTE: For sending, prefer claimMessageHash() to avoid TOCTOU race
   */
  async isMessageUnique(messageHash: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('sent_message_hashes')
        .select('hash')
        .eq('hash', messageHash)
        .maybeSingle();

      if (error) {
        // FAIL CLOSED: If we can't check, assume not unique to prevent duplicates
        console.error('Failed to check message uniqueness - blocking message to prevent duplicates:', error);
        return false;
      }

      return !data; // Unique if no existing record found
    } catch (error) {
      // FAIL CLOSED: Exception means we can't verify, so block the message
      console.error('Exception checking message uniqueness - blocking message:', error);
      return false;
    }
  }

  /**
   * ATOMIC claim of a message hash - prevents TOCTOU race condition
   * Returns true if we successfully claimed (first to insert), false if already exists
   *
   * This is the preferred method for send operations - combines check+mark in one atomic op
   */
  async claimMessageHash(
    messageHash: string,
    campaignId?: string,
    connectionId?: string
  ): Promise<{ claimed: boolean; error: Error | null }> {
    try {
      // Use INSERT - if unique constraint violation, hash already exists
      // This is atomic: first insert wins
      const { data, error } = await this.supabase
        .from('sent_message_hashes')
        .insert({
          hash: messageHash,
          campaign_id: campaignId || this.currentCampaignId,
          connection_id: connectionId,
          created_at: new Date().toISOString(),
        })
        .select('hash')
        .single();

      if (error) {
        // Check if it's a unique constraint violation (23505)
        if (error.code === '23505') {
          // Hash already exists - not an error, just means we didn't claim it
          return { claimed: false, error: null };
        }
        // Table doesn't exist - fallback to in-memory dedup (graceful degradation)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('sent_message_hashes table missing - using in-memory dedup');
          if (this.sentMessageHashes.has(messageHash)) {
            return { claimed: false, error: null };
          }
          this.sentMessageHashes.add(messageHash);
          return { claimed: true, error: null };
        }
        console.error('Failed to claim message hash:', error);
        return { claimed: false, error: new Error(error.message) };
      }

      // If we got data back, we successfully claimed
      return { claimed: !!data, error: null };
    } catch (error) {
      // FAIL CLOSED: Exception means we can't verify, so don't claim
      console.error('Exception claiming message hash:', error);
      return { claimed: false, error: error as Error };
    }
  }

  /**
   * Mark a message hash as sent by persisting to database
   * Now survives API restarts and serverless cold starts
   *
   * NOTE: For new sends, prefer claimMessageHash() which is atomic
   * This method is kept for backwards compatibility and manual marking
   */
  async markMessageSent(
    messageHash: string,
    campaignId?: string,
    connectionId?: string
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('sent_message_hashes')
        .upsert({
          hash: messageHash,
          campaign_id: campaignId || this.currentCampaignId,
          connection_id: connectionId,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'hash',
          ignoreDuplicates: true, // Don't error on duplicate
        });

      if (error) {
        console.error('Failed to persist message hash:', error);
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      console.error('Exception persisting message hash:', error);
      return { error: error as Error };
    }
  }

  /**
   * Set the current campaign context for hash operations
   * Also migrates any existing hashes from campaign_targets to the new table
   */
  async loadSentHashes(campaignId: string): Promise<void> {
    this.currentCampaignId = campaignId;

    try {
      // Check if we need to migrate hashes from campaign_targets
      // This is a one-time migration for existing data
      const { data: existingHashes, error: hashCheckError } = await this.supabase
        .from('sent_message_hashes')
        .select('hash')
        .eq('campaign_id', campaignId)
        .limit(1);

      // Table doesn't exist - graceful degradation
      if (hashCheckError?.code === '42P01' || hashCheckError?.message?.includes('does not exist')) {
        console.warn('sent_message_hashes table missing - using in-memory dedup only');
        return;
      }

      // If no hashes exist for this campaign, migrate from campaign_targets
      if (!hashCheckError && (!existingHashes || existingHashes.length === 0)) {
        const { data: targets } = await this.supabase
          .from('campaign_targets')
          .select('connection_id, personalized_message')
          .eq('campaign_id', campaignId)
          .not('personalized_message', 'is', null);

        if (targets && targets.length > 0) {
          const hashRecords = targets
            .filter(t => t.personalized_message)
            .map(t => ({
              hash: this.hashMessage(t.personalized_message),
              campaign_id: campaignId,
              connection_id: t.connection_id,
              created_at: new Date().toISOString(),
            }));

          if (hashRecords.length > 0) {
            const { error: insertError } = await this.supabase
              .from('sent_message_hashes')
              .upsert(hashRecords, {
                onConflict: 'hash',
                ignoreDuplicates: true,
              });

            if (insertError) {
              console.error('Failed to migrate hashes to database:', insertError);
            } else {
              console.log(`Migrated ${hashRecords.length} hashes for campaign ${campaignId}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load/migrate sent hashes:', error);
      // Non-critical - continue even if migration fails
    }
  }

  /**
   * Save classification to the database
   * Returns error information so callers can handle failures
   */
  async saveClassification(
    connectionId: string,
    classification: AudienceClassification
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.from('connections').update({
        audience_types: [classification.primary, classification.secondary].filter(Boolean),
        profile_signals: {
          signals: classification.signals,
          hooks: classification.personalizationHooks,
          confidence: classification.confidence,
          fit: classification.fitAssessment,
          aiEnhanced: classification.aiEnhanced,
        },
        updated_at: new Date().toISOString(),
      }).eq('id', connectionId);

      if (error) {
        console.error('Failed to save classification:', error);
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      console.error('Exception saving classification:', error);
      return { error: error as Error };
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private buildProfileText(profile: ProfileData): string {
    return [
      profile.name,
      profile.headline,
      profile.company,
      profile.title,
      profile.about,
      profile.location,
      (profile.skills || []).join(' '),
      profile.recentActivity,
    ].filter(Boolean).join(' ');
  }

  getResponseTemplate(type: keyof typeof RESPONSE_TEMPLATES): string {
    return RESPONSE_TEMPLATES[type];
  }

  getObjectionResponse(type: keyof typeof OBJECTIONS): string {
    return OBJECTIONS[type];
  }
}

export default SuperDebateOutreachService;
