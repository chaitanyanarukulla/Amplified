# Amplified

**Amplified** – *Everything you already do—Amplified.*

**Amplified** is an AI-powered engineering companion that combines real-time transcription, intelligent knowledge management, and context-aware assistance across multiple workflows:

- **Meeting Assistant** with RAG-powered insights
- **Knowledge Vault** for unified knowledge management  
- **Test Case Generator** with intelligent recommendations
- **Test Plan Generator** for comprehensive strategies
- **Document Analyzer** with semantic search
- **Interview Assistant** (Stealth Mode)
- **Mock Interview** preparation

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+)
- **Python** (v3.11+)
- **PostgreSQL** (v14+) or **SQLite** (for development)
- **LLM Provider(s)** – one or more of:
  - **OpenAI API Key** (for GPT-4o)
  - **Anthropic API Key** (for Claude 3.5 Sonnet) – optional
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
# Then open .env and set:
# - OPENAI_API_KEY      (required)
# - DEEPGRAM_API_KEY    (required)
# - DATABASE_URL        (PostgreSQL connection string or SQLite path)
# - ANTHROPIC_API_KEY   (optional, for Claude)
# - LOCAL_LLM_URL       (optional, for Ollama)
# - JWT_SECRET_KEY      (optional; auto-generated if omitted)

# Run database migrations
alembic upgrade head

# Start the backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

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

### 1. 📝 Meeting Assistant

Turn your meetings into searchable, actionable knowledge:

* **Real-time Transcription**
  Live speech-to-text with speaker separation (diarization).

* **Smart Summaries**
  Auto-generated summaries highlighting key decisions, topics, and outcomes.

* **Action Item Tracking**
  Automatically extracts tasks, owners, and due dates from discussions.

* **RAG-Powered Q&A**
  Ask questions during meetings and get answers based on:
  - Current meeting context
  - Past meeting summaries
  - Uploaded documents
  - Generated test cases

* **Meeting History**
  Browse past meetings with full-text search and semantic search.

* **Meeting Continuation**
  Resume previous meetings as new sessions with inherited context.

* **Voice Profile**
  Enroll your voice so transcripts show your **name** instead of "Speaker 0".

---

### 2. 🗄️ Knowledge Vault

**Unified knowledge management** across all your work:

* **All Your Knowledge in One Place**
  - Documents (PDFs, DOCX)
  - Meeting summaries and transcripts
  - Generated test cases
  - All automatically indexed and searchable

* **AI-Powered Search**
  - Semantic search across all content
  - Ask questions in natural language
  - Get answers with source citations

* **Smart Organization**
  - Filter by type (documents, meetings, test cases)
  - View detailed information for any item
  - Delete items (removes from everywhere including vector store)

* **RAG Integration**
  Everything you save is automatically:
  - Chunked for optimal retrieval
  - Embedded using OpenAI embeddings
  - Stored in ChromaDB vector database
  - Available for AI-powered features

---

### 3. 🧠 Neural Engine Selector

Pick which AI engine powers Amplified—globally, across all features:

* **OpenAI GPT-4o**
  Best for general reasoning, conversation, and structured answers.

* **Claude 3.5 Sonnet**
  Anthropic's most capable model; excellent for complex reasoning and code-heavy tasks.

* **Local LLM (Ollama)**
  Private, offline processing using models like `llama3.2:3b` running locally.

* **Per-user, Persistent Selection**
  Your choice is stored in your profile and reused across sessions.

* **Seamless Switching**
  Change the active engine from the dashboard at any time.

---

### 4. 🧪 Test Generator

Turn Jira user stories into structured test cases with **intelligent recommendations**:

**What it does:**

* Connects to your **Jira** instance using your saved credentials.
* Fetches story details (title, description, acceptance criteria).
* Uses your selected **Neural Engine** to generate:
  - Positive test cases
  - Negative / edge test cases
  - Exploratory test ideas

**RAG-Powered Recommendations:**

* **Similar Test Cases**
  Automatically finds relevant test cases from your history based on:
  - Similar Jira tickets
  - Related functionality
  - Common patterns

* **Smart Reuse**
  Leverage past work to:
  - Ensure consistency
  - Save time
  - Improve coverage

**Output structure:**

* Test title
* Steps
* Expected result
* Test type (positive/negative/exploratory)

* Test type (positive/negative/exploratory)

---

### 5. 📋 Test Plan Generator

**Generate comprehensive Test Plans & Strategies** from your existing documentation:

**Key Features:**

* **Multi-Source Input**
  - **Confluence**: Direct integration to fetch page content
  - **Documents**: Upload PDF, DOCX, TXT, or MD files

* **Flexible Output**
  - **Test Plan**: Detailed plan covering scope, approach, environment, and execution
  - **Test Strategy**: High-level strategic document with risk analysis and quality goals

* **Senior QA Persona**
  - Content generated by an AI acting as a "Seasoned Senior Automation Software Quality Engineer"
  - Professional tone, industry-standard terminology, and deep insights

* **Rich Formatting**
  - Beautifully styled output with gradients, custom lists, and tables
  - Export to Markdown for easy sharing and editing

---

### 6. 📄 Document Analyzer

**Intelligent document analysis** with semantic understanding:

* **Upload & Extract**
  - PDF, DOCX, TXT support
  - Automatic text extraction
  - Metadata preservation

* **Semantic Search**
  - Find relevant sections across all documents
  - Natural language queries
  - Relevance scoring

* **RAG Integration**
  - Documents are automatically chunked and indexed
  - Available for AI-powered Q&A
  - Cited in meeting assistance and test recommendations

* **Tag & Organize**
  - Custom tags for categorization
  - Filter by document type
  - Quick access to frequently used docs

---

### 7. 🎭 Mock Interview Mode

Level up your interview preparation:

* **AI-Generated Questions**
  Behavioral, technical, and situational questions tailored to your resume and role.

* **Text-to-Speech**
  The AI reads questions aloud for a realistic interview experience.

* **Smart Listening**
  Automatically detects when you finish answering.

* **Instant Feedback**
  Structured feedback on:
  - Content quality
  - Story structure (e.g., STAR)
  - Delivery and clarity

---

### 8. 🕵️ Interview Assistant (Stealth Mode)

Real-time help during live interviews:

* **Transparent Overlay**
  Adjustable opacity (0–100%) so you can see your video call behind it.

* **Click-Through Mode**
  Interact with underlying windows while the overlay remains visible.

* **Context-Aware Suggestions**
  Suggested answers based on:
  - Your resume
  - Job description
  - Uploaded notes or documents

* **Live Coaching Metrics**
  Real-time:
  - Words per minute (WPM)
  - Filler-word usage (e.g., "uh", "um", "like")

---

### 9. 🔐 User Authentication

Secure, personalized experience per user:

* **JWT-based Authentication**
  Token-based login and protected API/WebSocket communication.

* **User Registration**
  Simple signup with email + password.

* **Persistent Sessions**
  Stay signed in across app restarts.

* **User-Specific Data**
  All meetings, documents, test cases, and preferences are isolated to each account.

* **Secure WebSockets**
  Real-time features require valid authentication.

---

## 🤖 RAG (Retrieval-Augmented Generation) System

**Amplified's RAG system** powers intelligent features across the entire application:

### Architecture

* **Vector Store**: ChromaDB for semantic search
* **Embeddings**: OpenAI text-embedding-3-small
* **Database**: PostgreSQL/SQLite for relational data
* **Chunking**: Smart text chunking (500 tokens, 50 overlap)

### What Gets Indexed

1. **Documents**
   - Full text content
   - Metadata (filename, type, tags)
   - Chunked for optimal retrieval

2. **Meetings**
   - Summaries (short + detailed)
   - Action items
   - Metadata (title, platform, participants)

3. **Test Cases**
   - Generated test suites
   - Jira ticket information
   - Test types and coverage

### RAG-Powered Features

* **Meeting Q&A**: Ask questions during meetings, get answers from all your knowledge
* **Test Recommendations**: Find similar test cases from past work
* **Document Search**: Semantic search across all uploaded documents
* **Knowledge Vault**: Unified search and Q&A across everything
* **Smart Tagging**: AI-powered tag suggestions
* **Duplicate Detection**: Find similar content to avoid redundancy

### User Isolation

* All RAG operations are **user-scoped**
* Vector embeddings include user_id metadata
* Search results filtered by user_id
* Complete data isolation between users

---

## 📋 Data & Database

### Key Models

* **User**
  - Authentication & profile
  - Per-user settings (Neural Engine preference)

* **Meeting**
  - Core meeting info (title, timestamps, platform)
  - Multiple sessions support
  - RAG-indexed summaries

* **MeetingSummary**
  - Per-session summary content
  - Automatically indexed for RAG

* **MeetingAction**
  - Action items with owner, status, due date
  - Indexed by status for filtering

* **Document**
  - Uploaded files with extracted text
  - Automatically chunked and indexed
  - Supports PDF, DOCX, TXT

* **TestCaseGeneration**
  - Generated test suites
  - Linked to Jira tickets
  - RAG-indexed for recommendations

* **TestPlanGenerationHistory**
  - Generated test plans/strategies
  - Source tracking (Confluence/Document)

* **ConfluenceSettings**
  - User-specific Confluence credentials (encrypted)

* **UserLLMPreference**
  - User's selected Neural Engine

### Vector Store Schema

* **Collections**: One per user (`user_{user_id}`)
* **Metadata**:
  - `entity_id`: Unique identifier
  - `entity_type`: document, meeting, test_case
  - `user_id`: Owner
  - `created_at`, `updated_at`: Timestamps
  - Type-specific metadata (filename, jira_ticket, etc.)

---

## 🛠️ Frontend Architecture

* **Hooks**
  - `hooks/useGlobalShortcuts.js`: Global keyboard shortcuts
  - `hooks/useElectronWindow.js`: Window management
  - `hooks/useMockInterview.js`: Mock interview state
  - `hooks/useWebSocket.js`: Real-time WebSocket connections

* **Core Components**
  - `components/AppContent.jsx`: Main app layout and routing
  - `components/KnowledgeVault.jsx`: Unified knowledge management
  - `components/MeetingAssistant.jsx`: Meeting features
  - `components/TestGenDashboard.jsx`: Test generation
  - `components/TestPlanGen/TestPlanGenDashboard.jsx`: Test plan generation
  - `components/DocAnalyzer.jsx`: Document analysis

---

## 🎮 How to Use Amplified

### Meeting Assistant

1. Navigate to **Meeting Assistant** from the dashboard
2. Fill in meeting details (title, platform, start time)
3. Click **Start Meeting** to begin transcription
4. During the meeting:
   - Click **Suggest Answer** for AI-powered help
   - Add manual notes
   - Upload context documents
5. Click **End & Summarize** to generate summary and action items
6. Everything is automatically saved to Knowledge Vault

### Knowledge Vault

1. Open **Knowledge Vault** from the dashboard
2. Use the AI chat bar to ask questions about your knowledge
3. Filter by type: All, Documents, Meetings, Test Cases
4. Click any item to view full details
5. Delete items you no longer need (removes from everywhere)

### Test Generator

1. Select **Test Generator** from the dashboard
2. Configure Jira connection (one-time setup)
3. Enter a Jira ticket URL or key
4. Review AI-generated test cases
5. See **Recommendations** for similar past test cases
6. Save to history (automatically indexed for future recommendations)

### Test Plan Generator

1. Select **Test Plan Gen** from the dashboard
2. Choose your source: **Confluence** or **Document**
3. **Confluence**: Enter URL (configure credentials first if needed)
4. **Document**: Upload a file (PDF, DOCX, etc.)
5. Select output type: **Test Plan** or **Test Strategy**
6. Click **Generate** to create a detailed, professional document
7. Export to Markdown or copy to clipboard

### Voice Enrollment

1. Open **Voice Enrollment** from the dashboard
2. Click the microphone and read the provided text
3. Enter your display name
4. Save the profile
5. Future transcripts will use your name

---

## 🧰 Tech Stack

* **Frontend**
  - Electron
  - React
  - Tailwind CSS
  - Playwright (E2E tests)

* **Backend**
  - Python 3.11+
  - FastAPI
  - WebSockets
  - SQLModel
  - pytest (API tests)
  - structlog (Structured logging)

* **Authentication**
  - JWT tokens
  - bcrypt password hashing

* **AI / LLM**
  - Central LLM router:
    - OpenAI GPT-4o
    - Claude 3.5 Sonnet
    - Local LLM via Ollama

* **RAG System**
  - ChromaDB (vector store)
  - OpenAI embeddings (text-embedding-3-small)
  - LangChain (text splitting)

* **Transcription**
  - Deepgram Nova-2 (streaming ASR)

* **Database**
  - PostgreSQL (production)
  - SQLite (development)
  - Alembic (migrations)

---

## ⚠️ Troubleshooting

### Backend

* **"Backend Error"**
  - Ensure virtual env is activated
  - Check FastAPI logs for stack traces
  - Verify all environment variables are set

* **"API Key Missing"**
  - Confirm `backend/.env` has required keys
  - Check key validity with provider

* **RAG/Vector Store Issues**
  - Ensure ChromaDB is running
  - Check `backend/chroma_db/` directory exists
  - Review logs for indexing errors

### Frontend

* **Blank Window**
  - Ensure backend is running on port 8000
  - Open DevTools and check console errors

* **No Transcription**
  - Verify microphone permissions
  - Confirm Deepgram key is valid
  - Check WebSocket connection in DevTools

* **Knowledge Vault Empty**
  - Ensure you've created meetings/uploaded documents
  - Check backend logs for indexing errors
  - Verify user authentication

---

## 🔐 Privacy & Security

* **User Authentication**: JWT-based with bcrypt password hashing
* **User Isolation**: Complete data separation between accounts
* **Local Audio Handling**: Audio processed in memory, not stored
* **Secret Management**: API keys via environment variables
* **Secure WebSockets**: Real-time channels require valid JWT
* **Vector Store Isolation**: User-scoped collections in ChromaDB

---

## 📚 Additional Documentation

- `RAG_FEATURES_GUIDE.md` - Comprehensive RAG features guide
- `RAG_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `UAT_TESTING_GUIDE.md` - User acceptance testing guide
- `AUTH_IMPLEMENTATION_PROGRESS.md` - Authentication details
- `LOGGING_IMPLEMENTATION.md` - Logging implementation

---

## 🚧 Known Limitations

* Action item extraction depends on clear speech patterns
* Speaker diarization accuracy varies by microphone quality
* Document upload supports PDF, DOCX, TXT (other formats need conversion)
* RAG search quality depends on content quality and quantity
* Local LLM performance varies by model and hardware

---

## 📝 License

[Your License Here]

---

**Built with ❤️ to amplify your productivity**
