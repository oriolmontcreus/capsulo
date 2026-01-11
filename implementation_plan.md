# IMPLEMENATION PLAN - AI Agent for CMS

This plan outlines the steps to integrate an AI agent into the Capsulo CMS.

## 1. Settings & Configuration
**Goal**: Allow users to configure API keys for Google AI Studio (Gemini) and Groq (Qwen).

*   **Location**: `src/components/admin/PreferencesDialog.tsx`
*   **Task**:
    *   Create a new preferences section `AIPreferences`.
    *   Add input fields for `Google Generative AI API Key` and `Groq API Key`.
    *   **Storage**: Store these keys securely in `localStorage` (as per user confirmation).

## 2. AI Core Service (The "Brain")
**Goal**: Efficient handling of requests, context gathering, and model routing.

*   **Location**: `src/lib/ai/`
*   **Context Gathering**:
    *   Create a hook/utility `useCMSContext()` that retrieves:
        1.  **Current Page Data** (Components, fields, values).
        2.  **Global Variables** (Site metadata, footer, header, etc.).
    *   Format this data into a lightweight JSON structure.
*   **Model Routing Logic**:
    *   Implement a `ModelRouter` class.
    *   **Key Availability Check**:
        *   **No Keys**: The `AIService` should throw a specific error code like `NO_KEYS`. The UI must handle this by showing a friendly "Please add an API key in Preferences" message.
        *   **Single Key**:
            *   If only **Groq** is available: Always use Groq (Qwen 2.5). Warning in settings: "Add Gemini key for better complex task handling."
            *   If only **Gemini** is available: Always use Gemini. Warning in settings: "Add Groq key for faster/cheaper simple responses."
        *   **Both Keys**: Use the token-based heuristic below.
    *   **Heuristic (Both Keys)**:
        *   Calculate rough token count of (Context + Prompt).
        *   **Rule**:
            *   < X tokens (e.g., 4k) & Simple Intent -> **Groq (Qwen 2.5)** (Fast, Cheap).
            *   > X tokens OR Complex Intent -> **Gemini 1.5 Flash** (Large Context).
*   **Intent Classification**:
    *   Classify intent as `INFO` (read-only) or `ACTION` (edit).
*   **Streaming**: 
    *   Implement streaming support in the `AIService`.
    *   The service should yield chunks of text as they arrive from the providers (both Google and Groq SDKs support streaming).

## 3. UI Integration
**Goal**: A seamless chat interface in the Right Sidebar.

*   **Location**: `src/components/admin/RightSidebar.tsx`
*   **Task**:
    *   Add a new "AI Assistant" tab/mode.
    *   **Chat Interface**:
        *   Message history (User vs. AI).
        *   Input area with auto-resize.
        *   **Streaming Support**: Implement a mechanism to append tokens to the last message in real-time.
        *   **Markdown Support**: Render rich text responses, ensuring the markdown renderer can handle incomplete streams gracefully.
    *   **Context Indicators**: Show "Context: [Page Name] + Globals".

## 4. Editing Capabilities
**Goal**: AI automatically applies changes and allows review.

*   **Flow**:
    1.  User asks to modify content.
    2.  AI generates structured JSON diff/command.
    3.  **Action**: System **automatically applies** the changes to the `CMSManager` state.
    4.  **Feedback**:
        *   The UI shows a success message: "Changes applied."
        *   A button **"View Changes"** appears (listing the `DiffView` or reusing the logic from `DraftChangesAlert`/`ChangesViewer`) so the user can see exactly what changed before publishing.

## 5. Implementation Steps

1.  **Setup**: Install `react-markdown`.
2.  **Settings**: Implement `AIPreferences` in `PreferencesDialog` (localStorage).
3.  **Context**: Implement `useCMSContext` to grab Page + Global data.
4.  **Backend/Service**: Create `AIService` with Groq/Gemini routing.
5.  **UI**: Build `ChatInterface` in `RightSidebar`.
6.  **Binding**: Connect AI "Edit" actions to `CMSManager` updates and trigger the "View Changes" visibility.

## 6. Questions for User
*   (Resolved) Storage: `localStorage`.
*   (Resolved) Edit Flow: Auto-apply + View Changes button.
*   (Resolved) Scope: Page + Globals.
