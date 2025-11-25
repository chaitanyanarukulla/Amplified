"""
Tests for Encryption Service
Validates encryption/decryption functionality for securing sensitive data like Jira API tokens
"""

import pytest
import os
from app.services.encryption_service import EncryptionService
from cryptography.fernet import Fernet


class TestEncryptionService:
    """Test suite for EncryptionService"""
    
    def test_encryption_with_valid_data(self):
        """Test encrypting a valid string returns encrypted data"""
        service = EncryptionService()
        original_data = "my_secret_api_token_12345"
        
        encrypted = service.encrypt(original_data)
        
        assert encrypted != original_data
        assert isinstance(encrypted, str)
        assert len(encrypted) > 0
    
    def test_decryption_with_valid_data(self):
        """Test decrypting a valid encrypted token returns original data"""
        service = EncryptionService()
        original_data = "my_secret_api_token_12345"
        
        encrypted = service.encrypt(original_data)
        decrypted = service.decrypt(encrypted)
        
        assert decrypted == original_data
    
    def test_encryption_decryption_round_trip(self):
        """Test encryption followed by decryption returns original data"""
        service = EncryptionService()
        test_data = [
            "simple_token",
            "token_with_special_chars!@#$%^&*()",
            "very_long_token_" * 100,
            "token with spaces",
            "token\nwith\nnewlines",
            "unicode_token_测试"
        ]
        
        for data in test_data:
            encrypted = service.encrypt(data)
            decrypted = service.decrypt(encrypted)
            assert decrypted == data, f"Round trip failed for: {data}"
    
    def test_empty_string_encryption(self):
        """Test encrypting empty string returns empty string"""
        service = EncryptionService()
        
        encrypted = service.encrypt("")
        
        assert encrypted == ""
    
    def test_empty_string_decryption(self):
        """Test decrypting empty string returns empty string"""
        service = EncryptionService()
        
        decrypted = service.decrypt("")
        
        assert decrypted == ""
    
    def test_invalid_token_decryption(self):
        """Test decrypting an invalid token returns empty string and logs error"""
        service = EncryptionService()
        invalid_tokens = [
            "not_a_valid_encrypted_token",
            "12345",
            "random_garbage_data!@#$%"
        ]
        
        for token in invalid_tokens:
            decrypted = service.decrypt(token)
            assert decrypted == "", f"Expected empty string for invalid token: {token}"
    
    def test_encryption_key_from_environment(self):
        """Test service uses ENCRYPTION_KEY from environment if provided"""
        # Generate a valid Fernet key
        test_key = Fernet.generate_key().decode()
        
        # Set environment variable
        os.environ["ENCRYPTION_KEY"] = test_key
        
        try:
            service = EncryptionService()
            
            # Verify the key was used
            assert service.key.decode() == test_key
            
            # Verify encryption/decryption works
            original_data = "test_data"
            encrypted = service.encrypt(original_data)
            decrypted = service.decrypt(encrypted)
            assert decrypted == original_data
        finally:
            # Clean up environment variable
            del os.environ["ENCRYPTION_KEY"]
    
    def test_encryption_key_generation_when_missing(self):
        """Test service generates a key when ENCRYPTION_KEY is not in environment"""
        # Ensure ENCRYPTION_KEY is not set
        if "ENCRYPTION_KEY" in os.environ:
            original_key = os.environ["ENCRYPTION_KEY"]
            del os.environ["ENCRYPTION_KEY"]
        else:
            original_key = None
        
        try:
            service = EncryptionService()
            
            # Verify a key was generated
            assert service.key is not None
            assert isinstance(service.key, bytes)
            assert len(service.key) > 0
            
            # Verify encryption/decryption works with generated key
            original_data = "test_data"
            encrypted = service.encrypt(original_data)
            decrypted = service.decrypt(encrypted)
            assert decrypted == original_data
        finally:
            # Restore original environment state
            if original_key:
                os.environ["ENCRYPTION_KEY"] = original_key
    
    def test_different_instances_with_same_key(self):
        """Test two instances with same key can decrypt each other's data"""
        # Set a specific key
        test_key = Fernet.generate_key().decode()
        os.environ["ENCRYPTION_KEY"] = test_key
        
        try:
            service1 = EncryptionService()
            service2 = EncryptionService()
            
            original_data = "shared_secret"
            encrypted = service1.encrypt(original_data)
            decrypted = service2.decrypt(encrypted)
            
            assert decrypted == original_data
        finally:
            del os.environ["ENCRYPTION_KEY"]
    
    def test_different_instances_different_keys_cannot_decrypt(self):
        """Test instances with different keys cannot decrypt each other's data"""
        # First instance with its own key
        if "ENCRYPTION_KEY" in os.environ:
            del os.environ["ENCRYPTION_KEY"]
        
        service1 = EncryptionService()
        original_data = "secret_data"
        encrypted = service1.encrypt(original_data)
        
        # Second instance with different key
        service2 = EncryptionService()
        decrypted = service2.decrypt(encrypted)
        
        # Decryption should fail and return empty string
        assert decrypted == ""


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
