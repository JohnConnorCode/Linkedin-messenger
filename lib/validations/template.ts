import { z } from 'zod';

export const templateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be less than 100 characters'),
  body: z
    .string()
    .min(10, 'Template body must be at least 10 characters')
    .max(2500, 'Template body must be less than 2500 characters')
    .refine(
      (body) => {
        // Check for balanced brackets
        const openBrackets = (body.match(/\{\{/g) || []).length;
        const closeBrackets = (body.match(/\}\}/g) || []).length;
        return openBrackets === closeBrackets;
      },
      { message: 'Template has unbalanced brackets' }
    ),
  is_active: z.boolean().default(true),
});

export const campaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name must be less than 100 characters'),
  template_id: z.string().uuid('Please select a valid template'),
  target_filter: z.object({
    company_includes: z.array(z.string()).optional(),
    tags_any: z.array(z.string()).optional(),
    not_contacted_days: z.number().min(0).optional(),
  }).default({}),
  require_manual_approval: z.boolean().default(true),
  daily_cap: z
    .number()
    .min(1, 'Daily cap must be at least 1')
    .max(200, 'Daily cap cannot exceed 200'),
  hourly_cap: z
    .number()
    .min(1, 'Hourly cap must be at least 1')
    .max(30, 'Hourly cap cannot exceed 30'),
  jitter_ms: z
    .number()
    .min(0)
    .max(10000),
  dwell_ms: z
    .number()
    .min(1000)
    .max(10000),
});

export const connectionSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  full_name: z.string().min(1, 'Name is required'),
  linkedin_url: z
    .string()
    .url('Must be a valid URL')
    .includes('linkedin.com', { message: 'Must be a LinkedIn URL' })
    .optional(),
  headline: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type TemplateFormData = z.infer<typeof templateSchema>;
export type CampaignFormData = z.infer<typeof campaignSchema>;
export type ConnectionFormData = z.infer<typeof connectionSchema>;