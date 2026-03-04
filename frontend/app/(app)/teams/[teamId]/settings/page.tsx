"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Save, Key, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { TeamSettings } from "@/types";

export default function TeamSettingsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [formData, setFormData] = useState({
    llm_provider: "",
    llm_api_key: "",
    image_provider: "",
    image_api_key: "",
    tts_provider: "",
    tts_api_key: "",
  });
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState({ llm: false, image: false, tts: false });

  useEffect(() => {
    api.get<TeamSettings>(`/teams/${teamId}/settings`).then((s) => {
      setSettings(s);
      setFormData({
        llm_provider: s.llm_provider || "",
        llm_api_key: "",
        image_provider: s.image_provider || "",
        image_api_key: "",
        tts_provider: s.tts_provider || "",
        tts_api_key: "",
      });
    });
  }, [teamId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      if (formData.llm_provider) payload.llm_provider = formData.llm_provider;
      if (formData.llm_api_key) payload.llm_api_key = formData.llm_api_key;
      if (formData.image_provider) payload.image_provider = formData.image_provider;
      if (formData.image_api_key) payload.image_api_key = formData.image_api_key;
      if (formData.tts_provider) payload.tts_provider = formData.tts_provider;
      if (formData.tts_api_key) payload.tts_api_key = formData.tts_api_key;

      const updated = await api.put<TeamSettings>(`/teams/${teamId}/settings`, payload);
      setSettings(updated);
      setFormData((prev) => ({ ...prev, llm_api_key: "", image_api_key: "", tts_api_key: "" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Team Settings</h1>
      <p className="text-muted-foreground">
        Configure AI provider API keys. Team keys override system defaults. Keys are encrypted at rest.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />LLM Provider</CardTitle>
          <CardDescription>Used for outline, scenario, scene, and character generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={formData.llm_provider} onValueChange={(v) => setFormData({ ...formData, llm_provider: v })}>
            <SelectTrigger><SelectValue placeholder="System default (OpenAI)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
              <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              <SelectItem value="gemini">Google (Gemini)</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Input
              type={showKeys.llm ? "text" : "password"}
              placeholder={settings?.has_llm_key ? "Key saved (enter new to replace)" : "API Key (optional)"}
              value={formData.llm_api_key}
              onChange={(e) => setFormData({ ...formData, llm_api_key: e.target.value })}
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-muted-foreground"
              onClick={() => setShowKeys({ ...showKeys, llm: !showKeys.llm })}
            >
              {showKeys.llm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {settings?.has_llm_key && <Badge variant="success">Key configured</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Image Provider</CardTitle>
          <CardDescription>Used for scene image generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={formData.image_provider} onValueChange={(v) => setFormData({ ...formData, image_provider: v })}>
            <SelectTrigger><SelectValue placeholder="System default (DALL-E 3)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dalle">DALL-E 3</SelectItem>
              <SelectItem value="stability">Stability AI</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="password"
            placeholder={settings?.has_image_key ? "Key saved (enter new to replace)" : "API Key (optional)"}
            value={formData.image_api_key}
            onChange={(e) => setFormData({ ...formData, image_api_key: e.target.value })}
          />
          {settings?.has_image_key && <Badge variant="success">Key configured</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />TTS Provider</CardTitle>
          <CardDescription>Used for voiceover generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={formData.tts_provider} onValueChange={(v) => setFormData({ ...formData, tts_provider: v })}>
            <SelectTrigger><SelectValue placeholder="System default (ElevenLabs)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              <SelectItem value="openai">OpenAI TTS</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="password"
            placeholder={settings?.has_tts_key ? "Key saved (enter new to replace)" : "API Key (optional)"}
            value={formData.tts_api_key}
            onChange={(e) => setFormData({ ...formData, tts_api_key: e.target.value })}
          />
          {settings?.has_tts_key && <Badge variant="success">Key configured</Badge>}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
        <Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
