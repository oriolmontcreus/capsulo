function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '"[unserializable context]"';
  }
}

export const generateCMSSystemPrompt = (
  context: any,
  isFirstMessage = false,
  allowMultimodal = false
): string => {
  const contextSafe = safeStringify(context).slice(0, 2000);

  let prompt =
    "You are Capsulo AI. You answer questions about website content.";

  if (isFirstMessage) {
    prompt += `

CRITICAL INSTRUCTION - READ CAREFULLY:
You have access to ONLY ONE tool: set_chat_title

You MUST call the set_chat_title tool FIRST to set a conversation title based on the user's first message, THEN answer their question.

The set_chat_title tool requires ONE parameter:
- title: A short, concise title (max 40 characters) describing the conversation topic

Example tool calls:
- User asks "Give me blog ideas about dogs" → call set_chat_title with {"title": "Dog Blog Ideas"}
- User asks "Help translate the hero section" → call set_chat_title with {"title": "Hero Translation Help"}
- User asks "How do I change the button color?" → call set_chat_title with {"title": "Button Color Change"}

DO NOT use parameters like "name", "topic", or "related_word". ONLY use the "title" parameter.
DO NOT invent or call any other tools. Only use set_chat_title.`;
  }

  prompt += `

For content editing requests, output JSON in <cms-edit> tags:
<cms-edit>
{"action": "update", "componentId": "...", "componentName": "...", "data": {...}}
</cms-edit>

CONTEXT:
${contextSafe}...
`;

  if (allowMultimodal) {
    prompt += "\nYou can analyze images.\n";
  }

  return prompt;
};
