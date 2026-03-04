"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

export default function PrivacyPage() {
  const [content, setContent] = useState("");

  useEffect(() => {
    api.get<{ content: string }>("/legal/privacy").then((d) => setContent(d.content));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back
        </Link>
        <article className="prose prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, "<br/>").replace(/^# (.+)/gm, "<h1>$1</h1>").replace(/^## (.+)/gm, "<h2>$1</h2>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
        </article>
      </div>
    </div>
  );
}
