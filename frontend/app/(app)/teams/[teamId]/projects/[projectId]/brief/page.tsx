"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Sparkles, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Project, PipelineStatus, ProgressMessage } from "@/types";

export default function BriefPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [generating, setGenerating] = useState(false);
  const { lastMessage } = useWebSocket(projectId);
  const [progress, setProgress] = useState<ProgressMessage | null>(null);

  useEffect(() => {
    api.get<Project>(`/teams/${teamId}/projects/${projectId}`).then(setProject);
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

  const handleGenerateOutline = async () => {
    setGenerating(true);
    setProgress(null);
    try {
      await api.post(`/teams/${teamId}/projects/${projectId}/pipeline/action`, {
        action: "generate",
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

  const stageStatus = pipeline?.pipeline_state?.brief;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Project Brief</h1>
        </div>
        {stageStatus && <Badge variant="outline" className="capitalize">{stageStatus.replace("_", " ")}</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Brief</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {project.brief || "No brief provided."}
          </p>
        </CardContent>
      </Card>

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

      <div className="flex gap-3">
        <Button onClick={handleGenerateOutline} disabled={generating}>
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
