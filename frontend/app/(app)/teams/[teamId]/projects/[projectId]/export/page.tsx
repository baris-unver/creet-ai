"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Download, Plus, FileVideo, Clock, HardDrive, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Export, PipelineStatus, ProgressMessage, VideoFormat } from "@/types";
import { VIDEO_FORMAT_LABELS } from "@/types";

export default function ExportPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const [exports, setExports] = useState<Export[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat>("youtube");
  const [showNew, setShowNew] = useState(false);
  const [progress, setProgress] = useState<ProgressMessage | null>(null);
  const { lastMessage } = useWebSocket(projectId);

  const basePath = `/teams/${teamId}/projects/${projectId}`;

  const loadExports = useCallback(() => {
    api.get<Export[]>(`${basePath}/exports`).then(setExports);
  }, [basePath]);

  useEffect(() => {
    loadExports();
    api.get<PipelineStatus>(`${basePath}/pipeline`).then(setPipeline);
  }, [basePath, loadExports]);

  useEffect(() => {
    if (lastMessage) {
      setProgress(lastMessage);
      if (lastMessage.status === "completed" || lastMessage.status === "failed") {
        setCreating(false);
        loadExports();
      }
    }
  }, [lastMessage, loadExports]);

  const handleCreateExport = async () => {
    setCreating(true);
    setProgress(null);
    try {
      await api.post(`${basePath}/exports`, { format: selectedFormat });
      setShowNew(false);
      loadExports();
    } catch {
      setCreating(false);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const statusIcon = (status: Export["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "failed": return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusVariant = (status: Export["status"]): "success" | "outline" | "destructive" | "secondary" => {
    switch (status) {
      case "completed": return "success";
      case "failed": return "destructive";
      case "processing": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileVideo className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Exports</h1>
        </div>
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="mr-2 h-4 w-4" />
          New Export
        </Button>
      </div>

      {showNew && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg">Create New Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Format</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as VideoFormat)}
              >
                {(Object.entries(VIDEO_FORMAT_LABELS) as [VideoFormat, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateExport} disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Export
              </Button>
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {progress && progress.status === "running" && (
        <Card className="border-primary/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Exporting...</span>
              <span className="text-muted-foreground">{progress.message}</span>
            </div>
            <Progress value={progress.progress} />
          </CardContent>
        </Card>
      )}

      {exports.length === 0 && !showNew && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No exports yet. Click &quot;New Export&quot; to create one.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {exports.map((exp) => (
          <Card key={exp.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                {statusIcon(exp.status)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {VIDEO_FORMAT_LABELS[exp.format]}
                    </span>
                    <Badge variant={statusVariant(exp.status)} className="capitalize text-xs">
                      {exp.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(exp.duration_seconds)}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {formatBytes(exp.file_size_bytes)}
                    </span>
                    <span>
                      {new Date(exp.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              {exp.status === "completed" && exp.download_url && (
                <Button size="sm" asChild>
                  <a href={exp.download_url} download>
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
