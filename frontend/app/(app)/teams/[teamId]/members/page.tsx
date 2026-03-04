"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserPlus, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { TeamMember } from "@/types";

const ROLE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
  viewer: "outline",
};

export default function TeamMembersPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get<TeamMember[]>(`/teams/${teamId}/members`).then(setMembers);
  }, [teamId]);

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    await api.post(`/teams/${teamId}/invitations`, { email: inviteEmail, role: inviteRole });
    setInviteEmail("");
    setOpen(false);
  };

  const removeMember = async (memberId: string) => {
    await api.delete(`/teams/${teamId}/members/${memberId}`);
    setMembers(members.filter((m) => m.id !== memberId));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Team Members</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="mr-2 h-4 w-4" />Invite</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a team member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Email address"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={sendInvite} disabled={!inviteEmail.trim()}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.user_avatar || undefined} />
                  <AvatarFallback>{(member.user_name || "?")[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.user_name}</p>
                  <p className="text-sm text-muted-foreground">{member.user_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ROLE_COLORS[member.role]}>
                  <Shield className="mr-1 h-3 w-3" />{member.role}
                </Badge>
                {member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
