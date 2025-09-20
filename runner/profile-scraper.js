/**
 * LinkedIn Profile Scraper with AI Integration
 * Extracts profile data and generates personalized messages
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const crypto = require('crypto');
require('dotenv').config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class ProfileScraper {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
  }

  /**
   * Scrape profile data from LinkedIn profile page
   */
  async scrapeProfile(profileUrl) {
    try {
      this.logger.info(`Scraping profile: ${profileUrl}`);

      // Navigate to profile
      await this.page.goto(profileUrl, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(2000);

      // Extract profile data using multiple strategies
      const profileData = await this.page.evaluate(() => {
        const data = {};

        // Name
        const nameEl = document.querySelector('h1');
        data.name = nameEl?.textContent?.trim() || '';

        // Headline
        const headlineEl = document.querySelector('[data-generated-suggestion-target]') ||
                          document.querySelector('.text-body-medium');
        data.headline = headlineEl?.textContent?.trim() || '';

        // Current position
        const experienceSection = document.querySelector('[data-view-name="profile-card"]');
        if (experienceSection) {
          const titleEl = experienceSection.querySelector('span[aria-hidden="true"]');
          const companyEl = experienceSection.querySelector('span.t-normal');
          data.title = titleEl?.textContent?.trim() || '';
          data.company = companyEl?.textContent?.trim().split(' · ')[0] || '';
        }

        // About section
        const aboutSection = document.querySelector('#about')?.parentElement;
        if (aboutSection) {
          const aboutText = aboutSection.querySelector('.full-width span[aria-hidden="true"]');
          data.about = aboutText?.textContent?.trim() || '';
        }

        // Skills
        const skillsSection = document.querySelector('#skills')?.parentElement;
        if (skillsSection) {
          const skillElements = skillsSection.querySelectorAll('[data-field="skill_card_skill_topic"] span[aria-hidden="true"]');
          data.skills = Array.from(skillElements)
            .slice(0, 10)
            .map(el => el.textContent?.trim())
            .filter(Boolean);
        }

        // Recent activity
        const activitySection = document.querySelector('#recent-activity')?.parentElement;
        if (activitySection) {
          const activityText = activitySection.querySelector('.feed-shared-update-v2__description');
          data.recentActivity = activityText?.textContent?.trim() || '';
        }

        // Location
        const locationEl = document.querySelector('.text-body-small.t-black--light');
        data.location = locationEl?.textContent?.trim() || '';

        // Connection degree
        const connectionEl = document.querySelector('.dist-value');
        data.connectionDegree = connectionEl?.textContent?.trim() || '';

        // Profile picture URL
        const profilePicEl = document.querySelector('img.presence-entity__image');
        data.profilePicture = profilePicEl?.src || '';

        return data;
      });

      // Take screenshot for verification
      const screenshotPath = `./screenshots/profile_${Date.now()}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: false });

      this.logger.info('Profile scraped successfully:', profileData.name);
      return {
        success: true,
        data: profileData,
        screenshotPath,
        scrapedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Profile scraping error:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Save scraped profile to database
   */
  async saveProfile(connectionId, profileData) {
    try {
      const { data, error } = await supabase
        .from('profile_raw')
        .upsert({
          connection_id: connectionId,
          text: JSON.stringify(profileData),
          metadata: profileData,
          source_url: this.page.url(),
          scraped_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.info(`Profile saved for connection: ${connectionId}`);
      return data;
    } catch (error) {
      this.logger.error('Failed to save profile:', error);
      throw error;
    }
  }

  /**
   * Generate AI personalization for profile
   */
  async generatePersonalization(profileData, template, tone = 'professional') {
    try {
      // Generate cache key
      const cacheKey = crypto
        .createHash('sha256')
        .update(JSON.stringify({ profileData, template, tone }))
        .digest('hex');

      // Check cache first
      const cached = await this.checkCache(cacheKey);
      if (cached) {
        this.logger.info('Using cached personalization');
        return cached;
      }

      // Build prompts
      const systemPrompt = this.buildSystemPrompt(tone);
      const userPrompt = this.buildUserPrompt(profileData, template);

      // Call GPT-5 Nano
      const completion = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: tone === 'professional' ? 0.3 : 0.5,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const response = JSON.parse(completion.choices[0]?.message?.content || '{}');

      // Validate response
      const validated = this.validateAIResponse(response);

      // Cache if valid
      if (validated.riskFlags.length === 0) {
        await this.cacheResponse(cacheKey, validated);
      }

      return validated;

    } catch (error) {
      this.logger.error('AI personalization error:', error);
      return this.generateFallback(profileData);
    }
  }

  /**
   * Build system prompt for AI
   */
  buildSystemPrompt(tone) {
    const toneInstructions = {
      professional: 'Maintain a professional, respectful tone.',
      casual: 'Use a casual, friendly tone while remaining professional.',
      friendly: 'Be warm and approachable, showing genuine interest.',
      concise: 'Be extremely brief and to the point.',
      curious: 'Show genuine curiosity and ask thoughtful questions.'
    };

    return `You are a LinkedIn outreach specialist creating personalized messages.
    ${toneInstructions[tone] || toneInstructions.professional}

    Rules:
    1. Use only information explicitly in the profile
    2. No assumptions or sensitive inferences
    3. Be specific and genuine, avoid generic phrases
    4. Reference something specific from their background
    5. Keep first_line under 160 chars, midline under 200 chars

    Avoid: quick call, synergy, win-win, guarantee, urgent

    Return JSON:
    {
      "persona": {"label": "Role - Industry", "confidence": 0-1, "signals": []},
      "summary": "Brief profile summary",
      "firstLine": "Personalized opening referencing their profile",
      "midline": "Additional context or value",
      "variables": {"first_name": "", "company": ""},
      "riskFlags": [],
      "confidence": 0-1
    }`;
  }

  /**
   * Build user prompt with profile data
   */
  buildUserPrompt(profileData, template) {
    const profileSummary = [];

    if (profileData.name) profileSummary.push(`Name: ${profileData.name}`);
    if (profileData.headline) profileSummary.push(`Headline: ${profileData.headline}`);
    if (profileData.title) profileSummary.push(`Title: ${profileData.title}`);
    if (profileData.company) profileSummary.push(`Company: ${profileData.company}`);
    if (profileData.about) {
      const truncated = profileData.about.substring(0, 300);
      profileSummary.push(`About: ${truncated}${profileData.about.length > 300 ? '...' : ''}`);
    }
    if (profileData.skills?.length) {
      profileSummary.push(`Skills: ${profileData.skills.slice(0, 5).join(', ')}`);
    }
    if (profileData.recentActivity) {
      profileSummary.push(`Recent: ${profileData.recentActivity.substring(0, 200)}`);
    }

    return `Profile:
${profileSummary.join('\n')}

Template:
${template}

Task: Create a personalized message that feels natural and specific to this person.`;
  }

  /**
   * Validate AI response
   */
  validateAIResponse(response) {
    const riskFlags = [];
    const bannedPhrases = ['quick call', 'synergy', 'win-win', 'guarantee', 'urgent', 'limited time'];

    // Validate first line
    if (response.firstLine) {
      if (response.firstLine.length > 160) {
        response.firstLine = response.firstLine.substring(0, 157) + '...';
        riskFlags.push('truncated_first_line');
      }

      for (const phrase of bannedPhrases) {
        if (response.firstLine.toLowerCase().includes(phrase)) {
          riskFlags.push(`banned_phrase:${phrase}`);
        }
      }
    }

    // Validate midline
    if (response.midline && response.midline.length > 200) {
      response.midline = response.midline.substring(0, 197) + '...';
      riskFlags.push('truncated_midline');
    }

    // Ensure required fields
    response.persona = response.persona || { label: 'Professional', confidence: 0.5, signals: [] };
    response.summary = response.summary || 'Profile summary unavailable';
    response.variables = response.variables || {};
    response.riskFlags = [...new Set([...(response.riskFlags || []), ...riskFlags])];
    response.confidence = response.confidence || 0.5;

    return response;
  }

  /**
   * Generate fallback if AI fails
   */
  generateFallback(profileData) {
    const firstName = profileData.name?.split(' ')[0] || 'there';

    return {
      persona: { label: 'Professional', confidence: 0.3, signals: [] },
      summary: 'Unable to generate AI summary',
      firstLine: `Hi ${firstName}, I came across your profile and was impressed by your background.`,
      midline: '',
      variables: { first_name: firstName, company: profileData.company || '' },
      riskFlags: ['ai_fallback'],
      confidence: 0.3
    };
  }

  /**
   * Check cache for existing personalization
   */
  async checkCache(cacheKey) {
    try {
      const { data, error } = await supabase
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
        confidence: data.confidence_score || 0.5
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache AI response
   */
  async cacheResponse(cacheKey, response) {
    try {
      await supabase.from('profile_ai_summaries').upsert({
        input_hash: cacheKey,
        persona: response.persona,
        summary: response.summary,
        first_line: response.firstLine,
        midline: response.midline,
        custom_variables: response.variables,
        risk_flags: response.riskFlags,
        confidence_score: response.confidence,
        model: 'gpt-5-nano',
        validator_status: response.riskFlags.length === 0 ? 'approved' : 'flagged',
        cache_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      this.logger.error('Cache write error:', error);
    }
  }
}

module.exports = ProfileScraper;