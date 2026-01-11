import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Bot } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AIPreferences() {
    const [googleKey, setGoogleKey] = React.useState("");
    const [groqKey, setGroqKey] = React.useState("");
    const [showGoogleKey, setShowGoogleKey] = React.useState(false);
    const [showGroqKey, setShowGroqKey] = React.useState(false);
    const [isSaved, setIsSaved] = React.useState(false);

    React.useEffect(() => {
        const storedGoogle = localStorage.getItem("capsulo-ai-google-key");
        const storedGroq = localStorage.getItem("capsulo-ai-groq-key");
        if (storedGoogle) setGoogleKey(storedGoogle);
        if (storedGroq) setGroqKey(storedGroq);
    }, []);

    const handleSave = () => {
        localStorage.setItem("capsulo-ai-google-key", googleKey);
        localStorage.setItem("capsulo-ai-groq-key", groqKey);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const hasGoogle = !!googleKey.trim();
    const hasGroq = !!groqKey.trim();

    return (
        <section className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">AI Assistant Configuration</h3>
                <p className="text-sm text-muted-foreground">
                    Configure API keys for the AI assistant. Capsulo uses a hybrid approach with two models.
                </p>
            </div>

            <div className="space-y-4">
                {/* Status Alerts */}
                {!hasGoogle && !hasGroq && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Missing API Keys</AlertTitle>
                        <AlertDescription>
                            Please add at least one API key to enable the AI assistant.
                        </AlertDescription>
                    </Alert>
                )}

                {(hasGoogle !== hasGroq) && (hasGoogle || hasGroq) && (
                    <Alert className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertTitle>Partial Configuration</AlertTitle>
                        <AlertDescription>
                            {hasGoogle 
                                ? "Add a Groq key for faster and cheaper responses on simple tasks." 
                                : "Add a Google AI Studio key for better handling of complex tasks and larger contexts."}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Google AI Input */}
                <div className="space-y-2">
                    <Label htmlFor="google-key">Google AI Studio API Key (Gemini)</Label>
                    <div className="relative">
                        <Input
                            id="google-key"
                            type={showGoogleKey ? "text" : "password"}
                            value={googleKey}
                            onChange={(e) => setGoogleKey(e.target.value)}
                            placeholder="Enter your Gemini API key"
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowGoogleKey(!showGoogleKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showGoogleKey ? "Hide API key" : "Show API key"}
                            aria-pressed={showGoogleKey}
                        >
                            {showGoogleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-[0.8rem] text-muted-foreground">
                        Used for complex reasoning and large context processing (Gemini 1.5 Flash).
                    </p>
                </div>

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
                        Used for fast interactions and simple tasks (Llama 3.3 70B).
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
                            "Save API Keys"
                        )}
                    </Button>
                </div>
            </div>
        </section>
    );
}
