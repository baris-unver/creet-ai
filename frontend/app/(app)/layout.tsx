"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Film, LogOut, Settings, Users, FolderOpen, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import type { User } from "@/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get<User>("/auth/me")
      .then((u) => {
        setUser(u);
        if (!u.has_accepted_current_policy) {
          router.push("/accept-policy");
        }
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  const handleLogout = async () => {
    await api.post("/auth/logout");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              <span className="font-bold">VideoCraft</span>
            </Link>
            <nav className="hidden items-center gap-4 md:flex">
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                <FolderOpen className="mr-1 inline h-4 w-4" />Projects
              </Link>
              <Link href="/teams" className="text-sm text-muted-foreground hover:text-foreground">
                <Users className="mr-1 inline h-4 w-4" />Teams
              </Link>
              <Link href="/invitations" className="text-sm text-muted-foreground hover:text-foreground">
                <Bell className="mr-1 inline h-4 w-4" />Invitations
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm md:inline">{user.name}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
