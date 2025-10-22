import * as React from "react";
import { Paintbrush, Settings } from "lucide-react";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AppearancePreferences } from "@/components/admin/preferences/AppearancePreferences";
import { ScrollArea } from "../ui/scroll-area";

const navData = [
    { name: "Appearance", icon: Paintbrush, component: AppearancePreferences },
];

export function PreferencesDialog() {
    const [open, setOpen] = React.useState(false);
    const [activeSection, setActiveSection] = React.useState("Appearance");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem
                    onSelect={(e) => {
                        e.preventDefault();
                        setOpen(true);
                    }}
                >
                    <Settings className="h-4 w-4" />
                    Preferences
                </DropdownMenuItem>
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

                    <main className="flex h-[500px] flex-1 flex-col overflow-hidden">
                        <ScrollArea className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
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
