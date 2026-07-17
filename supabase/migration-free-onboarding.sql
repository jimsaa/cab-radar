-- CabRadar free onboarding — READ THIS FIRST
--
-- Postgres cannot ADD and USE a new enum value in the same transaction.
-- Run these as TWO separate queries in Supabase SQL Editor:
--
--   1) migration-free-onboarding-step1.sql   (ADD VALUE 'free' only)
--   2) migration-free-onboarding-step2.sql   (functions + partner_leads)
--
-- The combined script below is kept for reference but will fail if run as one block.

-- ========== STEP 1 (run alone, then stop) ==========
-- ALTER TYPE public.membership_type ADD VALUE IF NOT EXISTS 'free';

-- ========== STEP 2 (run after step 1 succeeds) ==========
-- See migration-free-onboarding-step2.sql
