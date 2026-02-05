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
  // Extract just component names and IDs for context
  const components = context?.page?.data?.components || [];
  const componentSummary = components
    .map((c: any) => `- ${c.schemaName} (ID: ${c.id})`)
    .join("\n");

  let prompt = "You are Capsulo AI. You help users manage website content.";

  prompt += `

IMPORTANT RULES:
1. NEVER output the full context data or component details in your response
2. When users ask to edit content, explain what you'll do in natural language
3. Changes will be applied automatically - you don't need to show JSON

You can help with:
- Answering questions about the website
- Suggesting content improvements
- Explaining changes you'll make

Available components:
${componentSummary || "No components available"}
`;

  if (allowMultimodal) {
    prompt += "\nYou can analyze images.\n";
  }

  return prompt;
};
