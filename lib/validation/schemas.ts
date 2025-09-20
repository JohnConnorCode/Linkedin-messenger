import { z } from 'zod';

// UUID validation
const uuidSchema = z.string().uuid();

// Campaign schemas
export const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  template_id: z.string().uuid(),
  target_filter: z.object({
    company_includes: z.array(z.string()).optional(),
    tags_any: z.array(z.string()).optional(),
    not_contacted_days: z.number().int().positive().optional()
  }).optional(),
  require_manual_approval: z.boolean(),
  daily_cap: z.number().int().min(1).max(500),
  hourly_cap: z.number().int().min(1).max(50),
  jitter_ms: z.number().int().min(0).max(60000),
  dwell_ms: z.number().int().min(0).max(10000),
  ai_enabled: z.boolean(),
  ai_tone: z.enum(['professional', 'casual', 'friendly', 'concise', 'curious']).optional(),
  ai_temperature: z.number().min(0).max(1).optional(),
  ai_auto_approve: z.boolean().optional(),
  ai_min_confidence: z.number().min(0).max(1).optional()
});

export const updateCampaignSchema = createCampaignSchema.partial();

// Connection schemas
export const importConnectionsSchema = z.object({
  connections: z.array(z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().min(1),
    linkedin_url: z.string().url().optional(),
    headline: z.string().optional(),
    company: z.string().optional(),
    location: z.string().optional(),
    tags: z.array(z.string()).optional()
  })).min(1).max(1000)
});

// Task schemas
export const claimTaskSchema = z.object({
  runner_id: z.string().min(1),
  max_tasks: z.number().int().min(1).max(10).default(1)
});

export const completeTaskSchema = z.object({
  task_id: z.string().uuid(),
  runner_id: z.string().min(1),
  status: z.enum(['completed', 'failed', 'blocked']),
  error_message: z.string().optional(),
  screenshot_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
});

// AI processor schemas
export const aiProcessorActionSchema = z.object({
  action: z.enum(['start', 'stop', 'process-single']),
  connectionId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional()
});

// Scraper schemas
export const scraperActionSchema = z.object({
  action: z.enum(['scrape-profile', 'scrape-multiple']),
  profileUrl: z.string().url().optional(),
  profileUrls: z.array(z.string().url()).optional(),
  connectionId: z.string().uuid().optional()
});

// Template schemas
export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  body: z.string().min(10).max(5000),
  variables: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().default(true)
});

export const updateTemplateSchema = createTemplateSchema.partial();

// Message log schemas
export const createMessageLogSchema = z.object({
  campaign_id: z.string().uuid(),
  connection_id: z.string().uuid(),
  template_id: z.string().uuid(),
  message_body: z.string().min(1).max(5000),
  status: z.enum(['sent', 'failed', 'pending']),
  error_message: z.string().optional()
});

// Settings schemas
export const updateUserSettingsSchema = z.object({
  daily_send_limit: z.number().int().min(1).max(500).optional(),
  min_delay_between_messages: z.number().int().min(10).max(600).optional(),
  max_delay_between_messages: z.number().int().min(30).max(3600).optional(),
  auto_pause_on_rate_limit: z.boolean().optional(),
  require_manual_approval: z.boolean().optional(),
  browser_headless: z.boolean().optional(),
  timezone: z.string().optional(),
  quiet_hours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
  }).optional()
});

// Auth schemas
export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  full_name: z.string().min(1).max(100).optional()
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Helper function to validate request data
export function validateRequest<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// Sanitization helpers
export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization (consider using a library like DOMPurify for production)
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeSqlInput(input: string): string {
  // Basic SQL injection prevention (Supabase handles this, but extra safety)
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
}

// Rate limiting schema
export const rateLimitSchema = z.object({
  ip: z.string().ip(),
  endpoint: z.string(),
  timestamp: z.number(),
  count: z.number().int().positive()
});

// Export types
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ImportConnectionsInput = z.infer<typeof importConnectionsSchema>;
export type ClaimTaskInput = z.infer<typeof claimTaskSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;