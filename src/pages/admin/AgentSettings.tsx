import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";

export default function AgentSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = requireSupabase();
  const [prompt, setPrompt] = useState("");

  // Fetch the current prompt
  const { data, isLoading } = useQuery({
    queryKey: ["agent-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_settings")
        .select("system_prompt")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Sync local state when data is loaded
  useEffect(() => {
    if (data?.system_prompt) {
      setPrompt(data.system_prompt);
    }
  }, [data]);

  // Update the prompt in the database
  const mutation = useMutation({
    mutationFn: async (newPrompt: string) => {
      const { error } = await supabase
        .from("agent_settings")
        .update({ system_prompt: newPrompt })
        .eq('id', 1); // Ensure you have a row with ID 1 in your table
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "The AI agent's instructions have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["agent-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold font-display">System Configuration</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>AI System Prompt</CardTitle>
          <CardDescription>
            Define the identity and rules for your AI receptionist. Changes here take effect immediately in the chat widget.
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
            <Button 
              onClick={() => mutation.mutate(prompt)}
              disabled={mutation.isPending}
              className="gap-2"
            >
              {mutation.isPending ? (
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