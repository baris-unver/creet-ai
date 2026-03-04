"use client";

import { useEffect, useState } from "react";
import { Check, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { TeamInvitation } from "@/types";

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);

  useEffect(() => {
    api.get<TeamInvitation[]>("/teams/me/invitations").then(setInvitations).catch(() => {});
  }, []);

  const accept = async (id: string) => {
    await api.post(`/teams/invitations/${id}/accept`);
    setInvitations(invitations.filter((i) => i.id !== id));
  };

  const decline = async (id: string) => {
    await api.post(`/teams/invitations/${id}/decline`);
    setInvitations(invitations.filter((i) => i.id !== id));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Invitations</h1>

      {invitations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No pending invitations.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{inv.team_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Role: <Badge variant="outline">{inv.role}</Badge>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => accept(inv.id)}>
                    <Check className="mr-1 h-4 w-4" />Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decline(inv.id)}>
                    <X className="mr-1 h-4 w-4" />Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
