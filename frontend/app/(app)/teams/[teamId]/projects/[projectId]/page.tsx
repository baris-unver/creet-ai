"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lock, Unlock, CheckCircle, Circle, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLock } from "@/hooks/use-lock";
import type { Project, PipelineStatus, ProgressMessage } from "@/types";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/types";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  approved: <CheckCircle className="h-5 w-5 text-green-500" />,
  generating: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
  awaiting_approval: <Circle className="h-5 w-5 text-yellow-500" />,
  needs_review: <AlertCircle className="h-5 w-5 text-orange-500" />,
  failed: <AlertCircle className="h-5 w-5 text-destructive" />,
  pending: <Circle className="h-5 w-5 text-muted-foreground" />,
};

export default function ProjectPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [progress, setProgress] = useState<ProgressMessage | null>(null);
  const { connected, lastMessage } = useWebSocket(projectId);
  const { lockState, isOwner, acquireLock, releaseLock } = useLock(teamId, projectId);

  useEffect(() => {
    api.get<Project>(`/teams/${teamId}/projects/${projectId}`).then(setProject);
    api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`).then(setPipeline);
  }, [teamId, projectId]);

  useEffect(() => {
    if (lastMessage) {
      setProgress(lastMessage);
      if (lastMessage.status === "completed") {
        api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`).then(setPipeline);
      }
    }
  }, [lastMessage, teamId, projectId]);

  if (!project || !pipeline) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const stageLink = (stage: string) => `/teams/${teamId}/projects/${projectId}/${stage === "media_generation" ? "media" : stage}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{project.format}</Badge>
            <Badge variant="outline">{project.duration_tier}</Badge>
            {connected && <Badge variant="success" className="text-xs">Live</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <Button variant="outline" onClick={releaseLock}>
              <Unlock className="mr-2 h-4 w-4" />Release Lock
            </Button>
          ) : (
            <Button onClick={acquireLock}>
              <Lock className="mr-2 h-4 w-4" />Acquire Lock
            </Button>
          )}
        </div>
      </div>

      {progress && progress.status === "running" && (
        <Card className="border-primary/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{STAGE_LABELS[progress.stage as keyof typeof STAGE_LABELS] || progress.stage}</span>
              <span className="text-muted-foreground">{progress.message}</span>
            </div>
            <Progress value={progress.progress} className="mt-2" />
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {PIPELINE_STAGES.filter((s) => s !== "complete").map((stage, idx) => {
          const status = pipeline.pipeline_state[stage] || "pending";
          const isCurrent = pipeline.current_stage === stage;
          return (
            <Link key={stage} href={stageLink(stage)}>
              <Card className={`cursor-pointer transition-colors hover:bg-accent/50 ${isCurrent ? "border-primary" : ""}`}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{STAGE_LABELS[stage]}</p>
                      <p className="text-xs text-muted-foreground capitalize">{status.replace("_", " ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS[status]}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {pipeline.current_stage === "complete" && (
        <Card className="border-green-500">
          <CardContent className="py-6 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
            <p className="mt-2 font-semibold">Project Complete</p>
            <Link href={`/teams/${teamId}/projects/${projectId}/export`}>
              <Button className="mt-4">View Exports</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
