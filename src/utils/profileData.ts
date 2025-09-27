import { supabase } from "@/integrations/supabase/client";

export interface SupabaseProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  total_points: number | null;
  created_at: string;
  updated_at?: string;
}

export interface ProfileStatsSummary {
  totalReadings: number;
  totalPoints: number;
  memberSince: string | null;
}

const isNoRowsError = (error: { code?: string } | null | undefined) => {
  return error?.code === "PGRST116";
};

export const fetchProfile = async (userId: string): Promise<SupabaseProfile | null> => {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id, email, full_name, avatar_url, total_points, created_at, updated_at")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (isNoRowsError(error)) {
      return null;
    }
    throw error;
  }

  return data ?? null;
};

export const fetchUserStats = async (userId: string): Promise<ProfileStatsSummary> => {
  if (!userId) {
    return {
      totalReadings: 0,
      totalPoints: 0,
      memberSince: null,
    };
  }

  const [{ data: profile, error: profileError }, { count, error: readingsError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("total_points, created_at")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("air_quality_readings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  if (profileError && !isNoRowsError(profileError)) {
    throw profileError;
  }

  if (readingsError) {
    throw readingsError;
  }

  const totalPoints = profile?.total_points ?? 0;
  const memberSince = profile?.created_at ?? null;

  return {
    totalReadings: count ?? 0,
    totalPoints,
    memberSince,
  };
};
