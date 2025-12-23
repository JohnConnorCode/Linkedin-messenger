/**
 * SuperDebate Outreach Module
 * Complete outreach automation for SuperDebate.org
 *
 * Features:
 * - 4-audience classification (Funder, Ambassador, Debater, Friend)
 * - AI-enhanced personalization with John's voice
 * - Fit assessment (Resonance, Relevance, Reach)
 * - Message deduplication
 * - Response classification
 * - Follow-up automation
 * - Configurable templates
 */

// Configuration exports
export {
  JOHN_VOICE,
  AUDIENCES,
  SUPERDEBATE_FACTS,
  QUALITY_RULES,
  FOLLOW_UP_SEQUENCES,
  RESPONSE_TEMPLATES,
  OBJECTIONS,
  CONVERSATION_STAGES,
  LOST_REASONS,
  RESPONSE_AWARE_FOLLOW_UPS,
  QUALIFICATION_TEMPLATES,
  type AudienceType,
  type ConversationStage,
  type LostReason,
} from './config';

// Service exports
export {
  SuperDebateOutreachService,
  MESSAGE_TEMPLATES,
  type ProfileData,
  type FitAssessment,
  type AudienceClassification,
  type GeneratedMessage,
  type ResponseClassification,
} from './outreach-service';

export { default } from './outreach-service';
