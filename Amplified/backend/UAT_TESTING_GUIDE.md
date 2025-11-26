# UAT Testing Guide - Fresh Start

## 🧹 Step 1: Reset Databases

I've created a safe reset script that will clear both PostgreSQL and ChromaDB.

### Run the reset script:

```bash
cd backend
python reset_databases.py
```

**You'll be prompted to confirm:**
```
Type 'DELETE ALL DATA' to confirm:
```

Type exactly: `DELETE ALL DATA` and press Enter.

**What it does:**
- ✅ Deletes all ChromaDB vectors (`./amplified_vectors` directory)
- ✅ Truncates all PostgreSQL tables (users, meetings, documents, etc.)
- ✅ Preserves database schema (tables remain, just empty)

---

## 🚀 Step 2: Start Fresh UAT Testing

### 1. Start the Backend
```bash
cd backend
uvicorn main:app --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```

### 3. Create Your First User
- Navigate to signup page
- Create a test user account
- Login with new credentials

---

## ✅ UAT Test Scenarios

### Scenario 1: Document Upload & Search
1. **Upload a document**
   - Go to Knowledge Vault
   - Upload a PDF or DOCX file
   - Verify it appears in the list

2. **Test semantic search**
   - Search for content using natural language
   - Verify results show relevance scores
   - Check that snippets are displayed

3. **Test AI Chat**
   - Click "AI Chat" button
   - Ask a question about the uploaded document
   - Verify AI provides answer with sources

### Scenario 2: Meeting Management
1. **Create a meeting**
   - Navigate to Meetings
   - Create a new meeting
   - Add title, start time, platform

2. **Generate summary**
   - Add transcript text
   - Generate AI summary
   - Verify summary and action items are created

3. **Search meetings**
   - Go to Knowledge Vault
   - Search for meeting content
   - Verify meeting appears in results

### Scenario 3: Test Case Generation
1. **Configure Jira** (if testing Jira integration)
   - Go to Test Gen settings
   - Add Jira credentials
   - Validate connection

2. **Generate test cases**
   - Enter a Jira ticket or description
   - Generate test cases
   - Verify positive, negative, edge cases

3. **Test recommendations**
   - Generate test cases for similar ticket
   - Check if recommendations appear
   - Verify similarity scores

### Scenario 4: Cross-Artifact Search
1. **Upload multiple content types**
   - Upload 2-3 documents
   - Create 2-3 meetings with summaries
   - Generate 1-2 test suites

2. **Test unified search**
   - Go to Knowledge Vault
   - Search for a common term
   - Verify results from all types (docs, meetings, tests)
   - Check entity type icons and labels

3. **Test AI Q&A**
   - Ask: "What documents mention authentication?"
   - Ask: "What was discussed in meetings about API?"
   - Verify AI cites sources from multiple types

### Scenario 5: RAG Features
1. **Test Knowledge Stats**
   - Check stats badge in Knowledge Vault
   - Verify count matches uploaded content

2. **Test relevance scoring**
   - Search for specific terms
   - Verify high-relevance items appear first
   - Check percentage scores make sense

3. **Test user isolation**
   - Create second user account (different browser/incognito)
   - Upload content as user 2
   - Verify user 1 cannot see user 2's content

---

## 🐛 What to Test For

### Functionality
- [ ] Documents upload successfully
- [ ] Meetings create and save
- [ ] Summaries generate correctly
- [ ] Test cases generate with variety
- [ ] Search returns relevant results
- [ ] AI chat provides accurate answers
- [ ] Delete removes from both databases

### Performance
- [ ] Search responds quickly (< 1 second)
- [ ] AI answers generate in reasonable time (< 5 seconds)
- [ ] Upload processes without timeout
- [ ] UI remains responsive

### User Experience
- [ ] Error messages are clear
- [ ] Loading states show appropriately
- [ ] Results are easy to understand
- [ ] Navigation is intuitive
- [ ] AI Chat interface is user-friendly

### Data Integrity
- [ ] Deleted items don't appear in search
- [ ] User data is isolated (no cross-user leaks)
- [ ] Relevance scores are accurate
- [ ] Sources link to correct content

---

## 📊 Expected Results

After UAT, you should have:

**In PostgreSQL:**
- User accounts
- Meetings with summaries and actions
- Documents with metadata
- Test case generations

**In ChromaDB:**
- Indexed chunks for all content
- Embeddings for semantic search
- Metadata for filtering

**In Knowledge Vault:**
- All content searchable
- AI chat functional
- Stats showing correct counts
- Relevance scores displayed

---

## 🔄 Reset Again (If Needed)

If you need to reset and start over during UAT:

```bash
cd backend
python reset_databases.py
```

Type `DELETE ALL DATA` to confirm.

---

## 📝 UAT Checklist

### Before Starting
- [ ] Backend running
- [ ] Frontend running
- [ ] Databases reset (clean slate)

### During Testing
- [ ] Document all bugs/issues
- [ ] Note performance problems
- [ ] Screenshot any UI issues
- [ ] Test all major features

### After Testing
- [ ] Review findings
- [ ] Prioritize fixes
- [ ] Plan next iteration

---

## 🎯 Success Criteria

UAT is successful if:
- ✅ All 5 scenarios complete without errors
- ✅ AI provides relevant, accurate answers
- ✅ Search returns expected results
- ✅ No data leaks between users
- ✅ Performance is acceptable
- ✅ UI is intuitive and responsive

---

## 💡 Tips

1. **Test with realistic data** - Use actual documents, meeting notes, tickets
2. **Try edge cases** - Empty searches, very long documents, special characters
3. **Test error handling** - Invalid uploads, network issues, bad queries
4. **Check mobile** - If applicable, test on mobile devices
5. **Document everything** - Take notes on what works and what doesn't

Good luck with UAT testing! 🚀
