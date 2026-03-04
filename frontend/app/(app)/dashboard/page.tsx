"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Film, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Team, ProjectListItem } from "@/types";
import { STAGE_LABELS, VIDEO_FORMAT_LABELS } from "@/types";

export default function DashboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Record<string, ProjectListItem[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Team[]>("/teams").then(async (teams) => {
      setTeams(teams);
      const projectMap: Record<string, ProjectListItem[]> = {};
      await Promise.all(
        teams.map(async (team) => {
          try {
            projectMap[team.id] = await api.get<ProjectListItem[]>(`/teams/${team.id}/projects`);
          } catch {
            projectMap[team.id] = [];
          }
        })
      );
      setProjects(projectMap);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (teams.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Film className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">No teams yet</h2>
        <p className="mt-2 text-muted-foreground">Create a team to start making videos.</p>
        <Link href="/teams">
          <Button className="mt-6"><Plus className="mr-2 h-4 w-4" />Create Team</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      {teams.map((team) => (
        <div key={team.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{team.name}</h2>
            <Link href={`/teams/${team.id}/projects/new`}>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />New Project</Button>
            </Link>
          </div>

          {(!projects[team.id] || projects[team.id].length === 0) ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No projects yet. Create your first video project.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects[team.id].map((project) => (
                <Link key={project.id} href={`/teams/${team.id}/projects/${project.id}`}>
                  <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{project.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {VIDEO_FORMAT_LABELS[project.format]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {STAGE_LABELS[project.pipeline_stage]}
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(project.updated_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
