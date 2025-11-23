import { usePreferences } from "@/lib/context/PreferencesContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const confirmationOptions = [
    {
        id: 'deleteComponent' as const,
        label: 'Delete component',
        description: 'Show confirmation when deleting a component from a page',
    },
    {
        id: 'cancelForm' as const,
        label: 'Cancel the Add component form',
        description: 'Show confirmation when canceling a form with unsaved changes',
    },
    {
        id: 'deleteRepeaterItem' as const,
        label: 'Delete repeater item',
        description: 'Show confirmation when deleting an item from a repeater list',
    },
];

export function ConfirmationsPreferences() {
    const { confirmations, setConfirmation } = usePreferences();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Confirmations</h3>
                <p className="text-sm text-muted-foreground">
                    Choose which actions require confirmation dialogs
                </p>
            </div>

            <div className="space-y-4">
                {confirmationOptions.map((option) => (
                    <div key={option.id} className="flex items-center justify-between space-x-2">
                        <div className="flex-1 space-y-1">
                            <Label htmlFor={option.id} className="text-sm font-medium cursor-pointer">
                                {option.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {option.description}
                            </p>
                        </div>
                        <Switch
                            id={option.id}
                            checked={confirmations[option.id] ?? true}
                            onCheckedChange={(checked) => setConfirmation(option.id, checked)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
