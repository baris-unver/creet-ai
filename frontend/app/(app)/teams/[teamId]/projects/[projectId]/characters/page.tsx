"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Users, MapPin, Sparkles, Save, Trash2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Character, Location, PipelineStatus, ProgressMessage } from "@/types";

export default function CharactersPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressMessage | null>(null);
  const { lastMessage } = useWebSocket(projectId);

  const basePath = `/teams/${teamId}/projects/${projectId}`;

  const loadData = useCallback(() => {
    api.get<Character[]>(`${basePath}/characters`).then(setCharacters);
    api.get<Location[]>(`${basePath}/locations`).then(setLocations);
  }, [basePath]);

  useEffect(() => {
    loadData();
    api.get<PipelineStatus>(`${basePath}/pipeline`).then(setPipeline);
  }, [basePath, loadData]);

  useEffect(() => {
    if (lastMessage) {
      setProgress(lastMessage);
      if (lastMessage.status === "completed" || lastMessage.status === "failed") {
        setGenerating(false);
        loadData();
        api.get<PipelineStatus>(`${basePath}/pipeline`).then(setPipeline);
      }
    }
  }, [lastMessage, basePath, loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(null);
    try {
      await api.post(`${basePath}/pipeline/action`, {
        action: "generate",
        stage: "characters",
      });
    } catch {
      setGenerating(false);
    }
  };

  const handleSaveCharacter = async (id: string, data: Partial<Character>) => {
    setSavingId(id);
    try {
      await api.patch(`${basePath}/characters/${id}`, data);
      loadData();
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    await api.delete(`${basePath}/characters/${id}`);
    loadData();
  };

  const handleSaveLocation = async (id: string, data: Partial<Location>) => {
    setSavingId(id);
    try {
      await api.patch(`${basePath}/locations/${id}`, data);
      loadData();
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    await api.delete(`${basePath}/locations/${id}`);
    loadData();
  };

  const stageStatus = pipeline?.pipeline_state?.characters;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Characters & Locations</h1>
          {stageStatus && <Badge variant="outline" className="capitalize">{stageStatus.replace("_", " ")}</Badge>}
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate Characters
        </Button>
      </div>

      {progress && progress.status === "running" && (
        <Card className="border-primary/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Generating...</span>
              <span className="text-muted-foreground">{progress.message}</span>
            </div>
            <Progress value={progress.progress} />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="characters">
        <TabsList>
          <TabsTrigger value="characters">
            <Users className="mr-1.5 h-4 w-4" />Characters ({characters.length})
          </TabsTrigger>
          <TabsTrigger value="locations">
            <MapPin className="mr-1.5 h-4 w-4" />Locations ({locations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="characters" className="space-y-4 mt-4">
          {characters.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No characters yet. Generate them from the button above.
              </CardContent>
            </Card>
          )}
          {characters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              saving={savingId === char.id}
              onSave={(data) => handleSaveCharacter(char.id, data)}
              onDelete={() => handleDeleteCharacter(char.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="locations" className="space-y-4 mt-4">
          {locations.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No locations yet. They will be generated alongside characters.
              </CardContent>
            </Card>
          )}
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              saving={savingId === loc.id}
              onSave={(data) => handleSaveLocation(loc.id, data)}
              onDelete={() => handleDeleteLocation(loc.id)}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CharacterCard({
  character,
  saving,
  onSave,
  onDelete,
}: {
  character: Character;
  saving: boolean;
  onSave: (data: Partial<Character>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(character.name);
  const [appearance, setAppearance] = useState(JSON.stringify(character.appearance ?? {}, null, 2));
  const [prompt, setPrompt] = useState(character.canonical_prompt ?? "");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{character.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Appearance (JSON)</label>
          <Textarea
            rows={3}
            className="font-mono text-sm"
            value={appearance}
            onChange={(e) => setAppearance(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Canonical Prompt</label>
          <Textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              let parsed: Record<string, unknown> | null = null;
              try { parsed = JSON.parse(appearance); } catch { /* keep null */ }
              onSave({ name, appearance: parsed, canonical_prompt: prompt });
            }}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
            Save
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="mr-1 h-3 w-3" />Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LocationCard({
  location,
  saving,
  onSave,
  onDelete,
}: {
  location: Location;
  saving: boolean;
  onSave: (data: Partial<Location>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(location.name);
  const [details, setDetails] = useState(JSON.stringify(location.details ?? {}, null, 2));
  const [prompt, setPrompt] = useState(location.canonical_prompt ?? "");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{location.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Details (JSON)</label>
          <Textarea
            rows={3}
            className="font-mono text-sm"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Canonical Prompt</label>
          <Textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              let parsed: Record<string, unknown> | null = null;
              try { parsed = JSON.parse(details); } catch { /* keep null */ }
              onSave({ name, details: parsed, canonical_prompt: prompt });
            }}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
            Save
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="mr-1 h-3 w-3" />Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
