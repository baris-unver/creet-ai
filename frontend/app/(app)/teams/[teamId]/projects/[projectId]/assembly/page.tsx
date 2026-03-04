"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AssemblyPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/teams/${teamId}/projects/${projectId}/export`);
  }, [teamId, projectId, router]);

  return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
