"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function AcceptPolicyPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAccept = async () => {
    setLoading(true);
    try {
      await api.post("/auth/accept-policy");
      router.push("/dashboard");
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Policy Acceptance Required</CardTitle>
          <CardDescription>
            Please review and accept our policies before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Terms of Service</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              By using VideoCraft, you agree to our terms governing the use of AI-generated content,
              team collaboration, and data handling.{" "}
              <a href="/terms" target="_blank" className="text-primary underline">Read full terms</a>
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Privacy Policy</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We collect and process personal data including your Google profile, usage data, and
              generated content.{" "}
              <a href="/privacy" target="_blank" className="text-primary underline">Read full policy</a>
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">GDPR & KVKK Compliance</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You have rights to access, rectify, delete, and port your data under GDPR and KVKK.{" "}
              <a href="/gdpr" target="_blank" className="text-primary underline">Learn more</a>
            </p>
          </div>
          <Button onClick={handleAccept} disabled={loading} className="w-full" size="lg">
            {loading ? "Processing..." : "I Accept All Policies"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
