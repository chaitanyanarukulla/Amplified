# Jira Test Generator - Debugging "Ticket Not Found" Error

## Symptom
When entering a Jira ticket key (e.g., "KAN-1") in the Test Generator, the fetch fails with:
```
Ticket 'KAN-1' not found. Please verify the ticket exists and you have access to it.
```

## Common Causes & Solutions

### 1. **Jira Configuration Issues**
The most common cause is incorrect Jira settings.

**Check your configuration:**
1. Open the Test Generator
2. Click "Settings"
3. Verify the following:
   - **Base URL**: Must be in format `https://your-domain.atlassian.net`
     - ❌ WRONG: `https://your-domain.atlassian.net/jira/software/...`
     - ✅ CORRECT: `https://your-domain.atlassian.net`
   - **Email**: Your Atlassian account email
   - **API Token**: Valid Atlassian API token

**How to create/verify your API token:**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Create a new token or verify existing one
3. Copy it immediately (you won't be able to see it again)
4. Paste it into the Test Generator settings

### 2. **Ticket Doesn't Exist**
The ticket key might be incorrect or doesn't exist in your Jira instance.

**Verify the ticket exists:**
1. Log into your Jira instance
2. Try to access the ticket directly: `https://your-domain.atlassian.net/browse/KAN-1`
3. If you get a 404 in the browser, the ticket doesn't exist

**Common mistakes:**
- Using a different project key (e.g., "PROJ-1" instead of "KAN-1")
- Typo in the ticket number
- Ticket was deleted or archived

### 3. **Permissions Issue**
You might not have access to the ticket or project.

**Check permissions:**
1. Verify you can see the ticket in Jira's web interface
2. Check your project role (you need at least "Browse Projects" permission)
3. Ask your Jira admin if you're unsure about permissions

### 4. **API Version Compatibility**
Some older Jira instances might not support API v3.

**Check if your Jira instance supports API v3:**
- Cloud instances: Always support v3 ✅
- Server/Data Center: Depends on version

If using Server/Data Center:
1. Check your Jira version in Settings → System → System Info
2. Jira 8.0+ supports REST API v3
3. For older versions, we may need to update the code to use v2

## Debugging Steps

### Step 1: Check Backend Logs
Look at the backend console output when you try to fetch a ticket. You should see:

```
INFO: Fetching Jira ticket: KAN-1
INFO: Full API URL: https://your-domain.atlassian.net/rest/api/3/issue/KAN-1
INFO: Settings - Base URL: https://your-domain.atlassian.net, Email: your@email.com
INFO: Token decrypted successfully (length: XX)
INFO: Jira API response status: 404
ERROR: Ticket 'KAN-1' not found at https://your-domain.atlassian.net/rest/api/3/issue/KAN-1
```

### Step 2: Test with cURL
Test your Jira connection manually:

```bash
curl -u "your-email@example.com:YOUR_API_TOKEN" \
  -H "Accept: application/json" \
  "https://your-domain.atlassian.net/rest/api/3/issue/KAN-1"
```

**Expected responses:**
- **200**: Success - ticket exists and you have access
- **401**: Authentication failed - check email/token
- **404**: Ticket not found - check ticket key
- **403**: Permission denied - check project permissions

### Step 3: Test Authentication
Verify your credentials work:

```bash
curl -u "your-email@example.com:YOUR_API_TOKEN" \
  -H "Accept: application/json" \
  "https://your-domain.atlassian.net/rest/api/3/myself"
```

This should return your user information if credentials are correct.

### Step 4: List Projects
See which projects you have access to:

```bash
curl -u "your-email@example.com:YOUR_API_TOKEN" \
  -H "Accept: application/json" \
  "https://your-domain.atlassian.net/rest/api/3/project"
```

Look for the project key "KAN" in the results.

## Quick Fixes

### Fix 1: Reconfigure Jira Settings
1. Go to Test Generator → Settings
2. Delete current configuration
3. Re-enter with correct values:
   - Base URL (just the domain, no paths)
   - Your email
   - Fresh API token

### Fix 2: Try a Different Ticket
1. Find a ticket you KNOW exists in Jira
2. Copy its key (e.g., "PROJ-123")
3. Try fetching that ticket instead
4. If it works, the original "KAN-1" doesn't exist

### Fix 3: Check Browser Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try fetching the ticket
4. Look for the `/test-gen/fetch-ticket` request
5. Check the response details

## Still Not Working?

If none of the above helps, please provide:
1. **Backend logs** from when you attempt to fetch
2. **Jira instance type**: Cloud, Server, or Data Center
3. **Can you access the ticket in Jira web UI?** (Yes/No)
4. **cURL test results** from Step 2 above

## Code Changes Made

The following improvements were made to help diagnose this issue:

1. **Fixed `validate_connection` method** - Now properly accepts `user_id` parameter
2. **Enhanced error logging** - More detailed logs show:
   - Full API URL being called
   - Token length (not the actual token)
   - Specific error context for 401 and 404 responses

These logs will help identify the root cause faster.
