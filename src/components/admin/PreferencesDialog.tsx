import * as React from "react";
import { MoveHorizontal, Settings, ShieldCheck } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { AppearancePreferences } from "@/components/admin/preferences/AppearancePreferences";
import { ConfirmationsPreferences } from "@/components/admin/preferences/ConfirmationsPreferences";
import { ScrollArea } from "../ui/scroll-area";

const navData = [
    { name: "Content Max Width", icon: MoveHorizontal, component: AppearancePreferences },
    { name: "Confirmations", icon: ShieldCheck, component: ConfirmationsPreferences },
];

export function PreferencesDialog() {
    const [open, setOpen] = React.useState(false);
    const [activeSection, setActiveSection] = React.useState("Content Max Width");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <SidebarMenuButton
                    tooltip={{
                        children: "Preferences",
                        hidden: false,
                    }}
                >
                    <Settings className="size-4" />
                    <span>Preferences</span>
                </SidebarMenuButton>
            </DialogTrigger>

            <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
                <DialogTitle className="sr-only">Preferences</DialogTitle>
                <DialogDescription className="sr-only">Customize your preferences.</DialogDescription>

                <SidebarProvider className="items-start">
                    <Sidebar collapsible="none" className="hidden md:flex">
                        <SidebarContent>
                            <SidebarGroup>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {navData.map((item) => (
                                            <SidebarMenuItem key={item.name}>
                                                <SidebarMenuButton
                                                    isActive={activeSection === item.name}
                                                    onClick={() => setActiveSection(item.name)}
                                                >
                                                    <item.icon />
                                                    <span>{item.name}</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarContent>
                    </Sidebar>

                    <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
                        <ScrollArea className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pt-6">
                            {navData.map((section) => {
                                if (section.name === activeSection) {
                                    const Component = section.component;
                                    return <Component key={section.name} />;
                                }
                                return null;
                            })}
                        </ScrollArea>
                    </main>
                </SidebarProvider>
            </DialogContent>
        </Dialog>
    );
}
