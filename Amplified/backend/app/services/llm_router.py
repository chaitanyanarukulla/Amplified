"""
LLM Router Service - Central routing for all LLM operations
Routes requests to OpenAI, Claude, or Local LLM based on user preference
"""

import os
import structlog
import asyncio
from typing import Dict, Optional, Any
from openai import AsyncOpenAI
from sqlmodel import Session, select
from datetime import datetime

from app.database import engine
from app.models import UserLLMPreference

logger = structlog.get_logger(__name__)

class LLMRouter:
    """Central router for all LLM operations across the application"""
    
    DEFAULT_ENGINE = "openai_gpt4o"
    VALID_ENGINES = ["openai_gpt4o", "local_llm", "claude_3_5_sonnet"]
    
    
    def __init__(self):
        # Load environment variables explicitly
        from dotenv import load_dotenv
        load_dotenv()
        
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.claude_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.local_llm_url = os.getenv("LOCAL_LLM_URL", "http://localhost:11434")  # Ollama default
        
        # Initialize OpenAI client if configured
        if self.openai_api_key:
            self.openai_client = AsyncOpenAI(api_key=self.openai_api_key)
            logger.info("OpenAI client initialized")
        else:
            self.openai_client = None
            logger.warning("OpenAI API key not found")
        
        # Initialize Claude client if configured
        if self.claude_api_key:
            try:
                from anthropic import AsyncAnthropic
                self.claude_client = AsyncAnthropic(api_key=self.claude_api_key)
                logger.info("Claude client initialized")
            except ImportError:
                self.claude_client = None
                logger.warning("Anthropic SDK not installed. Install with: pip install anthropic")
        else:
            self.claude_client = None
            logger.debug("Claude API key not configured")
    
    def get_user_engine(self, user_id: str = "default") -> str:
        """
        Get the user's selected LLM engine from the database
        
        Args:
            user_id: User identifier (defaults to "default" for single-user app)
            
        Returns:
            Engine name (openai_gpt4o, local_llm, or claude_3_5_sonnet)
        """
        try:
            with Session(engine) as session:
                statement = select(UserLLMPreference).where(UserLLMPreference.user_id == user_id)
                preference = session.exec(statement).first()
                
                if preference:
                    return preference.selected_engine
                else:
                    # No preference set, create default
                    new_pref = UserLLMPreference(
                        user_id=user_id,
                        selected_engine=self.DEFAULT_ENGINE
                    )
                    session.add(new_pref)
                    session.commit()
                    return self.DEFAULT_ENGINE
        except Exception as e:
            logger.error(f"Error fetching user engine preference: {e}")
            return self.DEFAULT_ENGINE
    
    def set_user_engine(self, engine_name: str, user_id: str = "default") -> bool:
        """
        Set the user's LLM engine preference
        
        Args:
            engine_name: Engine name to set
            user_id: User identifier
            
        Returns:
            True if successful, False otherwise
        """
        if engine_name not in self.VALID_ENGINES:
            logger.error(f"Invalid engine: {engine_name}")
            return False
        
        try:
            with Session(engine) as session:
                statement = select(UserLLMPreference).where(UserLLMPreference.user_id == user_id)
                preference = session.exec(statement).first()
                
                if preference:
                    preference.selected_engine = engine_name
                    # Note: updated_at field was removed from UserLLMPreference model
                else:
                    preference = UserLLMPreference(
                        user_id=user_id,
                        selected_engine=engine_name
                    )
                    session.add(preference)
                
                session.commit()
                logger.info(f"Updated engine preference for user {user_id} to {engine_name}")
                return True
        except Exception as e:
            logger.error(f"Error setting user engine preference: {e}")
            return False
    
    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        user_id: str = "default",
        max_tokens: int = 1000,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """
        Generate a completion using the user's selected LLM engine
        
        Args:
            prompt: The user/main prompt
            system_prompt: Optional system prompt
            user_id: User identifier
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            **kwargs: Additional provider-specific arguments
            
        Returns:
            Generated text
        """
        selected_engine = self.get_user_engine(user_id)
        
        try:
            if selected_engine == "openai_gpt4o":
                return await self._call_openai(prompt, system_prompt, max_tokens, temperature, **kwargs)
            elif selected_engine == "claude_3_5_sonnet":
                return await self._call_claude(prompt, system_prompt, max_tokens, temperature, **kwargs)
            elif selected_engine == "local_llm":
                return await self._call_local_llm(prompt, system_prompt, max_tokens, temperature, **kwargs)
            else:
                raise ValueError(f"Unknown engine: {selected_engine}")
        except Exception as e:
            logger.error(f"LLM generation failed with {selected_engine}: {e}")
            raise
    
    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        user_id: str = "default",
        max_tokens: int = 2000,
        temperature: float = 0.7,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate JSON output using the user's selected LLM engine
        
        Args:
            prompt: The user/main prompt
            system_prompt: Optional system prompt
            user_id: User identifier
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            **kwargs: Additional provider-specific arguments
            
        Returns:
            Parsed JSON dictionary
        """
        selected_engine = self.get_user_engine(user_id)
        
        try:
            if selected_engine == "openai_gpt4o":
                return await self._call_openai_json(prompt, system_prompt, max_tokens, temperature, **kwargs)
            elif selected_engine == "claude_3_5_sonnet":
                return await self._call_claude_json(prompt, system_prompt, max_tokens, temperature, **kwargs)
            elif selected_engine == "local_llm":
                return await self._call_local_llm_json(prompt, system_prompt, max_tokens, temperature, **kwargs)
            else:
                raise ValueError(f"Unknown engine: {selected_engine}")
        except Exception as e:
            logger.error(f"JSON generation failed with {selected_engine}: {e}")
            raise
    
    def _extract_json_from_text(self, text: str) -> Dict[str, Any]:
        """
        Extract and parse JSON from text, handling markdown code blocks and extra text.
        """
        import json
        import re
        
        import json
        import re
        
        # 1. Try direct parsing first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
            
        # 2. Try extracting from markdown code blocks
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
                
        # 3. Try finding the first '{' and last '}'
        # This is a simple heuristic; for nested braces it might fail if not careful,
        # but usually sufficient for LLM outputs which are just one JSON object.
        try:
            start = text.find('{')
            end = text.rfind('}')
            
            if start != -1 and end != -1 and end > start:
                json_str = text[start:end+1]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass
            
        raise ValueError(f"Could not extract valid JSON from response: {text[:100]}...")

    # --- OpenAI Implementation ---
    
    async def _call_openai(
        self,
        prompt: str,
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        **kwargs
    ) -> str:
        """Call OpenAI API for text completion"""
        if not self.openai_client:
            raise RuntimeError("OpenAI client not initialized. Please set OPENAI_API_KEY environment variable.")
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        model = kwargs.get("model", "gpt-4o-mini")
        
        response = await self.openai_client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        return response.choices[0].message.content
    
    async def _call_openai_json(
        self,
        prompt: str,
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        **kwargs
    ) -> Dict[str, Any]:
        """Call OpenAI API for JSON completion"""
        if not self.openai_client:
            raise RuntimeError("OpenAI client not initialized. Please set OPENAI_API_KEY environment variable.")
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        model = kwargs.get("model", "gpt-4o-mini")
        
        response = await self.openai_client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            response_format={"type": "json_object"}
        )
        
        import json
        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.error(f"Raw content: {response.choices[0].message.content}")
            raise
    
    # --- Claude Implementation ---
    
    async def _call_claude(
        self,
        prompt: str,
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        prefill: Optional[str] = None,
        **kwargs
    ) -> str:
        """Call Claude API for text completion"""
        if not self.claude_client:
            raise RuntimeError(
                "Claude client not initialized. Please:\n"
                "1. Install anthropic SDK: pip install anthropic\n"
                "2. Set ANTHROPIC_API_KEY environment variable"
            )
        
        model = kwargs.get("model", "claude-3-opus-20240229")
        
        messages = [{"role": "user", "content": prompt}]
        if prefill:
            messages.append({"role": "assistant", "content": prefill})
        
        response = await self.claude_client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt if system_prompt else "You are a helpful assistant.",
            messages=messages
        )
        
        content = response.content[0].text
        if prefill:
            return prefill + content
            
        return content
    
    async def _call_claude_json(
        self,
        prompt: str,
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        **kwargs
    ) -> Dict[str, Any]:
        """Call Claude API for JSON completion"""
        # Claude doesn't have native JSON mode, so we add instructions to the prompt
        # and prefill the response with '{' to force JSON output
        json_prompt = f"{prompt}\n\nPlease respond with valid JSON only, no other text."
        
        response_text = await self._call_claude(
            json_prompt, 
            system_prompt, 
            max_tokens, 
            temperature, 
            prefill="{",
            **kwargs
        )
        
        return self._extract_json_from_text(response_text)
    
    # --- Local LLM Implementation ---
    
    async def _call_local_llm(
        self,
        prompt: str,
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        **kwargs
    ) -> str:
        """Call local LLM (Ollama) for text completion"""
        import aiohttp
        
        model = kwargs.get("model", "llama3.2:3b")
        
        # Build the prompt with system message if provided
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.local_llm_url}/api/generate",
                    json={
                        "model": model,
                        "prompt": full_prompt,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens
                        }
                    },
                    timeout=aiohttp.ClientTimeout(total=300)  # Increased to 5 minutes
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("response", "")
                    else:
                        error_text = await response.text()
                        raise RuntimeError(f"Ollama API error: {error_text}")
        except aiohttp.ClientConnectorError:
            raise RuntimeError(
                "Cannot connect to Ollama. Please ensure:\n"
                "1. Ollama is running (run 'ollama serve' if needed)\n"
                "2. The model is available (run 'ollama list' to check)\n"
                f"3. Ollama is accessible at {self.local_llm_url}"
            )
        except asyncio.TimeoutError:
            raise RuntimeError(
                "Local LLM timed out. The model took too long to respond.\n"
                "Try reducing the complexity of the request or using a faster model."
            )
        except Exception as e:
            raise RuntimeError(f"Local LLM error: {str(e)}")
    
    async def _call_local_llm_json(
        self,
        prompt: str,
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        **kwargs
    ) -> Dict[str, Any]:
        """Call local LLM for JSON completion"""
        # Add JSON formatting instruction to the prompt
        json_system = "You are a helpful assistant that responds only with valid JSON."
        if system_prompt:
            json_system = f"{system_prompt}\n\nIMPORTANT: Respond with valid JSON only, no other text."
        
        json_prompt = f"{prompt}\n\nRespond with valid JSON only."
        
        response_text = await self._call_local_llm(
            json_prompt, 
            json_system, 
            max_tokens, 
            temperature, 
            **kwargs
        )
        
        return self._extract_json_from_text(response_text)


# Global singleton instance
llm_router = LLMRouter()
