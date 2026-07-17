-- Step 1 of 2 — ADD enum value only, then commit.
-- Run this ALONE in Supabase SQL Editor, wait for success, then run
-- migration-free-onboarding-step2.sql

ALTER TYPE public.membership_type ADD VALUE IF NOT EXISTS 'free';
