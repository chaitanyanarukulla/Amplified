````markdown
# Amplified

**Amplified** – *Everything you already do—Amplified.*

**Amplified** is an AI-powered engineering companion for:

- Meeting productivity  
- Document and design review  
- Test case generation  
- Interview Assistant
- Mock interview preparation  

It combines real-time transcription, intelligent summaries, action item tracking, and context-aware assistance across several modes:

- **Meeting Assistant**  
- **Test Generator**  
- **Document / Design Reviewer**  
- **Interview Assistant (Stealth Mode)** 
- **Mock Interview Assistant** 

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+)
- **Python** (v3.11+)
- **LLM Provider(s)** – one or more of:
  - **OpenAI API Key** (for GPT-4o)
  - **Anthropic API Key** (for Claude 3 Opus) – optional
  - **Ollama** (for local LLMs, e.g. `llama3.2:3b`) – optional, see [ollama.ai](https://ollama.ai)
- **Deepgram API Key** (for real-time transcription)

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Then open .env and set at least:
# - OPENAI_API_KEY      (required)
# - DEEPGRAM_API_KEY    (required)
# - ANTHROPIC_API_KEY   (optional, for Claude)
# - JWT_SECRET_KEY      (optional; auto-generated if omitted)
````

### 2. Frontend Setup

```bash
cd frontend
npm install
```

### 3. Run the App (Dev)

To start both the backend and the Electron app in development:

```bash
cd frontend
npm run electron:dev
```

### 4. 🧪 Testing

**Backend API Tests**

```bash
cd backend
pytest -v tests/
```

**Frontend E2E Tests (Playwright)**

```bash
cd frontend
npm run test:e2e
```

---

## 🎯 Core Features

----


### 1. 🧠 Neural Engine Selector

Pick which AI engine powers Amplified—globally, across all features:

* **OpenAI GPT-4o**
  Best for general reasoning, conversation, and structured answers.

* **Local LLM (Ollama)**
  Private, offline processing using models like `llama3.2:3b` running locally.

* **Claude 3 Opus**
  Anthropic’s most capable model; excellent for complex reasoning and code-heavy tasks.

* **Per-user, Persistent Selection**
  Your choice is stored in your profile and reused across sessions.

* **Seamless Switching**
  Change the active engine from the dashboard at any time; all features (meetings, interviews, test gen, reviews) will use the selected engine through a central router.
----

### 2. 📝 Meeting Assistant

Turn your meetings into structured knowledge:

* **Real-time Transcription**
  Live speech-to-text with speaker separation (diarization).

* **Smart Summaries**
  Auto-generated summaries highlighting key decisions, topics, and outcomes.

* **Action Item Tracking**
  Automatically extracts tasks, owners, and due-style phrasing from discussions.

* **Context Documents**
  Upload agendas, design docs, client docs, and previous notes for better AI context.

* **Meeting History**
  Browse past meetings, summaries, and action items.

* **Meeting Continuation**
  Resume previous meetings as new sessions. Each session:

  * Gets its own summary
  * Inherits context from prior sessions

* **Editable Meeting Titles**
  Rename meetings to keep your history organized.

* **Session Tracking**
  Multiple sessions under a single meeting thread with cumulative action items.

* **Voice Profile**
  Enroll your voice so transcripts show your **name** instead of “Speaker 0”.

---

---

### 3. 🧪 Test Generator

Turn Jira user stories into structured, ready-to-use test cases in seconds.

**What it does:**

* Connects to your **Jira** instance using your saved credentials.
* Lets you paste a **Jira ticket URL or key** (e.g., `PROJ-123`).
* Fetches the story’s **title, description, and acceptance criteria**.
* Uses your selected **Neural Engine** (OpenAI / Claude / Local LLM via Ollama) to generate:

  * Positive test cases
  * Negative / edge test cases
  * Exploratory test ideas

**Output structure:**

* Test title
* Steps
* Expected result

**You can then:**

* **Save** generated test cases to history.
* **Reload** past generations linked to the same Jira ticket.
* **Copy / export** test cases into:

  * Test management tools
  * Documentation
  * Automation test code (e.g., Playwright/pytest skeletons)

**Goal:**
Drastically reduce manual test-writing time while **improving coverage, consistency, and clarity** across QA.

---
### 4. 🕵️ Interview Assistant (Help manager  rate interviews)

Real-time help during live interviews:

* **Transparent Overlay**
  Adjustable opacity (0–100%) so you can see your Zoom/Teams/Meet window behind it.

* **Click-Through Mode**
  Interact with underlying windows while the overlay remains visually present.

* **Context-Aware Suggestions**

  * Your resume
  * Job description
  * Uploaded notes or documents

* **Live Coaching Metrics**
  Real-time:

  * Words per minute (WPM)
  * Filler-word usage (e.g., “uh”, “um”, “like”)

* **Manual Triggers**

  * Instant suggestions on demand (e.g., via keyboard shortcut)
  * “Stall / Pivot” phrases when you need a moment to think

---

### 5. 🎭 Mock Interview Mode

Level up your interview preparation:

* **AI-Generated Questions**
  Behavioral, technical, and situational questions tailored to your resume, role, and job description.

* **Text-to-Speech**
  The AI reads questions aloud for a realistic interview experience.

* **Smart Listening**
  Automatically detects when you finish answering (or you can control manually).

* **Instant Feedback**
  Structured feedback on:

  * Content quality
  * Story structure (e.g., STAR)
  * Delivery and clarity

* **Question Control**
  Skip questions or ask for new ones to stay in control of the session.

* **(Optional) Voice Selection**
  Choose which TTS voice is used for asking questions, for a more natural practice experience.
---

### 6. 🔐 User Authentication

Secure, personalized experience per user:

* **JWT-based Authentication**
  Token-based login and protected API/WebSocket communication.

* **User Registration**
  Simple signup with email + password.

* **Persistent Sessions**
  Stay signed in across app restarts until the token expires or you log out.

* **User-Specific Data**
  All meetings, documents, test cases, preferences, and engine selections are isolated to each account.

* **Secure WebSockets**
  Real-time features (transcription, live coaching, etc.) are protected by auth.

* **Auto-Logout**
  Sessions expire after a defined period (e.g., 7 days) or on auth failure (401).

---

## 📋 Data & Database

### Key Models

* **User**

  * Authentication & profile
  * Per-user settings (including Neural Engine preference)

* **Meeting**

  * Core meeting info (title, timestamps, platform, owner)

* **MeetingSummary**

  * Per-session summary content (short + detailed)
  * Linked to a specific meeting and session

* **MeetingAction**

  * Action items with:

    * Description
    * Owner
    * Status (e.g., open, done)
  * Indexed by status for quick filtering

* **Document**

  * Uploaded files associated with meetings:

    * Agenda
    * Design/spec
    * Client documents
    * Meeting notes

* **UserLLMPreference**

  * User’s selected Neural Engine (OpenAI / Claude / Local LLM via Ollama)

* **JiraSettings / Test Case Generation**

  * Stored per user for Jira credentials and generated test-case history.

### Indexes & Constraints

* Indexes:

  * `user_id`, `start_time` on `Meeting`
  * `meeting_id` on `MeetingSummary`, `MeetingAction`, `Document`
  * `status` on `MeetingAction`
* Cascade deletes:

  * Deleting a `Meeting` cascades to its `MeetingSummary` and `MeetingAction` entries.
* Cleanup:

  * Removed unused `updated_at` fields from `User`, `JiraSettings`, and `UserLLMPreference` where not needed.

---

## 🛠️ Frontend Architecture & Refactoring

To keep the Electron + React frontend maintainable and responsive, several shared hooks and components are used:

* **Hooks**

  * `hooks/useGlobalShortcuts.js`
    Global keyboard shortcuts (e.g., quick open, suggestions in Interview Assistant).
  * `hooks/useElectronWindow.js`
    Manage Electron window behavior (size, position, focus).
  * `hooks/useMockInterview.js`
    Encapsulates mock interview state, question flow, and feedback handling.
  * `hooks/useWebSocket.js`
    Manages real-time WebSocket connections for transcription and live updates.

* **Core Component**

  * `components/AppContent.jsx`
    Main app layout and state orchestration (routing between dashboard, Meeting Assistant, Interview modes, Test Gen, etc.).

---

## 🎮 How to Use Amplified

### Meeting Assistant

1. Go to **Meeting Assistant** from the dashboard.
2. (Optional) Upload documents (agenda, design docs, client docs) for context.
3. Click **Start Meeting** to begin transcription and AI assistance.
4. Add manual notes if desired.
5. Click **End & Summarize** to generate:

   * Summary
   * Action items
6. Revisit the **Meeting History** to:

   * Rename meetings
   * Review outcomes
   * Continue a meeting in a new session.

### Voice Enrollment

1. Open **Voice Enrollment** from the dashboard.
2. Click the microphone button and read the provided text.
3. Enter your display name (e.g., “John”, “Sarah”).
4. Save the profile.
   Future transcripts will use your name instead of “Speaker 0”.
5. Re-enroll anytime to update.

### Mock Interview

1. Select **Mock Interview** from the dashboard.
2. Upload your **resume** and provide a **job description link** and **target role**.
3. Let Amplified research:

   * Company
   * Role expectations
   * Likely questions
4. Start the mock interview:

   * Questions are spoken via TTS.
   * Answer verbally; the app listens and transcribes.
5. Review:

   * Feedback on answer quality and structure.
   * Potential improvements and follow-up questions.

### Interview Assistant 

1. Open **Interview Assistant**.
2. Position the overlay over your video call window.
3. Adjust **transparency** to see the interviewer behind the app.
4. Enable **click-through** to interact with the call UI.
5. Use:

   * Auto-suggestions triggered by question detection.
   * Keyboard shortcuts (e.g., `Cmd + Space`) for on-demand suggestions.
   * Stall/pivot phrases when you need to buy time.

---

## 🗂️ Meeting Management

### Document Types

* **Agenda** – Meeting agenda or schedule.
* **Design Doc / Spec** – Technical specs, architecture, diagrams.
* **Client Document** – SOWs, contracts, client briefs, requirements.
* **Meeting Notes** – Previous notes, outcomes, or shared minutes.

### Meeting Sessions

* A single meeting can have multiple sessions (e.g., Initial, Follow-up 1, Follow-up 2).
* Each session:

  * Produces its own summary.
  * Respects context from previous sessions.
* Action items accumulate across sessions under the same meeting.
* Use **“Continue Meeting”** from history to start a new session with preserved context.

---

## 🧰 Tech Stack

* **Frontend**

  * Electron
  * React
  * Tailwind CSS (glassmorphism-inspired UI)
  * Playwright (end-to-end tests)

* **Backend**

  * Python
  * FastAPI
  * WebSockets
  * SQLModel
  * pytest (API tests)

* **Authentication**

  * JWT tokens
  * bcrypt password hashing

* **AI / LLM**

  * Central LLM router with multiple engines:

    * OpenAI GPT-4o (default)
    * Claude 3 Opus (Anthropic)
    * Local LLM via **Ollama** (e.g., `llama3.2:3b`)

* **Transcription**

  * Deepgram Nova-2 for low-latency streaming ASR

* **Database**

  * SQLite for:

    * Users
    * Meetings & sessions
    * Summaries & action items
    * Documents
    * LLM preferences & Jira/Test Gen data

For more details on authentication internals, see
`AUTH_IMPLEMENTATION_PROGRESS.md`.

---

## ⚠️ Troubleshooting

### Backend

* **“Backend Error”**

  * Ensure the virtual env is activated and dependencies are installed.
  * Check FastAPI logs for stack traces.

* **“API Key Missing”**

  * Confirm `backend/.env` has:

    * `OPENAI_API_KEY`
    * `DEEPGRAM_API_KEY`
    * (Optional) `ANTHROPIC_API_KEY`

* **DB Migration Issues**

  * If schema mismatches occur in dev, you can reset by deleting the local DB file (e.g., `backend/amplified.db`) and restarting.
    *(Only do this in local/dev environments.)*

### Frontend

* **Blank Window**

  * Ensure backend is running.
  * Open DevTools (Ctrl+Shift+I / Cmd+Opt+I) and check console errors.

* **No Transcription**

  * Verify microphone permissions are granted.
  * Confirm Deepgram key is valid and backend logs show connection success.

* **Missing Summaries**

  * Check backend logs for OpenAI/LLM errors.
  * Confirm your Neural Engine is configured and reachable.

### Meeting History

* **No Action Items**

  * Action extraction depends on clear phrases like:
    “*John will…*”, “*I’ll take care of…*”, “*We need to…*”.

* **Missing Summaries**

  * Ensure you clicked **End & Summarize** and there were enough transcript segments.

* **Cannot Edit Title**

  * Hover over the meeting card and look for the edit icon/button.

---

## 🔐 Privacy & Security

* **User Authentication**

  * JWT-based login with bcrypt password hashing.

* **User Isolation**

  * Each account’s meetings, documents, test cases, and preferences are stored separately.

* **Local Audio Handling**

  * Audio is processed in memory for transcription; it is not written to disk by default.

* **Ephemeral Sessions**

  * Meeting and interview sessions are scoped and cleared when closed.

* **Secret Management**

  * API keys (OpenAI, Anthropic, Deepgram, etc.) are stored via environment variables.

* **Secure WebSockets**

  * Real-time channels require a valid JWT.

* **Session Expiry**

  * Tokens expire after a configured period; expired tokens trigger logout.

---

## 🚧 Known Limitations

* Action item extraction depends on relatively clear, structured speech patterns.
* Speaker diarization accuracy can vary by microphone and room conditions.
* Meeting continuation does not replay raw audio; it builds on summaries and context.
* Document upload currently supports **PDF**, **DOCX**, and **TXT**. Other formats may require conversion.

```
```
