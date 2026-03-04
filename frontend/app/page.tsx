import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Film, Sparkles, Users, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">VideoCraft</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Create Videos with <span className="text-primary">AI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Transform text briefs into professional videos. Our AI-powered pipeline handles
            scripting, image generation, voiceover, and assembly — all with your creative control.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-8 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">AI-Powered Pipeline</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                From brief to finished video through an intelligent multi-stage process with full editorial control.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-8 text-center">
              <Users className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Team Collaboration</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Invite team members, manage roles, and collaborate on video projects together in real time.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-8 text-center">
              <Zap className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Multiple Formats</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Export for YouTube, TikTok, Instagram, and more — each optimized for the target platform.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>&copy; 2026 VideoCraft. All rights reserved.</p>
      </footer>
    </div>
  );
}
