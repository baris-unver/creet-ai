"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, Sparkles, Loader2, Save } from "lucide-react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { Project, PipelineStatus, ProgressMessage } from "@/types";

const FORMAT_OPTIONS = [
  { value: "youtube", label: "YouTube (16:9)" },
  { value: "youtube_shorts", label: "YouTube Shorts (9:16)" },
  { value: "tiktok", label: "TikTok (9:16)" },
  { value: "instagram", label: "Instagram (1:1)" },
  { value: "instagram_reels", label: "Instagram Reels (9:16)" },
];

const DURATION_OPTIONS = [
  { value: "short", label: "Short (15–60s)" },
  { value: "medium", label: "Medium (1–3 min)" },
  { value: "long", label: "Long (3–6 min)" },
];

export default function BriefPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { lastMessage } = useWebSocket(projectId);
  const [progress, setProgress] = useState<ProgressMessage | null>(null);

  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState("youtube");
  const [duration, setDuration] = useState("short");

  useEffect(() => {
    api.get<Project>(`/teams/${teamId}/projects/${projectId}`).then((p) => {
      setProject(p);
      setTitle(p.title);
      setBrief(p.brief || "");
      setFormat(p.format);
      setDuration(p.duration_tier);
    });
    api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`).then(setPipeline);
  }, [teamId, projectId]);

  useEffect(() => {
    if (lastMessage) {
      setProgress(lastMessage);
      if (lastMessage.status === "completed" || lastMessage.status === "failed") {
        setGenerating(false);
        api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`).then(setPipeline);
      }
    }
  }, [lastMessage, teamId, projectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<Project>(`/teams/${teamId}/projects/${projectId}`, {
        title,
        brief,
        format,
        duration_tier: duration,
      });
      setProject(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateOutline = async () => {
    setGenerating(true);
    setProgress(null);
    try {
      await api.post(`/teams/${teamId}/projects/${projectId}/pipeline/action`, {
        action: "generate",
        stage: "outline",
      });
      router.push(`/teams/${teamId}/projects/${projectId}/outline`);
    } catch {
      setGenerating(false);
    }
  };

  if (!project) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const stageStatus = pipeline?.pipeline_state?.brief;
  const isBriefStage = pipeline?.current_stage === "brief";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Project Brief</h1>
        </div>
        {stageStatus && <Badge variant="outline" className="capitalize">{stageStatus.replace("_", " ")}</Badge>}
      </div>

      {progress && progress.status === "running" && (
        <Card className="border-primary/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Generating Outline...</span>
              <span className="text-muted-foreground">{progress.message}</span>
            </div>
            <Progress value={progress.progress} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Title</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Brief</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={8}
            placeholder="Describe what your video is about..."
            className="text-sm"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Video Format</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              disabled={!isBriefStage}
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={!isBriefStage}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
        <Button onClick={handleGenerateOutline} disabled={generating || brief.length < 10}>
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Outline
        </Button>
      </div>
    </div>
  );
}
