"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  FileText, ListOrdered, BookOpen, Film, Users2,
  Image, Eye, Download, ChevronLeft,
  CheckCircle, Circle, Loader2, AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PipelineStatus } from "@/types";

const STAGES = [
  { key: "brief", icon: FileText, label: "Brief", path: "brief" },
  { key: "outline", icon: ListOrdered, label: "Outline", path: "outline" },
  { key: "scenario", icon: BookOpen, label: "Scenario", path: "scenario" },
  { key: "scenes", icon: Film, label: "Scenes", path: "scenes" },
  { key: "characters", icon: Users2, label: "Characters", path: "characters" },
  { key: "media_generation", icon: Image, label: "Media", path: "media" },
  { key: "review", icon: Eye, label: "Review", path: "review" },
  { key: "complete", icon: Download, label: "Export", path: "export" },
];

function StatusDot({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
    case "generating":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    case "awaiting_approval":
      return <Circle className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />;
    case "needs_review":
      return <AlertCircle className="h-3.5 w-3.5 text-orange-500" />;
    case "failed":
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />;
  }
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const pathname = usePathname();
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);

  const basePath = `/teams/${teamId}/projects/${projectId}`;
  const currentSegment = pathname.replace(basePath, "").replace(/^\//, "").split("/")[0] || "";

  useEffect(() => {
    api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`).then(setPipeline);
  }, [teamId, projectId]);

  useEffect(() => {
    const interval = setInterval(() => {
      api.get<PipelineStatus>(`/teams/${teamId}/projects/${projectId}/pipeline`)
        .then(setPipeline)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [teamId, projectId]);

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/teams/${teamId}/projects`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to projects
        </Link>
      </div>

      <div className="mb-6 overflow-x-auto">
        <nav className="flex items-center gap-1 rounded-lg border bg-card p-1.5 min-w-max">
          <Link
            href={basePath}
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              currentSegment === ""
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            Overview
          </Link>

          <div className="mx-1 h-6 w-px bg-border" />

          {STAGES.map((stage) => {
            const status = pipeline?.pipeline_state[stage.key] || "pending";
            const isActive = currentSegment === stage.path;
            const Icon = stage.icon;

            return (
              <Link
                key={stage.key}
                href={`${basePath}/${stage.path}`}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{stage.label}</span>
                {!isActive && <StatusDot status={status} />}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
