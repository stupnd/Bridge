/**
 * The team's shared copy of Collect-page data in Supabase. Only accounts in
 * `team_members` can read or upload (see supabase/migrations); everyone else
 * keeps recording into this browser only.
 */
import { supabase } from "../../supabaseClient";
import type { Json } from "../../database.types";
import type { CollectData, CollectFrame, CollectSample, CollectSession, Hand, SignType } from "./collectData";

export async function isTeamMember(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  // RLS only ever returns the caller's own row.
  const { data, error } = await supabase.from("team_members").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  if (error) throw error;
  return !!data;
}

async function uploadSession(s: CollectSession) {
  const { error } = await supabase.from("recording_sessions").upsert({
    id: s.session_id,
    participant_id: s.participant_id,
    hand: s.hand,
    calibration_open: s.open,
    calibration_closed: s.closed,
    calibrated_at: s.calibrated_at,
  });
  if (error) throw error;
}

async function uploadSample(s: CollectSample) {
  const { error } = await supabase.from("recordings").upsert({
    id: s.sample_id,
    session_id: s.session_id,
    label: s.label,
    sign_type: s.sign_type,
    rep: s.rep,
    window_ms: s.window_ms,
    recorded_at: s.recorded_at,
    notes: s.notes,
    frames: s.frames as unknown as Json,
  });
  if (error) throw error;
}

/** Uploads every sample not yet marked `uploaded` (plus its session). Returns the ids that made it. */
export async function uploadPending(data: CollectData): Promise<Set<string>> {
  const pending = data.samples.filter((s) => !s.uploaded);
  const sessions = new Map(data.sessions.map((s) => [s.session_id, s]));
  const sent = new Set<string>();
  const sessionsSent = new Set<string>();
  for (const sample of pending) {
    const session = sessions.get(sample.session_id);
    if (!session) continue;
    if (!sessionsSent.has(session.session_id)) {
      await uploadSession(session);
      sessionsSent.add(session.session_id);
    }
    await uploadSample(sample);
    sent.add(sample.sample_id);
  }
  return sent;
}

export async function deleteUploadedSample(sampleId: string) {
  const { error } = await supabase.from("recordings").delete().eq("id", sampleId);
  if (error) throw error;
}

/** Everyone's recordings, in the same shape the Collect page stores locally. */
export async function fetchTeamData(): Promise<CollectData> {
  const [sessions, recordings] = await Promise.all([
    supabase.from("recording_sessions").select("*"),
    supabase.from("recordings").select("*").order("recorded_at"),
  ]);
  if (sessions.error) throw sessions.error;
  if (recordings.error) throw recordings.error;
  return {
    sessions: sessions.data.map((s) => ({
      session_id: s.id,
      participant_id: s.participant_id,
      hand: s.hand as Hand,
      calibrated_at: s.calibrated_at,
      open: s.calibration_open,
      closed: s.calibration_closed,
    })),
    samples: recordings.data.map((r) => ({
      sample_id: r.id,
      session_id: r.session_id,
      participant_id: sessions.data.find((s) => s.id === r.session_id)?.participant_id ?? "",
      hand: (sessions.data.find((s) => s.id === r.session_id)?.hand ?? "R") as Hand,
      label: r.label,
      sign_type: r.sign_type as SignType,
      rep: r.rep,
      window_ms: r.window_ms,
      recorded_at: r.recorded_at,
      notes: r.notes,
      frames: r.frames as unknown as CollectFrame[],
      uploaded: true,
    })),
  };
}
