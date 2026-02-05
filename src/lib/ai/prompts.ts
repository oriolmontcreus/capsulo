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
