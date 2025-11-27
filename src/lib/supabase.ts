import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'api', // Use api schema (views to affiliate tables)
  },
});

// Types for database tables
export interface F0Partner {
  id: string;
  phone: string;
  email: string;
  full_name: string;
  password_hash: string;
  referral_code: string | null;
  f0_code: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  admin_note: string | null;
}

export interface OTPVerification {
  id: string;
  phone: string;
  otp_code: string;
  registration_data: {
    email: string;
    full_name: string;
    password_hash: string;
    referral_code?: string;
  };
  expires_at: string;
  is_used: boolean;
  created_at: string;
  verified_at: string | null;
}
