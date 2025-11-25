import httpx
import logging
from typing import Optional, Dict, Any
from sqlmodel import Session, select
from datetime import datetime
from app.database import engine
from app.models import JiraSettings
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)

class JiraService:
    def __init__(self):
        self.encryption_service = EncryptionService()

    def save_settings(self, base_url: str, email: str, api_token: str, user_id: str = "default") -> JiraSettings:
        """Save or update Jira settings for a specific user"""
        with Session(engine) as session:
            # Query for user-specific settings
            statement = select(JiraSettings).where(JiraSettings.user_id == user_id)
            settings = session.exec(statement).first()
            encrypted_token = self.encryption_service.encrypt(api_token)
            
            if settings:
                settings.base_url = base_url.rstrip("/")
                settings.email = email
                settings.api_token_encrypted = encrypted_token
            else:
                settings = JiraSettings(
                    user_id=user_id,
                    base_url=base_url.rstrip("/"),
                    email=email,
                    api_token_encrypted=encrypted_token
                )
                session.add(settings)
            
            session.commit()
            session.refresh(settings)
            return settings

    def get_settings(self, user_id: str = "default") -> Optional[JiraSettings]:
        """Get current settings for a specific user"""
        with Session(engine) as session:
            statement = select(JiraSettings).where(JiraSettings.user_id == user_id)
            return session.exec(statement).first()

    async def validate_connection(self, user_id: str = "default") -> bool:
        """Validate Jira connection"""
        settings = self.get_settings(user_id=user_id)
        if not settings:
            return False
            
        token = self.encryption_service.decrypt(settings.api_token_encrypted)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{settings.base_url}/rest/api/3/myself",
                    auth=(settings.email, token),
                    timeout=10.0
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Jira connection validation failed: {e}")
            return False

    async def fetch_ticket(self, ticket_key_or_url: str, user_id: str = "default") -> Dict[str, Any]:
        """Fetch ticket details from Jira for a specific user"""
        settings = self.get_settings(user_id=user_id)
        if not settings:
            raise ValueError("Jira settings not configured")

        # Extract ticket key from URL or use directly
        ticket_key = self._extract_ticket_key(ticket_key_or_url)
        api_url = f"{settings.base_url.rstrip('/')}/rest/api/3/issue/{ticket_key}"
        
        logger.info(f"Fetching Jira ticket: {ticket_key}")
        logger.info(f"Full API URL: {api_url}")
        logger.info(f"Settings - Base URL: {settings.base_url}, Email: {settings.email}")
        
        token = self.encryption_service.decrypt(settings.api_token_encrypted)
        logger.info(f"Token decrypted successfully (length: {len(token)})")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    api_url,
                    auth=(settings.email, token),
                    timeout=10.0
                )
                
                logger.info(f"Jira API response status: {response.status_code}")
                
                if response.status_code == 401:
                    logger.error(f"Authentication failed for {settings.email} on {settings.base_url}")
                    raise ValueError("Authentication failed. Please check your Jira email and API token.")
                
                if response.status_code == 404:
                    logger.error(f"Ticket '{ticket_key}' not found at {api_url}")
                    raise ValueError(f"Ticket '{ticket_key}' not found. Please verify the ticket exists and you have access to it.")
                
                if response.status_code != 200:
                    error_msg = f"Jira API returned {response.status_code}"
                    try:
                        error_data = response.json()
                        errors = error_data.get('errorMessages', [])
                        if errors:
                            error_msg += f": {', '.join(errors)}"
                    except:
                        error_msg += f": {response.text[:200]}"
                    raise ValueError(error_msg)
                
                # Parse response
                try:
                    data = response.json()
                except Exception as e:
                    logger.error(f"Failed to parse JSON response: {e}")
                    raise ValueError(f"Invalid JSON response from Jira API: {str(e)}")
                
                if not data:
                    raise ValueError("Jira API returned empty response")
                
                fields = data.get("fields")
                if not fields:
                    logger.error(f"No 'fields' in Jira response. Data keys: {data.keys()}")
                    raise ValueError("Invalid ticket data structure from Jira API")
                
                # Extract relevant fields with safe defaults
                status_obj = fields.get("status")
                priority_obj = fields.get("priority")
                
                return {
                    "key": data.get("key", ticket_key),
                    "summary": fields.get("summary", "No summary"),
                    "description": self._parse_adf(fields.get("description")) or "No description",
                    "status": status_obj.get("name", "Unknown") if status_obj else "Unknown",
                    "priority": priority_obj.get("name", "None") if priority_obj else "None",
                    "raw": data
                }
        except httpx.TimeoutException:
            logger.error(f"Timeout fetching ticket {ticket_key}")
            raise ValueError(f"Connection to Jira timed out. Please check your network and Jira URL.")
        except httpx.RequestError as e:
            logger.error(f"Request error fetching ticket {ticket_key}: {e}")
            raise ValueError(f"Failed to connect to Jira: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to fetch ticket {ticket_key}: {e}")
            raise e

    def _extract_ticket_key(self, ticket_input: str) -> str:
        """
        Extract ticket key from URL or verify it's a valid key.
        Handles:
        - Direct keys: "KAN-123"
        - Browse URLs: "https://domain.atlassian.net/browse/KAN-123"
        - Board URLs: Various board URL patterns
        """
        import re
        
        # Check if it's a URL
        if "http" in ticket_input:
            # Try to extract ticket key pattern (PROJECT-NUMBER)
            match = re.search(r'([A-Z][A-Z0-9]+-\d+)', ticket_input)
            if match:
                return match.group(1)
            
            # Fallback: try last segment
            segments = ticket_input.rstrip('/').split('/')
            for segment in reversed(segments):
                if re.match(r'^[A-Z][A-Z0-9]+-\d+$', segment):
                    return segment
            
            raise ValueError(f"Could not extract ticket key from URL: {ticket_input}")
        
        # It's not a URL, validate it's a proper ticket key
        if re.match(r'^[A-Z][A-Z0-9]+-\d+$', ticket_input.strip()):
            return ticket_input.strip()
        
        raise ValueError(f"Invalid ticket key format: {ticket_input}. Expected format: PROJECT-123")

    def _parse_adf(self, adf_body: Any) -> str:
        """
        Parse Atlassian Document Format to plain text.
        This is a simplified parser.
        """
        if not adf_body:
            return ""
        
        if isinstance(adf_body, str):
            return adf_body

        text_content = []
        
        def traverse(node):
            if node is None:
                return
                
            if isinstance(node, dict):
                if node.get("type") == "text":
                    text_content.append(node.get("text", ""))
                
                for key, value in node.items():
                    if key == "content" and isinstance(value, list):
                        for child in value:
                            if child is not None:
                                traverse(child)
                        # Add newline after paragraph
                        if node.get("type") == "paragraph":
                            text_content.append("\n")
        
        traverse(adf_body)
        return "".join(text_content).strip()
