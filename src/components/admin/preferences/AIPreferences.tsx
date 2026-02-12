import {
  AlertCircle,
  Check,
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
} from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  getRetryConfig,
  type RetryConfig,
  setRetryConfig,
} from "@/lib/ai/retry";

export function AIPreferences() {
  const [groqKey, setGroqKey] = React.useState("");
  const [showGroqKey, setShowGroqKey] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [retryConfig, setRetryConfigState] = React.useState<RetryConfig>(
    getRetryConfig()
  );

  // Check if AI Worker URL is configured via env
  const aiWorkerUrl = import.meta.env.PUBLIC_AI_WORKER_URL;
  const hasAiWorker = !!aiWorkerUrl;

  React.useEffect(() => {
    const storedGroq = localStorage.getItem("capsulo-ai-groq-key");
    if (storedGroq) setGroqKey(storedGroq);
  }, []);

  const handleSave = () => {
    localStorage.setItem("capsulo-ai-groq-key", groqKey);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRetryToggle = (enabled: boolean) => {
    const newConfig = { ...retryConfig, enabled };
    setRetryConfigState(newConfig);
    setRetryConfig(newConfig);
  };

  const handleMaxRetriesChange = (value: number) => {
    const newConfig = { ...retryConfig, maxRetries: value };
    setRetryConfigState(newConfig);
    setRetryConfig(newConfig);
  };

  return (
    <section className="space-y-6">
      <div>
        <h3 className="font-medium text-lg">AI Assistant Configuration</h3>
        <p className="text-muted-foreground text-sm">
          Configure your AI providers. Groq handles fast text responses,
          Cloudflare Workers AI handles vision.
        </p>
      </div>

      <div className="space-y-4">
        {/* Groq Input - Primary Provider */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2" htmlFor="groq-key">
            <Zap className="h-4 w-4 text-yellow-500" />
            Groq API Key (Text)
          </Label>
          <div className="relative">
            <Input
              className="pr-10"
              id="groq-key"
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="Enter your Groq API key"
              type={showGroqKey ? "text" : "password"}
              value={groqKey}
            />
            <button
              aria-label={showGroqKey ? "Hide API key" : "Show API key"}
              aria-pressed={showGroqKey}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowGroqKey(!showGroqKey)}
              type="button"
            >
              {showGroqKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-[0.8rem] text-muted-foreground">
            Powers text responses with Llama 3.3 70B. Blazingly fast inference.
          </p>
        </div>

        {/* Cloudflare Worker Status (read-only, from env) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-orange-500" />
            Vision Provider (Cloudflare Workers AI)
          </Label>
          <div
            className={`flex items-center gap-2 rounded-md border px-3 py-2 ${hasAiWorker ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"}`}
          >
            {hasAiWorker ? (
              <>
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-green-700 text-sm dark:text-green-300">
                  Configured via environment
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-red-700 text-sm dark:text-red-300">
                  Not configured
                </span>
              </>
            )}
          </div>
          <p className="text-[0.8rem] text-muted-foreground">
            Enables image understanding with Llama 4 Scout. Configured via
            PUBLIC_AI_WORKER_URL in .env file.
          </p>
        </div>

        <div className="pt-2">
          <Button className="w-full sm:w-auto" onClick={handleSave}>
            {isSaved ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Saved Changes
              </>
            ) : (
              "Save API Key"
            )}
          </Button>
        </div>

        {/* Retry Settings */}
        <div className="space-y-4 border-t pt-6">
          <div>
            <h4 className="flex items-center gap-2 font-medium text-sm">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              Retry Settings
            </h4>
            <p className="mt-1 text-muted-foreground text-sm">
              Configure automatic retry behavior for failed AI requests.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label className="cursor-pointer" htmlFor="retry-toggle">
              Enable automatic retries
            </Label>
            <Switch
              checked={retryConfig.enabled}
              id="retry-toggle"
              onCheckedChange={handleRetryToggle}
            />
          </div>

          {retryConfig.enabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Maximum retry attempts</Label>
                <span className="font-medium text-sm">
                  {retryConfig.maxRetries}
                </span>
              </div>
              <Slider
                max={5}
                min={1}
                onValueChange={([value]) => handleMaxRetriesChange(value)}
                step={1}
                value={[retryConfig.maxRetries]}
              />
              <p className="text-muted-foreground text-xs">
                Failed requests will retry up to {retryConfig.maxRetries} times
                with exponential backoff (5s, 10s, 20s, 40s...).
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
