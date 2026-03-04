"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Project, VideoFormat, DurationTier } from "@/types";
import { VIDEO_FORMAT_LABELS, DURATION_TIER_LABELS } from "@/types";

export default function NewProjectPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState<VideoFormat>("youtube");
  const [duration, setDuration] = useState<DurationTier>("short");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || brief.length < 10) return;
    setCreating(true);
    try {
      const project = await api.post<Project>(`/teams/${teamId}/projects`, {
        title, brief, format, duration_tier: duration,
      });
      router.push(`/teams/${teamId}/projects/${project.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />New Video Project
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input placeholder="My Awesome Video" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Brief</label>
            <Textarea
              placeholder="Describe your video idea in detail. What is the topic? Who is the audience? What message do you want to convey?"
              rows={6}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{brief.length}/10000 characters (min 10)</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Format</label>
              <Select value={format} onValueChange={(v) => setFormat(v as VideoFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VIDEO_FORMAT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <Select value={duration} onValueChange={(v) => setDuration(v as DurationTier)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DURATION_TIER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleCreate} disabled={creating || !title.trim() || brief.length < 10} className="w-full" size="lg">
            {creating ? "Creating..." : "Create Project"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
