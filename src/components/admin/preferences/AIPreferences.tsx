import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Zap, Cloud, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AIPreferences() {
    const [groqKey, setGroqKey] = React.useState("");
    const [showGroqKey, setShowGroqKey] = React.useState(false);
    const [isSaved, setIsSaved] = React.useState(false);

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

    const hasGroq = !!groqKey.trim();

    return (
        <section className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">AI Assistant Configuration</h3>
                <p className="text-sm text-muted-foreground">
                    Configure your AI providers. Groq handles fast text responses, Cloudflare Workers AI handles vision.
                </p>
            </div>

            <div className="space-y-4">
                {/* Status Alert */}
                {!hasGroq && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Missing API Key</AlertTitle>
                        <AlertDescription>
                            Please add your Groq API key to enable the AI assistant.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Groq Input - Primary Provider */}
                <div className="space-y-2">
                    <Label htmlFor="groq-key" className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        Groq API Key (Text)
                    </Label>
                    <div className="relative">
                        <Input
                            id="groq-key"
                            type={showGroqKey ? "text" : "password"}
                            value={groqKey}
                            onChange={(e) => setGroqKey(e.target.value)}
                            placeholder="Enter your Groq API key"
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowGroqKey(!showGroqKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showGroqKey ? "Hide API key" : "Show API key"}
                            aria-pressed={showGroqKey}
                        >
                            {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border ${hasAiWorker ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'}`}>
                        {hasAiWorker ? (
                            <>
                                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm text-green-700 dark:text-green-300">Configured via environment</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm text-red-700 dark:text-red-300">Not configured</span>
                            </>
                        )}
                    </div>
                    <p className="text-[0.8rem] text-muted-foreground">
                        Enables image understanding with Llama 4 Scout. Configured via PUBLIC_AI_WORKER_URL in .env file.
                    </p>
                </div>

                <div className="pt-2">
                    <Button onClick={handleSave} className="w-full sm:w-auto">
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
            </div>
        </section>
    );
}
