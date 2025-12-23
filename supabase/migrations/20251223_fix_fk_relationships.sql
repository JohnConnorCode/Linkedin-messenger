-- Migration: Fix Missing Foreign Key Relationships
-- Date: 2023-12-23
-- Purpose: Add missing FKs that allow Supabase to infer join relationships

-- ============================================================================
-- FIX: campaign_targets -> connections relationship
-- The query uses connections!inner() which requires a FK relationship
-- ============================================================================

-- First check if the FK already exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'campaign_targets_connection_id_fkey'
    AND table_name = 'campaign_targets'
  ) THEN
    ALTER TABLE campaign_targets
    ADD CONSTRAINT campaign_targets_connection_id_fkey
    FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- FIX: ai_personalization_queue -> campaign_targets relationship
-- Ensure we can traverse: ai_personalization_queue -> campaign_targets -> connections
-- ============================================================================

-- The FK already exists in the original migration, but verify it's named correctly
-- campaign_target_id -> campaign_targets(id)

-- Add connection_id column to ai_personalization_queue for direct access
-- This is optional but simplifies queries
ALTER TABLE ai_personalization_queue
ADD COLUMN IF NOT EXISTS connection_id UUID;

-- Add FK constraint for the new column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ai_personalization_queue_connection_id_fkey'
    AND table_name = 'ai_personalization_queue'
  ) THEN
    ALTER TABLE ai_personalization_queue
    ADD CONSTRAINT ai_personalization_queue_connection_id_fkey
    FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for the connection_id column
CREATE INDEX IF NOT EXISTS idx_ai_queue_connection
ON ai_personalization_queue(connection_id)
WHERE connection_id IS NOT NULL;

-- ============================================================================
-- BACKFILL: Populate connection_id in ai_personalization_queue from campaign_targets
-- ============================================================================

UPDATE ai_personalization_queue aq
SET connection_id = ct.connection_id
FROM campaign_targets ct
WHERE aq.campaign_target_id = ct.id
AND aq.connection_id IS NULL;

-- ============================================================================
-- REFRESH SCHEMA CACHE HINT
-- After applying this migration, Supabase should recognize the relationships
-- ============================================================================

-- Add comment to document the relationships
COMMENT ON COLUMN ai_personalization_queue.connection_id IS
  'Direct FK to connections for easier querying. Backfilled from campaign_targets.';
