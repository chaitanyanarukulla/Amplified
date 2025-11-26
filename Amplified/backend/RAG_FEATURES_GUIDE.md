# RAG-Powered Features - Usage Guide

## 🎯 Overview

Your Amplified application now has powerful AI features powered by the RAG (Retrieval-Augmented Generation) system. This guide shows you how to use each feature.

---

## ✅ Implemented Features (Backend Ready)

### 1. AI Meeting Assistant 🎯
**Status:** Backend Complete | Frontend Integration Needed

**What it does:** Ask questions during meetings and get AI-powered answers with context from past meetings, documents, and test cases.

**API Endpoint:**
```http
POST /api/meetings/{meeting_id}/ask
Content-Type: application/json

{
  "question": "What decisions were made about authentication in past meetings?"
}
```

**Response:**
```json
{
  "answer": "According to past meetings, the team decided to use JWT tokens for authentication...",
  "related_meetings": [...],
  "related_documents": [...],
  "related_test_cases": [...]
}
```

**Frontend Integration:**
```javascript
// In your Meeting component
const askQuestion = async (question) => {
  const response = await fetch(`/api/meetings/${meetingId}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  const data = await response.json();
  // Display answer and sources
};
```

---

### 2. Smart Document Search 🔍
**Status:** Backend Complete | Frontend Integration Needed

**What it does:** Semantic search across all documents using natural language queries.

**API Endpoint:**
```http
POST /api/documents/search
Content-Type: application/x-www-form-urlencoded

query=requirements for authentication&limit=10
```

**Response:**
```json
[
  {
    "id": "doc_123",
    "filename": "auth_requirements.pdf",
    "snippet": "The authentication system must support...",
    "score": 0.92,
    "type": "document"
  }
]
```

**Frontend Integration:**
The existing Knowledge Vault UI (`KnowledgeVault.jsx`) already has a search bar. The backend now returns semantic results instead of keyword matches.

---

### 3. Test Case Recommendations 🧪
**Status:** Backend Complete | Frontend Integration Needed

**What it does:** Get similar test cases from past work when generating new test cases.

**API Endpoint:**
```http
POST /api/test-gen/recommendations
Content-Type: application/json

{
  "ticket_description": "Implement login functionality with OAuth"
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "ticket_key": "JIRA-123",
      "ticket_title": "OAuth Integration",
      "similarity_score": 0.89,
      "test_cases": {...},
      "snippet": "Test cases for OAuth login flow..."
    }
  ],
  "message": "Found 3 similar test cases"
}
```

**Frontend Integration:**
```javascript
// In Test Gen component, before generating new test cases
const getRecommendations = async (description) => {
  const response = await fetch('/api/test-gen/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket_description: description })
  });
  const data = await response.json();
  // Show recommendations to user
};
```

---

### 4. Knowledge Vault Q&A 💬
**Status:** Backend Complete | Frontend Integration Needed

**What it does:** Chat interface where users can ask questions about their knowledge base.

**API Endpoint:**
```http
POST /api/knowledge/ask
Content-Type: application/json

{
  "question": "What are the requirements for the user profile feature?",
  "context_type": null  // or "meeting", "document", "test_case"
}
```

**Response:**
```json
{
  "answer": "According to Source 1 (requirements.pdf), the user profile feature must include...",
  "sources": [
    {
      "id": "doc_123",
      "type": "document",
      "snippet": "User profile requirements...",
      "relevance": 0.91,
      "metadata": {...}
    }
  ],
  "confidence": "high"
}
```

**Frontend Integration:**
Add a chat interface to the Knowledge Vault component:
```javascript
// Add to KnowledgeVault.jsx
const [chatMessages, setChatMessages] = useState([]);
const [question, setQuestion] = useState('');

const askQuestion = async () => {
  const response = await fetch('/api/knowledge/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  const data = await response.json();
  
  setChatMessages([...chatMessages, 
    { role: 'user', content: question },
    { role: 'assistant', content: data.answer, sources: data.sources }
  ]);
};
```

---

### 5. Knowledge Search 🔎
**Status:** Backend Complete | Can Use Immediately

**What it does:** Unified search across all artifacts (documents, meetings, test cases).

**API Endpoint:**
```http
GET /api/knowledge/search?q=authentication&limit=10&entity_type=meeting
```

**Response:**
```json
{
  "query": "authentication",
  "results": [
    {
      "entity_id": "m_123",
      "entity_type": "meeting",
      "content": "Meeting about authentication...",
      "relevance_score": 0.88,
      "metadata": {...}
    }
  ],
  "total_results": 5
}
```

---

### 6. Knowledge Stats 📊
**Status:** Backend Complete | Can Use Immediately

**What it does:** Get statistics about indexed knowledge.

**API Endpoint:**
```http
GET /api/knowledge/stats
```

**Response:**
```json
{
  "user_id": "user_123",
  "indexed_artifacts": {
    "document": 15,
    "meeting": 26,
    "test_case": 1
  },
  "total_artifacts": 42
}
```

---

### 7. Auto-Tagging 🏷️
**Status:** Backend Complete | Can Use Immediately

**What it does:** Suggest tags based on similar content.

**API Endpoint:**
```http
POST /api/knowledge/suggest-tags
Content-Type: application/json

{
  "content": "This document describes the authentication flow...",
  "entity_type": "document"
}
```

**Response:**
```json
{
  "suggested_tags": ["authentication", "security", "backend", "api", "oauth"]
}
```

---

### 8. Duplicate Detection 🔄
**Status:** Backend Complete | Can Use Immediately

**What it does:** Check if content is similar to existing content.

**API Endpoint:**
```http
POST /api/knowledge/check-duplicate
Content-Type: application/json

{
  "content": "Meeting about sprint planning...",
  "entity_type": "meeting"
}
```

**Response:**
```json
{
  "is_duplicate": true,
  "similar_to_id": "m_456",
  "similarity_score": 0.92,
  "message": "This looks very similar to an existing meeting",
  "existing_content": "Sprint planning meeting from last week..."
}
```

---

## 🚀 Quick Start Examples

### Example 1: Meeting Assistant
```javascript
// During a meeting, user asks a question
const answer = await fetch('/api/meetings/m_123/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    question: "What was decided about the API redesign?" 
  })
}).then(r => r.json());

console.log(answer.answer);
// "According to the meeting from last week, the team decided to use REST instead of GraphQL..."
```

### Example 2: Smart Search in Knowledge Vault
```javascript
// User searches for "login requirements"
const results = await fetch('/api/knowledge/search?q=login requirements&limit=5')
  .then(r => r.json());

results.results.forEach(result => {
  console.log(`${result.entity_type}: ${result.content.substring(0, 100)}...`);
  console.log(`Relevance: ${(result.relevance_score * 100).toFixed(0)}%`);
});
```

### Example 3: Test Case Recommendations
```javascript
// Before generating test cases for a new ticket
const recommendations = await fetch('/api/test-gen/recommendations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    ticket_description: "Implement password reset functionality" 
  })
}).then(r => r.json());

// Show user: "Found 3 similar test cases from past work"
recommendations.recommendations.forEach(rec => {
  console.log(`${rec.ticket_key}: ${rec.test_cases.test_cases.length} test cases`);
});
```

---

## 📝 Frontend Integration Checklist

### Knowledge Vault (Existing UI)
- [x] Backend endpoints ready
- [ ] Update search to use `/api/knowledge/search`
- [ ] Add Q&A chat interface
- [ ] Show relevance scores
- [ ] Add filter by entity type

### Meeting Page
- [x] Backend endpoint ready
- [ ] Add "Ask AI" button/panel
- [ ] Display answer with sources
- [ ] Make sources clickable

### Test Gen Page
- [x] Backend endpoint ready
- [ ] Add "Get Recommendations" button
- [ ] Show similar test cases
- [ ] Allow copying test cases

### Documents Page
- [x] Backend enhanced
- [ ] Update UI to show relevance scores
- [ ] Add semantic search indicator

---

## 🧪 Testing the Features

### Test 1: Meeting Q&A
```bash
curl -X POST "http://localhost:8000/api/meetings/m_123/ask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"question": "What decisions were made about authentication?"}'
```

### Test 2: Knowledge Search
```bash
curl "http://localhost:8000/api/knowledge/search?q=authentication&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Test Recommendations
```bash
curl -X POST "http://localhost:8000/api/test-gen/recommendations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"ticket_description": "Implement login with OAuth"}'
```

### Test 4: Knowledge Stats
```bash
curl "http://localhost:8000/api/knowledge/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 💡 Usage Tips

1. **Meeting Assistant**: Best used during live meetings when you need quick context
2. **Smart Search**: Use natural language queries, not just keywords
3. **Test Recommendations**: Check before generating new test cases to avoid duplication
4. **Auto-Tagging**: Use when uploading new documents to maintain consistency
5. **Duplicate Detection**: Run before creating new meetings/documents

---

## 🎯 Next Steps

1. **Frontend Integration**: Connect existing UI components to new endpoints
2. **User Testing**: Get feedback on AI answer quality
3. **Analytics**: Track which features are most used
4. **Refinement**: Improve prompts based on user feedback

---

## 📞 API Reference Summary

| Feature | Endpoint | Method | Status |
|---------|----------|--------|--------|
| Meeting Q&A | `/api/meetings/{id}/ask` | POST | ✅ Ready |
| Document Search | `/api/documents/search` | POST | ✅ Enhanced |
| Test Recommendations | `/api/test-gen/recommendations` | POST | ✅ Ready |
| Knowledge Q&A | `/api/knowledge/ask` | POST | ✅ Ready |
| Knowledge Search | `/api/knowledge/search` | GET | ✅ Ready |
| Knowledge Stats | `/api/knowledge/stats` | GET | ✅ Ready |
| Suggest Tags | `/api/knowledge/suggest-tags` | POST | ✅ Ready |
| Check Duplicate | `/api/knowledge/check-duplicate` | POST | ✅ Ready |

All endpoints require authentication via Bearer token.
