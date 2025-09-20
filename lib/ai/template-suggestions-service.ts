import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export interface TemplateSuggestion {
  id: string;
  name: string;
  body: string;
  variables: string[];
  category: 'introduction' | 'follow-up' | 'connection' | 'sales' | 'recruitment' | 'partnership';
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  industry?: string;
  role?: string;
  effectiveness_score: number;
  estimated_response_rate: number;
  ai_generated: boolean;
  best_for: string;
  tips: string[];
}

export class TemplateSuggestionsService {
  private openai: OpenAI;
  private supabase: any;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async generateTemplateSuggestions(params: {
    purpose: string;
    targetAudience?: string;
    industry?: string;
    tone?: string;
    existingTemplates?: any[];
    campaignPerformance?: any;
  }): Promise<TemplateSuggestion[]> {
    try {
      // Analyze existing templates performance if available
      const performanceInsights = await this.analyzeTemplatePerformance(params.existingTemplates);

      // Generate prompt for GPT-5 Nano
      const systemPrompt = `You are an expert LinkedIn outreach specialist with deep knowledge of what makes messages successful.
      Your task is to generate highly effective message templates based on data and best practices.

      Key principles:
      - Keep messages under 150 words
      - Personalization is crucial
      - Clear value proposition
      - Single clear call-to-action
      - Professional yet conversational tone

      Performance data from existing templates:
      ${JSON.stringify(performanceInsights, null, 2)}`;

      const userPrompt = `Generate 5 different LinkedIn message templates for the following:
      Purpose: ${params.purpose}
      Target Audience: ${params.targetAudience || 'General professionals'}
      Industry: ${params.industry || 'Various'}
      Tone: ${params.tone || 'Professional'}

      For each template, provide:
      1. Template name
      2. Message body with {{variables}}
      3. List of variables used
      4. Best use case
      5. Estimated response rate (based on industry data)
      6. 3 tips for using this template effectively

      Format as JSON array.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-nano', // Using GPT-5 Nano as specified
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const suggestions = JSON.parse(response.choices[0].message.content || '{"templates": []}');

      // Process and enhance suggestions
      return this.processSuggestions(suggestions.templates || [], params);
    } catch (error) {
      console.error('Error generating template suggestions:', error);
      // Fallback to pre-defined templates if AI fails
      return this.getFallbackTemplates(params);
    }
  }

  private async analyzeTemplatePerformance(existingTemplates?: any[]) {
    if (!existingTemplates || existingTemplates.length === 0) {
      return {
        averageResponseRate: 0.15,
        bestPerformingElements: ['personalization', 'clear value', 'short length'],
        worstPerformingElements: ['generic greetings', 'long paragraphs', 'multiple CTAs']
      };
    }

    // Analyze existing templates
    const analysis = {
      totalTemplates: existingTemplates.length,
      averageResponseRate: 0,
      bestPerformers: [],
      commonPatterns: {
        averageLength: 0,
        mostUsedVariables: [],
        successfulPhrases: []
      }
    };

    // Calculate metrics
    const responseRates = existingTemplates
      .filter(t => t.messages_sent > 0)
      .map(t => t.responses_received / t.messages_sent);

    if (responseRates.length > 0) {
      analysis.averageResponseRate = responseRates.reduce((a, b) => a + b, 0) / responseRates.length;
    }

    return analysis;
  }

  private async processSuggestions(rawSuggestions: any[], params: any): Promise<TemplateSuggestion[]> {
    return rawSuggestions.map((suggestion, index) => ({
      id: `ai-suggestion-${Date.now()}-${index}`,
      name: suggestion.name || `Template ${index + 1}`,
      body: suggestion.body || this.generateDefaultTemplate(params.purpose),
      variables: this.extractVariables(suggestion.body),
      category: this.categorizeTemplate(params.purpose),
      tone: params.tone || 'professional',
      industry: params.industry,
      role: params.targetAudience,
      effectiveness_score: this.calculateEffectivenessScore(suggestion),
      estimated_response_rate: suggestion.estimated_response_rate || 0.15,
      ai_generated: true,
      best_for: suggestion.best_use_case || 'General outreach',
      tips: suggestion.tips || this.getDefaultTips()
    }));
  }

  private extractVariables(templateBody: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(templateBody)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  private categorizeTemplate(purpose: string): TemplateSuggestion['category'] {
    const purposeLower = purpose.toLowerCase();

    if (purposeLower.includes('introduction') || purposeLower.includes('connect')) {
      return 'introduction';
    } else if (purposeLower.includes('follow')) {
      return 'follow-up';
    } else if (purposeLower.includes('sales') || purposeLower.includes('sell')) {
      return 'sales';
    } else if (purposeLower.includes('recruit') || purposeLower.includes('hire')) {
      return 'recruitment';
    } else if (purposeLower.includes('partner')) {
      return 'partnership';
    }

    return 'connection';
  }

  private calculateEffectivenessScore(suggestion: any): number {
    let score = 50; // Base score

    // Length bonus (shorter is better)
    const wordCount = (suggestion.body || '').split(' ').length;
    if (wordCount < 50) score += 20;
    else if (wordCount < 100) score += 10;

    // Variables bonus
    const variables = this.extractVariables(suggestion.body || '');
    score += Math.min(variables.length * 5, 20);

    // CTA bonus
    if ((suggestion.body || '').includes('?')) score += 10;

    return Math.min(score, 100);
  }

  private generateDefaultTemplate(purpose: string): string {
    return `Hi {{firstName}},

I noticed {{personalizedContext}} and wanted to reach out.

{{mainMessage}}

Would you be open to {{callToAction}}?

Best regards,
{{senderName}}`;
  }

  private getDefaultTips(): string[] {
    return [
      'Personalize the opening line with specific details from their profile',
      'Keep the message concise and focused on one clear value proposition',
      'End with a soft call-to-action that's easy to respond to'
    ];
  }

  private getFallbackTemplates(params: any): TemplateSuggestion[] {
    const templates: TemplateSuggestion[] = [
      {
        id: 'fallback-1',
        name: 'Professional Introduction',
        body: `Hi {{firstName}},

I came across your profile and noticed {{commonGround}}. Your experience in {{industry}} is impressive.

I'm reaching out because {{valueProposition}}.

Would you be open to a brief conversation about {{topic}}?

Best regards,
{{senderName}}`,
        variables: ['firstName', 'commonGround', 'industry', 'valueProposition', 'topic', 'senderName'],
        category: 'introduction',
        tone: 'professional',
        effectiveness_score: 85,
        estimated_response_rate: 0.18,
        ai_generated: false,
        best_for: 'Initial outreach to senior professionals',
        tips: [
          'Research their recent posts or activities for commonGround',
          'Keep valueProposition specific and relevant',
          'Suggest a specific time for the conversation'
        ]
      },
      {
        id: 'fallback-2',
        name: 'Casual Connection Request',
        body: `Hey {{firstName}}!

Love what you're doing at {{company}}! {{personalizedCompliment}}

I'm working on {{yourProject}} and thought we might have some interesting synergies.

Mind if we connect? Always great to meet fellow {{sharedInterest}} enthusiasts!

Cheers,
{{senderName}}`,
        variables: ['firstName', 'company', 'personalizedCompliment', 'yourProject', 'sharedInterest', 'senderName'],
        category: 'connection',
        tone: 'casual',
        effectiveness_score: 78,
        estimated_response_rate: 0.22,
        ai_generated: false,
        best_for: 'Connecting with peers in similar roles',
        tips: [
          'Use genuine compliments based on their work',
          'Keep the tone light and friendly',
          'Mention specific shared interests or connections'
        ]
      },
      {
        id: 'fallback-3',
        name: 'Value-First Outreach',
        body: `Hi {{firstName}},

I noticed you're working on {{theirChallenge}} at {{company}}.

I recently helped {{similarCompany}} achieve {{specificResult}} using {{solution}}.

I've put together a brief case study that might be relevant. Would you like me to share it?

No agenda - just thought it might be helpful!

{{senderName}}`,
        variables: ['firstName', 'theirChallenge', 'company', 'similarCompany', 'specificResult', 'solution', 'senderName'],
        category: 'sales',
        tone: 'professional',
        effectiveness_score: 92,
        estimated_response_rate: 0.25,
        ai_generated: false,
        best_for: 'B2B sales outreach with value proposition',
        tips: [
          'Lead with value, not with your ask',
          'Use specific metrics in specificResult',
          'Follow up with the case study immediately if they respond'
        ]
      },
      {
        id: 'fallback-4',
        name: 'Follow-Up Message',
        body: `Hi {{firstName}},

Hope you've been well! I wanted to follow up on our conversation about {{previousTopic}}.

Since we last spoke, {{newDevelopment}}.

I think this could be particularly relevant given {{theirGoal}}.

Any thoughts on {{nextStep}}?

Best,
{{senderName}}`,
        variables: ['firstName', 'previousTopic', 'newDevelopment', 'theirGoal', 'nextStep', 'senderName'],
        category: 'follow-up',
        tone: 'friendly',
        effectiveness_score: 88,
        estimated_response_rate: 0.35,
        ai_generated: false,
        best_for: 'Re-engaging previous conversations',
        tips: [
          'Reference specific details from previous interaction',
          'Provide new value or information',
          'Make the next step easy and specific'
        ]
      },
      {
        id: 'fallback-5',
        name: 'Recruitment Outreach',
        body: `Hi {{firstName}},

Your background in {{expertise}} at {{company}} caught my attention - particularly {{specificAchievement}}.

We're building something exciting in the {{industry}} space and looking for someone with exactly your skillset.

The role offers {{uniqueBenefit}} and the chance to {{opportunity}}.

Open to a quick chat about it?

{{senderName}}
{{companyName}}`,
        variables: ['firstName', 'expertise', 'company', 'specificAchievement', 'industry', 'uniqueBenefit', 'opportunity', 'senderName', 'companyName'],
        category: 'recruitment',
        tone: 'professional',
        effectiveness_score: 80,
        estimated_response_rate: 0.20,
        ai_generated: false,
        best_for: 'Recruiting passive candidates',
        tips: [
          'Highlight specific achievements from their profile',
          'Lead with what makes the opportunity unique',
          'Be transparent about the company and role'
        ]
      }
    ];

    // Filter based on params if needed
    if (params.purpose) {
      const category = this.categorizeTemplate(params.purpose);
      return templates.filter(t => t.category === category || templates.length < 3);
    }

    return templates;
  }

  // Get industry-specific templates
  async getIndustryTemplates(industry: string): Promise<TemplateSuggestion[]> {
    const industryTemplates = await this.generateTemplateSuggestions({
      purpose: `Professional outreach in ${industry}`,
      industry,
      targetAudience: `${industry} professionals`
    });

    return industryTemplates;
  }

  // Learn from campaign performance
  async learnFromPerformance(campaignId: string): Promise<void> {
    try {
      // Get campaign performance data
      const { data: campaign } = await this.supabase
        .from('campaigns')
        .select(`
          *,
          message_templates(*),
          send_logs(*)
        `)
        .eq('id', campaignId)
        .single();

      if (!campaign) return;

      // Calculate performance metrics
      const responseRate = campaign.send_logs.filter((l: any) => l.response_received).length /
                          campaign.send_logs.length;

      // Store learning for future suggestions
      await this.supabase.from('template_performance').insert({
        template_id: campaign.template_id,
        campaign_id: campaignId,
        response_rate: responseRate,
        sample_size: campaign.send_logs.length,
        industry: campaign.target_industry,
        analyzed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error learning from performance:', error);
    }
  }
}