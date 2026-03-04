export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  has_accepted_current_policy?: boolean;
  is_superadmin?: boolean;
}

export interface SystemKeyStatus {
  key: string;
  label: string;
  description: string;
  is_set: boolean;
}

export interface SystemKeysResponse {
  keys: SystemKeyStatus[];
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  joined_at: string;
  user_name: string | null;
  user_email: string | null;
  user_avatar: string | null;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "declined" | "expired";
  created_at: string;
  expires_at: string;
  team_name: string | null;
}

export interface TeamSettings {
  llm_provider: string | null;
  has_llm_key: boolean;
  image_provider: string | null;
  has_image_key: boolean;
  tts_provider: string | null;
  has_tts_key: boolean;
}

export type VideoFormat = "youtube" | "youtube_shorts" | "tiktok" | "instagram" | "instagram_reels";
export type DurationTier = "short" | "medium" | "long";
export type PipelineStage = "brief" | "outline" | "scenario" | "scenes" | "characters" | "media_generation" | "review" | "assembly" | "complete";
export type StageStatus = "pending" | "generating" | "awaiting_approval" | "approved" | "needs_review" | "failed";

export interface Project {
  id: string;
  team_id: string;
  title: string;
  brief: string | null;
  format: VideoFormat;
  duration_tier: DurationTier;
  pipeline_stage: PipelineStage;
  pipeline_state: Record<string, StageStatus>;
  outline: string | null;
  scenario: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_locked: boolean;
  locked_by: string | null;
}

export interface ProjectListItem {
  id: string;
  title: string;
  format: VideoFormat;
  duration_tier: DurationTier;
  pipeline_stage: PipelineStage;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  scene_number: number;
  title: string | null;
  description: string | null;
  script: string | null;
  image_prompt: string | null;
  voiceover_text: string | null;
  status: StageStatus;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  assets: Asset[];
}

export interface Asset {
  id: string;
  scene_id: string;
  asset_type: "image" | "audio" | "subtitle";
  storage_path: string | null;
  status: StageStatus;
  metadata_: Record<string, unknown> | null;
  provider_used: string | null;
  created_at: string;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  appearance: Record<string, unknown> | null;
  clothing: string | null;
  personality: string | null;
  canonical_prompt: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  project_id: string;
  name: string;
  details: Record<string, unknown> | null;
  setting_description: string | null;
  canonical_prompt: string | null;
  created_at: string;
}

export interface Export {
  id: string;
  project_id: string;
  format: VideoFormat;
  status: "pending" | "processing" | "completed" | "failed";
  storage_path: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  created_at: string;
  completed_at: string | null;
  download_url: string | null;
}

export interface PipelineStatus {
  project_id: string;
  current_stage: PipelineStage;
  pipeline_state: Record<string, StageStatus>;
  active_job_id: string | null;
}

export interface ProgressMessage {
  type: "progress";
  project_id: string;
  stage: string;
  progress: number;
  message: string;
  status: "running" | "completed" | "failed";
}

export interface LockResponse {
  locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
}

export const VIDEO_FORMAT_LABELS: Record<VideoFormat, string> = {
  youtube: "YouTube (16:9)",
  youtube_shorts: "YouTube Shorts (9:16)",
  tiktok: "TikTok (9:16)",
  instagram: "Instagram (1:1)",
  instagram_reels: "Instagram Reels (9:16)",
};

export const DURATION_TIER_LABELS: Record<DurationTier, string> = {
  short: "Short (15-60s)",
  medium: "Medium (1-3 min)",
  long: "Long (3-6 min)",
};

export const PIPELINE_STAGES: PipelineStage[] = [
  "brief", "outline", "scenario", "scenes", "characters",
  "media_generation", "review", "assembly", "complete",
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  brief: "Brief",
  outline: "Outline",
  scenario: "Scenario",
  scenes: "Scenes",
  characters: "Characters",
  media_generation: "Media",
  review: "Review",
  assembly: "Assembly",
  complete: "Complete",
};
