"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, Clock, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { ProjectListItem, Team } from "@/types";
import { STAGE_LABELS, VIDEO_FORMAT_LABELS } from "@/types";

export default function TeamProjectsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Team>(`/teams/${teamId}`),
      api.get<ProjectListItem[]>(`/teams/${teamId}/projects`),
    ]).then(([t, p]) => {
      setTeam(t);
      setProjects(p);
      setLoading(false);
    });
  }, [teamId]);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{team?.name}</h1>
          <div className="mt-2 flex gap-2">
            <Link href={`/teams/${teamId}/members`}>
              <Button variant="outline" size="sm"><Users className="mr-1 h-4 w-4" />Members</Button>
            </Link>
            <Link href={`/teams/${teamId}/settings`}>
              <Button variant="outline" size="sm"><Settings className="mr-1 h-4 w-4" />Settings</Button>
            </Link>
          </div>
        </div>
        <Link href={`/teams/${teamId}/projects/new`}>
          <Button><Plus className="mr-2 h-4 w-4" />New Project</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No projects yet. Create your first video project.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/teams/${teamId}/projects/${project.id}`}>
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{project.title}</CardTitle>
                  <CardDescription className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{VIDEO_FORMAT_LABELS[project.format]}</Badge>
                    <Badge variant="outline">{STAGE_LABELS[project.pipeline_stage]}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />{new Date(project.updated_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
