import * as React from "react";
import { ChatInterface } from "../ai/ChatInterface";

interface AIAgentTabProps {
    onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void;
}

export const AIAgentTab: React.FC<AIAgentTabProps> = ({ onViewChange }) => {
    return (
        <div className="flex-1 overflow-hidden">
            <ChatInterface onViewChange={onViewChange} />
        </div>
    );
};
