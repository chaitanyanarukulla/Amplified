#!/usr/bin/env python3
"""
Quick test script to verify Jira credentials
Usage: python test_jira_auth.py
"""

import httpx
import sys

# Your credentials (UPDATE THESE)
BASE_URL = "YOUR_JIRA_URL"
EMAIL = "YOUR_EMAIL"
API_TOKEN = "YOUR_API_TOKEN"

def test_auth():
    """Test authentication with Jira"""
    print("=" * 60)
    print("Testing Jira Authentication")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Email: {EMAIL}")
    print(f"API Token: {API_TOKEN[:20]}...{API_TOKEN[-10:]}")
    print()
    
    # Test 1: Check /myself endpoint
    print("Test 1: Checking authentication with /myself endpoint...")
    try:
        response = httpx.get(
            f"{BASE_URL.rstrip('/')}/rest/api/3/myself",
            auth=(EMAIL, API_TOKEN),
            timeout=10.0
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS! Authentication works!")
            print(f"   Logged in as: {data.get('displayName')} ({data.get('emailAddress')})")
            print(f"   Account ID: {data.get('accountId')}")
            return True
        elif response.status_code == 401:
            print("❌ FAILED: 401 Unauthorized")
            print("   Your API token is invalid, expired, or the email is incorrect.")
            print()
            print("   Fix:")
            print("   1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens")
            print("   2. Create a new API token")
            print("   3. Update API_TOKEN in this script or in Amplified settings")
            return False
        else:
            print(f"❌ FAILED: HTTP {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_project_access():
    """Test access to projects"""
    print("\n" + "=" * 60)
    print("Test 2: Checking project access...")
    print("=" * 60)
    
    try:
        response = httpx.get(
            f"{BASE_URL.rstrip('/')}/rest/api/3/project",
            auth=(EMAIL, API_TOKEN),
            timeout=10.0
        )
        
        if response.status_code == 200:
            projects = response.json()
            print(f"✅ SUCCESS! You have access to {len(projects)} project(s):")
            for project in projects[:5]:  # Show first 5
                print(f"   - {project['key']}: {project['name']}")
            if len(projects) > 5:
                print(f"   ... and {len(projects) - 5} more")
            return True
        else:
            print(f"❌ FAILED: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_ticket(ticket_key="KAN-1"):
    """Test fetching a specific ticket"""
    print("\n" + "=" * 60)
    print(f"Test 3: Trying to fetch ticket {ticket_key}...")
    print("=" * 60)
    
    try:
        response = httpx.get(
            f"{BASE_URL.rstrip('/')}/rest/api/3/issue/{ticket_key}",
            auth=(EMAIL, API_TOKEN),
            timeout=10.0
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS! Ticket found:")
            print(f"   Key: {data['key']}")
            print(f"   Summary: {data['fields']['summary']}")
            print(f"   Status: {data['fields']['status']['name']}")
            return True
        elif response.status_code == 404:
            print(f"❌ Ticket '{ticket_key}' not found")
            print(f"   Either the ticket doesn't exist or you don't have access to it")
            return False
        else:
            print(f"❌ FAILED: HTTP {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    print("\n🔍 Jira Connection Diagnostic Tool\n")
    
    # Run tests
    auth_ok = test_auth()
    
    if auth_ok:
        test_project_access()
        test_ticket()
        print("\n" + "=" * 60)
        print("✅ All tests passed! Your Jira configuration is correct.")
        print("=" * 60)
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ Authentication failed. Please fix your credentials.")
        print("=" * 60)
        sys.exit(1)
