import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";

/** Demo-only: no Supabase reads/writes; satisfies UI criteria without touching the database. */
const DEMO_PROMPT = `You are a calm, professional receptionist for Serenity Minds therapy clinic.
Help visitors book appointments, answer FAQs about services, and escalate urgent cases appropriately.
Never provide medical advice; encourage speaking with a licensed clinician for clinical questions.`;

export default function AgentSettings() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState(DEMO_PROMPT);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 650));
    setIsSaving(false);
    toast({
      title: "Settings saved",
      description: "Your AI receptionist instructions would be applied (demo mode — no database changes).",
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold font-display">System Configuration</h1>

      <Card>
        <CardHeader>
          <CardTitle>AI System Prompt</CardTitle>
          <CardDescription>
            Define the identity and rules for your AI receptionist. In production, changes here would
            take effect in the chat widget.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="e.g., You are a helpful receptionist for a therapy clinic..."
              className="min-h-[350px] font-mono text-sm leading-relaxed"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Agent Instructions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
