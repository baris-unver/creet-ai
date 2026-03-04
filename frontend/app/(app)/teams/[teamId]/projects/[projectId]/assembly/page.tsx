"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Clapperboard, Play, CheckCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { PipelineStatus, ProgressMessage } from "@/types";

export default function AssemblyPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [assembling, setAssembling] = useState(false);
  const [progress, setProgress] = useState<ProgressMessage | null>(null);
  const { lastMessage } = useWebSocket(projectId);

  const basePath = `/teams/${teamId}/projects/${projectId}`;

  useEffect(() => {
    api.get<PipelineStatus>(`${basePath}/pipeline`).then(setPipeline);
  }, [basePath]);

  useEffect(() => {
    if (lastMessage) {
      setProgress(lastMessage);
      if (lastMessage.status === "completed" || lastMessage.status === "failed") {
        setAssembling(false);
        api.get<PipelineStatus>(`${basePath}/pipeline`).then(setPipeline);
      }
    }
  }, [lastMessage, basePath]);

  const handleStartAssembly = async () => {
    setAssembling(true);
    setProgress(null);
    try {
      await api.post(`${basePath}/pipeline/action`, {
        action: "generate",
        stage: "assembly",
      });
    } catch {
      setAssembling(false);
    }
  };

  const stageStatus = pipeline?.pipeline_state?.assembly;
  const isComplete = pipeline?.current_stage === "complete" || stageStatus === "approved";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clapperboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Assembly</h1>
          {stageStatus && <Badge variant="outline" className="capitalize">{stageStatus.replace("_", " ")}</Badge>}
        </div>
        {!isComplete && (
          <Button onClick={handleStartAssembly} disabled={assembling}>
            {assembling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Start Assembly
          </Button>
        )}
      </div>

      {progress && progress.status === "running" && (
        <Card className="border-primary/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Assembling Video...</span>
              <span className="text-muted-foreground">{progress.message}</span>
            </div>
            <Progress value={progress.progress} />
          </CardContent>
        </Card>
      )}

      {progress && progress.status === "failed" && (
        <Card className="border-destructive">
          <CardContent className="py-6 text-center">
            <p className="text-destructive font-medium">Assembly failed</p>
            <p className="text-sm text-muted-foreground mt-1">{progress.message}</p>
            <Button className="mt-4" onClick={handleStartAssembly}>
              Retry Assembly
            </Button>
          </CardContent>
        </Card>
      )}

      {!assembling && !progress && !isComplete && stageStatus !== "generating" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clapperboard className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              Ready to assemble all scenes into the final video.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ensure all scenes and media are approved before starting.
            </p>
          </CardContent>
        </Card>
      )}

      {isComplete && (
        <Card className="border-green-500">
          <CardContent className="py-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-3 text-lg font-semibold">Assembly Complete</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your video has been assembled. Head to the Export page to download.
            </p>
            <Button className="mt-4" asChild>
              <a href={`/teams/${teamId}/projects/${projectId}/export`}>Go to Export</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
