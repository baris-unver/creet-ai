"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { LockResponse } from "@/types";

export function useLock(teamId: string, projectId: string) {
  const [lockState, setLockState] = useState<LockResponse>({ locked: false, locked_by: null, locked_at: null });
  const [isOwner, setIsOwner] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const acquireLock = useCallback(async () => {
    try {
      const res = await api.post<LockResponse>(`/teams/${teamId}/projects/${projectId}/lock`);
      setLockState(res);
      setIsOwner(true);
      return true;
    } catch {
      setIsOwner(false);
      return false;
    }
  }, [teamId, projectId]);

  const releaseLock = useCallback(async () => {
    try {
      await api.delete(`/teams/${teamId}/projects/${projectId}/lock`);
      setLockState({ locked: false, locked_by: null, locked_at: null });
      setIsOwner(false);
    } catch {}
  }, [teamId, projectId]);

  useEffect(() => {
    if (isOwner) {
      intervalRef.current = setInterval(async () => {
        try {
          await api.post(`/teams/${teamId}/projects/${projectId}/lock/ping`);
        } catch {
          setIsOwner(false);
        }
      }, 60000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOwner, teamId, projectId]);

  useEffect(() => {
    return () => {
      if (isOwner) {
        api.delete(`/teams/${teamId}/projects/${projectId}/lock`).catch(() => {});
      }
    };
  }, [isOwner, teamId, projectId]);

  return { lockState, isOwner, acquireLock, releaseLock };
}
