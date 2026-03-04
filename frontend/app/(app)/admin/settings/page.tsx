"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Key, Eye, EyeOff, Save, Trash2,
  CheckCircle2, XCircle, Zap, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { User, SystemKeysResponse, SystemKeyStatus } from "@/types";

const TESTABLE_KEYS = new Set([
  "openai_api_key", "anthropic_api_key", "gemini_api_key",
  "stability_api_key", "elevenlabs_api_key", "resend_api_key",
]);

interface TestResult {
  success: boolean;
  message: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [keys, setKeys] = useState<SystemKeyStatus[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    api.get<User>("/auth/me").then((u) => {
      if (!u.is_superadmin) {
        router.push("/dashboard");
        return;
      }
      setUser(u);
      loadKeys();
    }).catch(() => router.push("/login"));
  }, [router]);

  const loadKeys = async () => {
    try {
      const data = await api.get<SystemKeysResponse>("/admin/settings/keys");
      setKeys(data.keys);
      const init: Record<string, string> = {};
      data.keys.forEach((k) => (init[k.key] = ""));
      setValues(init);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setTestResults({});
    try {
      const toUpdate = Object.entries(values)
        .filter(([, v]) => v.trim() !== "")
        .map(([key, value]) => ({ key, value }));

      if (toUpdate.length === 0) {
        setMessage({ type: "error", text: "No new keys to save. Enter at least one key value." });
        setSaving(false);
        return;
      }

      const data = await api.put<SystemKeysResponse>("/admin/settings/keys", { keys: toUpdate });
      setKeys(data.keys);
      const cleared: Record<string, string> = {};
      data.keys.forEach((k) => (cleared[k.key] = ""));
      setValues(cleared);
      setVisible({});
      setMessage({ type: "success", text: `${toUpdate.length} key(s) saved successfully.` });
    } catch {
      setMessage({ type: "error", text: "Failed to save keys." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (keyName: string) => {
    try {
      await api.delete(`/admin/settings/keys/${keyName}`);
      setTestResults((prev) => { const n = { ...prev }; delete n[keyName]; return n; });
      await loadKeys();
      setMessage({ type: "success", text: "Key removed." });
    } catch {
      setMessage({ type: "error", text: "Failed to remove key." });
    }
  };

  const handleTest = async (keyName: string) => {
    setTesting((prev) => ({ ...prev, [keyName]: true }));
    setTestResults((prev) => { const n = { ...prev }; delete n[keyName]; return n; });
    try {
      const result = await api.post<{ success: boolean; message: string }>(
        "/admin/settings/keys/test",
        { key_name: keyName }
      );
      setTestResults((prev) => ({ ...prev, [keyName]: result }));
    } catch {
      setTestResults((prev) => ({ ...prev, [keyName]: { success: false, message: "Test request failed." } }));
    } finally {
      setTesting((prev) => ({ ...prev, [keyName]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user?.is_superadmin) return null;

  const groups = [
    {
      title: "AI Providers",
      description: "System-wide default API keys for AI services. Teams can override these with their own keys.",
      keys: ["openai_api_key", "anthropic_api_key", "gemini_api_key", "stability_api_key", "elevenlabs_api_key"],
    },
    {
      title: "Platform Services",
      description: "Keys for authentication and email delivery.",
      keys: ["google_client_id", "google_client_secret", "resend_api_key"],
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">System Administration</h1>
          <p className="text-muted-foreground">
            Manage platform-wide API keys and configuration. All keys are encrypted at rest.
          </p>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-lg border p-3 ${
          message.type === "success"
            ? "border-green-500/30 bg-green-500/10 text-green-400"
            : "border-red-500/30 bg-red-500/10 text-red-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {groups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {group.title}
            </CardTitle>
            <CardDescription>{group.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {keys
              .filter((k) => group.keys.includes(k.key))
              .map((keyItem) => (
                <div key={keyItem.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{keyItem.label}</label>
                    <div className="flex items-center gap-2">
                      {keyItem.is_set ? (
                        <>
                          <Badge variant="success">Configured</Badge>
                          <button
                            onClick={() => handleDelete(keyItem.key)}
                            className="text-muted-foreground hover:text-red-400 transition-colors"
                            title="Remove key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                          Not set
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{keyItem.description}</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={visible[keyItem.key] ? "text" : "password"}
                        placeholder={keyItem.is_set ? "Enter new value to replace" : "Enter API key"}
                        value={values[keyItem.key] || ""}
                        onChange={(e) => setValues({ ...values, [keyItem.key]: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setVisible({ ...visible, [keyItem.key]: !visible[keyItem.key] })}
                      >
                        {visible[keyItem.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {TESTABLE_KEYS.has(keyItem.key) && keyItem.is_set && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(keyItem.key)}
                        disabled={testing[keyItem.key]}
                        className="shrink-0 h-10"
                      >
                        {testing[keyItem.key] ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Zap className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Test
                      </Button>
                    )}
                  </div>
                  {testResults[keyItem.key] && (
                    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
                      testResults[keyItem.key].success
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}>
                      {testResults[keyItem.key].success ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{testResults[keyItem.key].message}</span>
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save All Keys"}
      </Button>
    </div>
  );
}
