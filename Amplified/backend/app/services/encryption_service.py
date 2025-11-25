import os
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

class EncryptionService:
    def __init__(self):
        self.key = os.getenv("ENCRYPTION_KEY")
        if not self.key:
            # Generate a key if not provided (for dev/demo purposes, ideally should be persistent)
            logger.warning("ENCRYPTION_KEY not found in env. Generating a temporary one.")
            generated_key = Fernet.generate_key()  # This returns bytes
            self.key = generated_key
        else:
            # If key is provided as string, encode it
            self.key = self.key.encode() if isinstance(self.key, str) else self.key
        
        self.fernet = Fernet(self.key)

    def encrypt(self, data: str) -> str:
        """Encrypt a string"""
        if not data:
            return ""
        return self.fernet.encrypt(data.encode()).decode()

    def decrypt(self, token: str) -> str:
        """Decrypt a token"""
        if not token:
            return ""
        try:
            return self.fernet.decrypt(token.encode()).decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return ""
