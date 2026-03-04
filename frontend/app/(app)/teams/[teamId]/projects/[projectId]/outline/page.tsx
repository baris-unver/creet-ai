"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ListOrdered, CheckCircle, RefreshCw, Save, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { Project, PipelineStatus, ProgressMessage } from "@/types";

export default function OutlinePage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressMessage | null>(null);
  const { lastMessage } = useWebSocket(projectId);

  useEffect(() => {
    api.get<Project>(`/teams/${teamId}/projects/${projectId}`).then((p) => {
      setProject(p);
      setContent(p.outline || "");
    });
    api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`).then(setPipeline);
  }, [teamId, projectId]);

  useEffect(() => {
    if (lastMessage) {
      setProgress(lastMessage);
      if (lastMessage.status === "completed" || lastMessage.status === "failed") {
        setGenerating(false);
        api.get<Project>(`/teams/${teamId}/projects/${projectId}`).then((p) => {
          setProject(p);
          setContent(p.outline || "");
        });
        api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`).then(setPipeline);
      }
    }
  }, [lastMessage, teamId, projectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/teams/${teamId}/projects/${projectId}/pipeline/outline`, { content });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    const result = await api.post<{ next_stage: string; auto_generating?: boolean }>(
      `/teams/${teamId}/projects/${projectId}/pipeline/action`,
      { action: "approve", stage: "outline" },
    );
    if (result.auto_generating && result.next_stage) {
      router.push(`/teams/${teamId}/projects/${projectId}/${result.next_stage}`);
    } else {
      api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`).then(setPipeline);
    }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    setProgress(null);
    try {
      await api.post(`/teams/${teamId}/projects/${projectId}/pipeline/action`, {
        action: "regenerate",
        stage: "outline",
      });
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

  const stageStatus = pipeline?.pipeline_state?.outline;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListOrdered className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Outline</h1>
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
          <CardTitle className="text-lg">Outline Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="font-mono text-sm"
            placeholder="Outline will appear here after generation..."
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
        <Button onClick={handleApprove} disabled={generating || stageStatus === "approved"}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve
        </Button>
        <Button variant="secondary" onClick={handleRegenerate} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Regenerate
        </Button>
      </div>
    </div>
  );
}
