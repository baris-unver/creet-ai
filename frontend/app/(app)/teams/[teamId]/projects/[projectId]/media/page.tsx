"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Image as ImageIcon, Volume2, Sparkles, CheckCircle, RefreshCw, Loader2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Scene, Asset, PipelineStatus, ProgressMessage } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function MediaPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const router = useRouter();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressMessage | null>(null);
  const { lastMessage } = useWebSocket(projectId);

  const basePath = `/teams/${teamId}/projects/${projectId}`;

  const loadData = useCallback(() => {
    api.get<Scene[]>(`${basePath}/scenes`).then(setScenes);
  }, [basePath]);

  useEffect(() => {
    loadData();
    api.get<PipelineStatus>(`${basePath}/pipeline`).then(setPipeline);
  }, [basePath, loadData]);

  useEffect(() => {
    if (lastMessage) {
      setProgress(lastMessage);
      if (lastMessage.status === "completed" || lastMessage.status === "failed") {
        setGenerating(false);
        loadData();
        api.get<PipelineStatus>(`${basePath}/pipeline`).then(setPipeline);
      }
    }
  }, [lastMessage, basePath, loadData]);

  const handleGenerateAll = async () => {
    setGenerating(true);
    setProgress(null);
    try {
      await api.post(`${basePath}/pipeline/action`, {
        action: "generate",
        stage: "media_generation",
      });
    } catch {
      setGenerating(false);
    }
  };

  const handleApproveAsset = async (sceneId: string, assetId: string) => {
    await api.patch(`${basePath}/scenes/${sceneId}/assets/${assetId}`, { status: "approved" });
    loadData();
  };

  const handleRegenerateAsset = async (sceneId: string, assetId: string) => {
    await api.post(`${basePath}/scenes/${sceneId}/assets/${assetId}/regenerate`);
    loadData();
  };

  const stageStatus = pipeline?.pipeline_state?.media_generation;

  const assetUrl = (asset: Asset) => {
    if (!asset.storage_path) return null;
    return `${API_URL}/storage/${asset.storage_path}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Media Generation</h1>
          {stageStatus && <Badge variant="outline" className="capitalize">{stageStatus.replace("_", " ")}</Badge>}
        </div>
        <Button onClick={handleGenerateAll} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate All Media
        </Button>
      </div>

      {progress && progress.status === "running" && (
        <Card className="border-primary/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Generating Media...</span>
              <span className="text-muted-foreground">{progress.message}</span>
            </div>
            <Progress value={progress.progress} />
          </CardContent>
        </Card>
      )}

      {scenes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No scenes available. Generate scenes first.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {scenes.map((scene) => {
          const images = scene.assets.filter((a) => a.asset_type === "image");
          const audios = scene.assets.filter((a) => a.asset_type === "audio");

          return (
            <Card key={scene.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Scene {scene.scene_number}: {scene.title ?? "Untitled"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {scene.description && (
                  <p className="text-sm text-muted-foreground">{scene.description}</p>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-1.5 text-sm font-medium">
                      <ImageIcon className="h-4 w-4" /> Images
                    </h4>
                    {images.length === 0 && (
                      <p className="text-xs text-muted-foreground">No images generated</p>
                    )}
                    {images.map((asset) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        type="image"
                        url={assetUrl(asset)}
                        onApprove={() => handleApproveAsset(scene.id, asset.id)}
                        onRegenerate={() => handleRegenerateAsset(scene.id, asset.id)}
                      />
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="flex items-center gap-1.5 text-sm font-medium">
                      <Volume2 className="h-4 w-4" /> Audio
                    </h4>
                    {audios.length === 0 && (
                      <p className="text-xs text-muted-foreground">No audio generated</p>
                    )}
                    {audios.map((asset) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        type="audio"
                        url={assetUrl(asset)}
                        onApprove={() => handleApproveAsset(scene.id, asset.id)}
                        onRegenerate={() => handleRegenerateAsset(scene.id, asset.id)}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {scenes.length > 0 && stageStatus !== "approved" && (
        <div className="flex gap-3 pt-2">
          <Button
            onClick={async () => {
              await api.post(`${basePath}/pipeline/action`, {
                action: "approve",
                stage: "media_generation",
              });
              router.push(`/teams/${teamId}/projects/${projectId}/review`);
            }}
            disabled={generating}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve and Submit for Review
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  type,
  url,
  onApprove,
  onRegenerate,
}: {
  asset: Asset;
  type: "image" | "audio";
  url: string | null;
  onApprove: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant={asset.status === "approved" ? "success" : "outline"} className="capitalize text-xs">
          {asset.status.replace("_", " ")}
        </Badge>
        {asset.provider_used && (
          <span className="text-xs text-muted-foreground">{asset.provider_used}</span>
        )}
      </div>

      {url && type === "image" && (
        <img src={url} alt="Scene asset" className="w-full rounded-md border border-border" />
      )}
      {url && type === "audio" && (
        <audio controls className="w-full" src={url} />
      )}
      {!url && (
        <div className="flex h-24 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
          {asset.status === "generating" ? "Generating..." : "Not yet generated"}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onApprove} disabled={asset.status === "approved"}>
          <CheckCircle className="mr-1 h-3 w-3" />Approve
        </Button>
        <Button size="sm" variant="secondary" onClick={onRegenerate}>
          <RefreshCw className="mr-1 h-3 w-3" />Regenerate
        </Button>
      </div>
    </div>
  );
}
