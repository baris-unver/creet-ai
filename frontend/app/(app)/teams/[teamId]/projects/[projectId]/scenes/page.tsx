"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Film, Sparkles, CheckCircle, CheckCheck, Save, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { Scene, PipelineStatus, ProgressMessage } from "@/types";

export default function ScenesPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const router = useRouter();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Scene>>>({});
  const [progress, setProgress] = useState<ProgressMessage | null>(null);
  const { lastMessage } = useWebSocket(projectId);

  const loadScenes = useCallback(() => {
    api.get<Scene[]>(`/teams/${teamId}/projects/${projectId}/scenes`).then(setScenes);
  }, [teamId, projectId]);

  useEffect(() => {
    loadScenes();
    api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`).then(setPipeline);
  }, [teamId, projectId, loadScenes]);

  useEffect(() => {
    if (lastMessage) {
      setProgress(lastMessage);
      if (lastMessage.status === "completed" || lastMessage.status === "failed") {
        setGenerating(false);
        loadScenes();
        api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`).then(setPipeline);
      }
    }
  }, [lastMessage, teamId, projectId, loadScenes]);

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(null);
    try {
      await api.post(`/teams/${teamId}/projects/${projectId}/pipeline/action`, {
        action: "generate",
        stage: "scenes",
      });
    } catch {
      setGenerating(false);
    }
  };

  const updateEdit = (sceneId: string, field: keyof Scene, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [sceneId]: { ...prev[sceneId], [field]: value },
    }));
  };

  const handleSaveScene = async (scene: Scene) => {
    const patch = edits[scene.id];
    if (!patch) return;
    setSavingId(scene.id);
    try {
      await api.patch(`/teams/${teamId}/projects/${projectId}/scenes/${scene.id}`, patch);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[scene.id];
        return next;
      });
      loadScenes();
    } finally {
      setSavingId(null);
    }
  };

  const handleApproveScene = async (sceneId: string) => {
    await api.patch(`/teams/${teamId}/projects/${projectId}/scenes/${sceneId}`, { status: "approved" });
    loadScenes();
  };

  const handleApproveAll = async () => {
    await Promise.all(
      scenes.filter((s) => s.status !== "approved").map((s) =>
        api.patch(`/teams/${teamId}/projects/${projectId}/scenes/${s.id}`, { status: "approved" })
      )
    );
    const result = await api.post<{ next_stage: string; auto_generating?: boolean }>(
      `/teams/${teamId}/projects/${projectId}/pipeline/action`,
      { action: "approve", stage: "scenes" },
    );
    if (result.auto_generating && result.next_stage) {
      router.push(`/teams/${teamId}/projects/${projectId}/${result.next_stage}`);
    } else {
      loadScenes();
      api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`).then(setPipeline);
    }
  };

  const stageStatus = pipeline?.pipeline_state?.scenes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Scenes</h1>
          {stageStatus && <Badge variant="outline" className="capitalize">{stageStatus.replace("_", " ")}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Scenes
          </Button>
          {scenes.length > 0 && (
            <Button variant="secondary" onClick={handleApproveAll}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Approve All
            </Button>
          )}
        </div>
      </div>

      {progress && progress.status === "running" && (
        <Card className="border-primary/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Generating Scenes...</span>
              <span className="text-muted-foreground">{progress.message}</span>
            </div>
            <Progress value={progress.progress} />
          </CardContent>
        </Card>
      )}

      {scenes.length === 0 && !generating && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No scenes yet. Click &quot;Generate Scenes&quot; to begin.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {scenes.map((scene) => {
          const edited = edits[scene.id] || {};
          return (
            <Card key={scene.id} className={scene.status === "approved" ? "border-green-500/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Scene {scene.scene_number}: {edited.title ?? scene.title ?? "Untitled"}
                  </CardTitle>
                  <Badge variant={scene.status === "approved" ? "success" : "outline"} className="capitalize">
                    {scene.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Title</label>
                  <input
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    value={edited.title ?? scene.title ?? ""}
                    onChange={(e) => updateEdit(scene.id, "title", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Textarea
                    rows={2}
                    value={(edited.description ?? scene.description) ?? ""}
                    onChange={(e) => updateEdit(scene.id, "description", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Script</label>
                  <Textarea
                    rows={3}
                    className="font-mono text-sm"
                    value={(edited.script ?? scene.script) ?? ""}
                    onChange={(e) => updateEdit(scene.id, "script", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Voiceover Text</label>
                  <Textarea
                    rows={2}
                    value={(edited.voiceover_text ?? scene.voiceover_text) ?? ""}
                    onChange={(e) => updateEdit(scene.id, "voiceover_text", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Image Prompt</label>
                  <Textarea
                    rows={2}
                    value={(edited.image_prompt ?? scene.image_prompt) ?? ""}
                    onChange={(e) => updateEdit(scene.id, "image_prompt", e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveScene(scene)}
                    disabled={!edits[scene.id] || savingId === scene.id}
                  >
                    {savingId === scene.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApproveScene(scene.id)}
                    disabled={scene.status === "approved"}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
