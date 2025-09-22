import { createClient } from '@supabase/supabase-js';
import { PersonalizationService } from '@/lib/ai/personalization-service';
import { LinkedInScraper } from '@/lib/scraper/linkedin-scraper';

export class AIProcessor {
  private supabase: any;
  private personalizationService: PersonalizationService;
  private scraper: LinkedInScraper;
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not configured');
    }

    // Initialize Supabase with service role for background processing
    this.supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    this.personalizationService = new PersonalizationService(
      supabaseUrl,
      supabaseKey
    );
    this.scraper = new LinkedInScraper();
  }

  async start() {
    if (this.isRunning) {
      console.log('AI Processor already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting AI Processor...');

    // Process queue every 10 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 10000);

    // Process immediately on start
    await this.processQueue();
  }

  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isRunning = false;
    console.log('AI Processor stopped');
  }

  private async processQueue() {
    try {
      // Get pending AI personalization requests
      const { data: pendingRequests, error } = await this.supabase
        .from('ai_personalization_queue')
        .select(`
          *,
          connections!inner(
            id,
            full_name,
            headline,
            company,
            linkedin_url,
            profile_raw
          ),
          campaigns!inner(
            id,
            ai_tone,
            ai_temperature,
            message_templates!inner(
              body,
              variables
            )
          )
        `)
        .eq('status', 'pending')
        .lt('attempts', 3)
        .limit(5);

      if (error) {
        console.error('Error fetching AI queue:', error);
        return;
      }

      if (!pendingRequests || pendingRequests.length === 0) {
        return;
      }

      console.log(`Processing ${pendingRequests.length} AI personalization requests`);

      // Process each request
      for (const request of pendingRequests) {
        await this.processPersonalizationRequest(request);
      }
    } catch (error) {
      console.error('Error in AI processing queue:', error);
    }
  }

  private async processPersonalizationRequest(request: any) {
    const startTime = Date.now();

    try {
      // Update status to processing
      await this.supabase
        .from('ai_personalization_queue')
        .update({
          status: 'processing',
          attempts: request.attempts + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', request.id);

      // Step 1: Get or scrape profile data
      let profileData = request.connections.profile_raw;

      if (!profileData && request.connections.linkedin_url) {
        console.log(`Scraping profile for ${request.connections.full_name}`);

        // Scrape the profile
        const scrapedData = await this.scraper.scrapeProfile(
          request.connections.linkedin_url
        );

        if (scrapedData) {
          // Save scraped data
          await this.supabase
            .from('profile_raw')
            .upsert({
              connection_id: request.connection_id,
              raw_data: scrapedData,
              scraped_at: new Date().toISOString()
            });

          profileData = scrapedData;
        }
      }

      // Step 2: Generate AI personalization
      const template = request.campaigns.message_templates;
      const personalizationRequest = {
        profileData: profileData || {
          name: request.connections.full_name,
          headline: request.connections.headline,
          company: request.connections.company
        },
        templateBody: template.body,
        variables: template.variables || {},
        tone: request.campaigns.ai_tone || 'professional',
        campaignContext: request.campaigns.context || ''
      };

      const personalization = await this.personalizationService.generatePersonalization(
        personalizationRequest
      );

      // Step 3: Apply template variables
      let finalMessage = template.body;
      const variableMapping = {
        '{{firstName}}': request.connections.full_name.split(' ')[0],
        '{{fullName}}': request.connections.full_name,
        '{{company}}': request.connections.company || 'your company',
        '{{headline}}': request.connections.headline || 'professional',
        '{{personalizedOpening}}': personalization.firstLine,
        '{{personalizedContext}}': personalization.midline || '',
        '{{commonGround}}': personalization.persona?.signals?.join(', ') || ''
      };

      for (const [variable, value] of Object.entries(variableMapping)) {
        finalMessage = finalMessage.replace(new RegExp(variable, 'g'), value);
      }

      // Step 4: Save AI summary
      const { data: summary } = await this.supabase
        .from('profile_ai_summaries')
        .insert({
          connection_id: request.connection_id,
          persona: personalization.persona,
          interests: personalization.variables?.interests || '',
          expertise: personalization.variables?.expertise || '',
          first_line: personalization.firstLine,
          midline: personalization.midline,
          confidence_score: personalization.confidence,
          model_used: 'gpt-5-nano',
          generated_at: new Date().toISOString()
        })
        .select()
        .single();

      // Step 5: Update personalization queue
      await this.supabase
        .from('ai_personalization_queue')
        .update({
          status: 'completed',
          first_line: personalization.firstLine,
          midline: personalization.midline,
          persona: personalization.persona,
          confidence_score: personalization.confidence,
          processing_time_ms: Date.now() - startTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      // Step 6: Update campaign target with final message
      const { data: target } = await this.supabase
        .from('campaign_targets')
        .select('id')
        .eq('campaign_id', request.campaign_id)
        .eq('connection_id', request.connection_id)
        .single();

      if (target) {
        await this.supabase
          .from('campaign_targets')
          .update({
            final_message: finalMessage,
            personalization_applied: true,
            ai_summary_id: summary?.id,
            approval_status: personalization.confidence >= 0.9 &&
                           request.campaigns.ai_auto_approve
                           ? 'approved'
                           : 'pending'
          })
          .eq('id', target.id);
      }

      console.log(`✓ Processed AI personalization for ${request.connections.full_name} (${personalization.confidence * 100}% confidence)`);

    } catch (error) {
      console.error(`Failed to process personalization for connection ${request.connection_id}:`, error);

      // Update with error
      await this.supabase
        .from('ai_personalization_queue')
        .update({
          status: request.attempts >= 2 ? 'failed' : 'pending',
          last_error: error instanceof Error ? error.message : String(error),
          processing_time_ms: Date.now() - startTime
        })
        .eq('id', request.id);
    }
  }

  // Process a single connection manually
  async processSingleConnection(connectionId: string, campaignId: string) {
    try {
      // Check if already in queue
      const { data: existing } = await this.supabase
        .from('ai_personalization_queue')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('campaign_id', campaignId)
        .single();

      if (existing) {
        console.log('Already in queue');
        return existing;
      }

      // Add to queue
      const { data: queued, error } = await this.supabase
        .from('ai_personalization_queue')
        .insert({
          connection_id: connectionId,
          campaign_id: campaignId,
          status: 'pending',
          attempts: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Process immediately
      await this.processPersonalizationRequest(queued);

      return queued;
    } catch (error) {
      console.error('Error processing single connection:', error);
      throw error;
    }
  }
}

// Singleton instance
let processor: AIProcessor | null = null;

export function getAIProcessor() {
  if (!processor) {
    processor = new AIProcessor();
  }
  return processor;
}