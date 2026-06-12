-- CabRadar — Alert categories v2 — STEP 1 of 2
-- Run this FIRST in Supabase SQL Editor, then run migration-alert-categories-data.sql
--
-- PostgreSQL requires new enum values to be committed before use (55P04).

ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'total_stop';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'accident';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'taxi_emergency';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'taxi_info';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'traffic_control';
