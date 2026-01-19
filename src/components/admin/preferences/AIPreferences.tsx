import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AIPreferences() {
    const [groqKey, setGroqKey] = React.useState("");
    const [showGroqKey, setShowGroqKey] = React.useState(false);
    const [isSaved, setIsSaved] = React.useState(false);

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
                    Configure your API key for the AI assistant powered by Groq.
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

                {/* Groq Input */}
                <div className="space-y-2">
                    <Label htmlFor="groq-key">Groq API Key (Llama 3.3)</Label>
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
                        Powers the AI assistant with Llama 3.3 70B for fast, intelligent responses.
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
