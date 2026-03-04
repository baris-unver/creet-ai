"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Eye, CheckCircle, Image as ImageIcon, Volume2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Scene, Asset, PipelineStatus, ProgressMessage } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function ReviewPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [approving, setApproving] = useState(false);
  const [progress, setProgress] = useState<ProgressMessage | null>(null);
  const { lastMessage } = useWebSocket(projectId);

  const basePath = `/teams/${teamId}/projects/${projectId}`;

  const loadData = useCallback(() => {
    api.get<Scene[]>(`${basePath}/scenes`).then(setScenes);
    api.get<PipelineStatus>(`${basePath}/pipeline`).then(setPipeline);
  }, [basePath]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (lastMessage) {
      setProgress(lastMessage);
      if (lastMessage.status === "completed" || lastMessage.status === "failed") {
        loadData();
      }
    }
  }, [lastMessage, loadData]);

  const handleApproveForAssembly = async () => {
    setApproving(true);
    try {
      await api.post(`${basePath}/pipeline/action`, {
        action: "approve",
        stage: "review",
      });
      loadData();
    } finally {
      setApproving(false);
    }
  };

  const stageStatus = pipeline?.pipeline_state?.review;
  const allScenesApproved = scenes.length > 0 && scenes.every((s) => s.status === "approved");

  const assetUrl = (asset: Asset) => {
    if (!asset.storage_path) return null;
    return `${API_URL}/storage/${asset.storage_path}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Final Review</h1>
          {stageStatus && <Badge variant="outline" className="capitalize">{stageStatus.replace("_", " ")}</Badge>}
        </div>
        <Button
          onClick={handleApproveForAssembly}
          disabled={approving || stageStatus === "approved"}
        >
          {approving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Approve for Assembly
        </Button>
      </div>

      {progress && progress.status === "running" && (
        <Card className="border-primary/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Processing...</span>
              <span className="text-muted-foreground">{progress.message}</span>
            </div>
            <Progress value={progress.progress} />
          </CardContent>
        </Card>
      )}

      {!allScenesApproved && scenes.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardContent className="py-4 text-sm text-yellow-500">
            Some scenes or assets are not yet approved. Review each scene below before approving for assembly.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {scenes.map((scene) => {
          const images = scene.assets.filter((a) => a.asset_type === "image");
          const audios = scene.assets.filter((a) => a.asset_type === "audio");

          return (
            <Card key={scene.id} className={scene.status === "approved" ? "border-green-500/30" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Scene {scene.scene_number}: {scene.title ?? "Untitled"}
                  </CardTitle>
                  <Badge variant={scene.status === "approved" ? "success" : "outline"} className="capitalize">
                    {scene.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {scene.script && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Script</p>
                    <p className="text-sm whitespace-pre-wrap">{scene.script}</p>
                  </div>
                )}
                {scene.voiceover_text && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Voiceover</p>
                    <p className="text-sm italic">{scene.voiceover_text}</p>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  {images.map((asset) => {
                    const url = assetUrl(asset);
                    return (
                      <div key={asset.id} className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ImageIcon className="h-3 w-3" /> Image
                          <Badge variant={asset.status === "approved" ? "success" : "outline"} className="text-[10px] ml-auto capitalize">
                            {asset.status.replace("_", " ")}
                          </Badge>
                        </div>
                        {url ? (
                          <img src={url} alt={`Scene ${scene.scene_number}`} className="w-full rounded-md border border-border" />
                        ) : (
                          <div className="flex h-32 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {audios.map((asset) => {
                    const url = assetUrl(asset);
                    return (
                      <div key={asset.id} className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Volume2 className="h-3 w-3" /> Audio
                          <Badge variant={asset.status === "approved" ? "success" : "outline"} className="text-[10px] ml-auto capitalize">
                            {asset.status.replace("_", " ")}
                          </Badge>
                        </div>
                        {url ? (
                          <audio controls className="w-full" src={url} />
                        ) : (
                          <div className="flex h-12 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                            No audio
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
