import structlog
from typing import Optional, Dict, Any
from sqlmodel import Session, select
from atlassian import Confluence
from app.database import engine
from app.models import ConfluenceSettings
from app.services.encryption_service import EncryptionService

logger = structlog.get_logger(__name__)

class ConfluenceService:
    def __init__(self):
        self.encryption_service = EncryptionService()

    def get_settings(self, user_id: str) -> Optional[ConfluenceSettings]:
        """Get Confluence settings for a user"""
        with Session(engine) as session:
            statement = select(ConfluenceSettings).where(ConfluenceSettings.user_id == user_id)
            return session.exec(statement).first()

    def save_settings(self, base_url: str, username: str, api_token: str, user_id: str) -> ConfluenceSettings:
        """Save or update Confluence settings"""
        with Session(engine) as session:
            # Check for existing settings
            statement = select(ConfluenceSettings).where(ConfluenceSettings.user_id == user_id)
            settings = session.exec(statement).first()
            
            encrypted_token = self.encryption_service.encrypt(api_token)
            
            if settings:
                settings.base_url = base_url
                settings.username = username
                settings.api_token_encrypted = encrypted_token
                settings.updated_at = settings.updated_at  # Should update timestamp
            else:
                settings = ConfluenceSettings(
                    user_id=user_id,
                    base_url=base_url,
                    username=username,
                    api_token_encrypted=encrypted_token
                )
                session.add(settings)
            
            session.commit()
            session.refresh(settings)
            return settings

    def _get_client(self, user_id: str) -> Confluence:
        """Get authenticated Confluence client"""
        settings = self.get_settings(user_id)
        if not settings:
            raise ValueError("Confluence not configured for this user")
            
        api_token = self.encryption_service.decrypt(settings.api_token_encrypted)
        
        return Confluence(
            url=settings.base_url,
            username=settings.username,
            password=api_token,
            cloud=True 
        )

    def validate_connection(self, user_id: str) -> bool:
        """Validate connection to Confluence"""
        try:
            client = self._get_client(user_id)
            # Try to get current user or space to validate auth
            # get_space is a lightweight call usually
            client.get_all_spaces(start=0, limit=1)
            return True
        except Exception as e:
            logger.error(f"Confluence validation failed: {e}")
            return False

    def get_page_content(self, page_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch page content by ID"""
        client = self._get_client(user_id)
        try:
            page = client.get_page_by_id(page_id, expand='body.storage,version')
            return {
                "id": page.get("id"),
                "title": page.get("title"),
                "body": page.get("body", {}).get("storage", {}).get("value", ""),
                "version": page.get("version", {}).get("number"),
                "url": page.get("_links", {}).get("base") + page.get("_links", {}).get("webui")
            }
        except Exception as e:
            logger.error(f"Failed to fetch page {page_id}: {e}")
            raise ValueError(f"Failed to fetch page: {str(e)}")

    def resolve_page_id_from_url(self, url: str, user_id: str) -> str:
        """
        Attempt to extract page ID from URL or resolve it via API.
        Confluence URLs can be:
        - /pages/viewpage.action?pageId=12345
        - /display/SPACE/Page+Title
        - /spaces/SPACE/pages/12345/Page+Title
        """
        import re
        from urllib.parse import urlparse, parse_qs

        # 1. Try to find pageId query param
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        if 'pageId' in qs:
            return qs['pageId'][0]

        # 2. Try to find /pages/(\d+) pattern
        match = re.search(r'/pages/(\d+)', url)
        if match:
            return match.group(1)

        # 3. If we have space key and title, we might need to search (complex)
        # For now, let's assume the user provides a URL with an ID or we can extract it.
        # If it's a share link or pretty URL without ID, we might need the API to resolve it.
        
        # Fallback: Try to fetch by title if space is known? 
        # For MVP, let's rely on ID presence or simple extraction.
        # If we can't find an ID, we might need to ask the user for the ID or try to fetch by title if possible.
        
        # Let's try to use the client to resolve if we can parse space and title
        # /display/SPACE/Title
        match_display = re.search(r'/display/([^/]+)/([^/]+)', url)
        if match_display:
            space_key = match_display.group(1)
            title = match_display.group(2).replace('+', ' ')
            client = self._get_client(user_id)
            try:
                page = client.get_page_by_title(space_key, title)
                if page:
                    return page['id']
            except Exception:
                pass

        raise ValueError("Could not resolve Confluence Page ID from URL. Please ensure the URL contains the page ID.")
