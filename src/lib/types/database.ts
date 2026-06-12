import type { AlertType, BannerSlot, HelpCategory, StoredAlertType } from "../constants";
import type { DriverVerificationStatus } from "../verification";

export type MembershipType = "active_driver" | "annual_member" | "inactive";

export type AlertStatus =
  | "pending_review"
  | "active"
  | "expired"
  | "removed"
  | "rejected";

export interface Profile {
  id: string;
  display_name: string | null;
  phone_number: string | null;
  cabradar_user_id: string | null;
  driver_license_last4: string | null;
  membership_type: MembershipType;
  membership_expires_at: string | null;
  monthly_reports_count: number;
  monthly_votes_count: number;
  monthly_points: number;
  last_monthly_reset: string;
  verification_status: DriverVerificationStatus;
  is_admin: boolean;
  is_co_admin: boolean;
  co_admin_emergency_call: boolean;
  co_admin_manage_offers: boolean;
  beta_user: boolean;
  fab_enabled: boolean;
  alert_chime_enabled: boolean;
  push_enabled: boolean;
  push_prompted: boolean;
  reputation_score: number;
  report_usefulness_score: number;
  total_approved_reports: number;
  reward_points_balance: number;
  taxi_company_name: string | null;
  taxi_operator: string | null;
  taxi_number: string | null;
  taximeter_type: string | null;
  last_known_latitude: number | null;
  last_known_longitude: number | null;
  last_known_at: string | null;
  created_at: string;
  updated_at: string;
}

export type MessageStatus = "ny" | "behandlas" | "klar";

export type FeedbackStatus = MessageStatus;

export interface UserFeedback {
  id: string;
  user_id: string | null;
  cabradar_user_id: string | null;
  display_name: string | null;
  subject: string;
  message: string;
  app_version: string;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  user_id: string;
  cabradar_user_id: string;
  display_name: string | null;
  subject: string;
  message: string;
  app_version: string;
  status: MessageStatus;
  created_at: string;
}

export interface PartnerLead {
  id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string | null;
  offer_description: string;
  status: MessageStatus;
  created_at: string;
}

export interface DriverAlert {
  id: string;
  type: StoredAlertType;
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  road_address: string | null;
  city: string | null;
  created_by: string | null;
  created_at: string;
  expires_at: string;
  status: AlertStatus;
  admin_verified: boolean;
  is_major: boolean;
  upvotes: number;
  downvotes: number;
  confirmation_count: number;
  rejection_count: number;
  validation_status: "active" | "confirmed" | "resolved";
  emergency_last_latitude: number | null;
  emergency_last_longitude: number | null;
  emergency_last_gps_at: string | null;
  emergency_last_speed_mps: number | null;
  emergency_last_movement_at: string | null;
  updated_at: string;
}

export interface TaxiDeal {
  id: string;
  business_name: string;
  offer_title: string;
  offer_description: string;
  address: string;
  valid_until: string | null;
  image_url: string | null;
  is_active: boolean;
  monthly_partner_fee: number;
  start_date?: string | null;
  banner_a_url?: string | null;
  banner_b_url?: string | null;
  redemption_text?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

/** Driver-visible offer — no admin fields. */
export interface DriverOffer {
  id: string;
  business_name: string;
  offer_title: string;
  banner_a_url: string | null;
  banner_b_url: string | null;
  redemption_text: string;
  start_date: string | null;
  valid_until: string | null;
  is_active: boolean;
}

/** Admin offer view — includes private notes. */
export interface DriverOfferAdmin extends DriverOffer {
  offer_description: string;
  address: string;
  admin_notes: string;
  image_url: string | null;
  monthly_partner_fee: number;
  created_at: string;
  updated_at: string;
}

export interface BannerAd {
  id: string;
  slot: BannerSlot;
  title: string;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertInput {
  type: AlertType;
  title: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  road_address?: string | null;
  city?: string | null;
  is_major?: boolean;
}

export interface ReverseGeocodeResult {
  road_address: string | null;
  city: string | null;
}

export interface HelpArticle {
  id: string;
  title: string;
  category: HelpCategory;
  short_summary: string;
  body_content: string;
  step_by_step_instructions: string[];
  image_urls: string[];
  video_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  published: boolean;
  admin_verified: boolean;
  useful_votes: number;
  not_useful_votes: number;
  view_count: number;
}

export interface HelpArticleInput {
  title: string;
  category: HelpCategory;
  short_summary?: string;
  body_content?: string;
  step_by_step_instructions?: string[];
  image_urls?: string[];
  video_url?: string | null;
  tags?: string[];
  published?: boolean;
  admin_verified?: boolean;
}
