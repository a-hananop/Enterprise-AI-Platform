"""
LLM Service - Uses Groq (FREE tier) as primary LLM
Optional fallback: Google Gemini (new google-genai package)
"""
import sys
import json
from typing import List, Dict, Optional
from app.config import settings

# Force UTF-8 output so emoji in logs don't crash Windows cp1252 terminal
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# -- Groq --------------------------------------------------------------------
try:
    from groq import AsyncGroq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

# -- Google Gemini (new package: pip install google-genai) -------------------
GEMINI_AVAILABLE = False
_google_genai = None
if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
    try:
        from google import genai as _google_genai
        GEMINI_AVAILABLE = True
    except ImportError:
        pass


class LLMService:
    def __init__(self):
        self.groq_client = None
        self.gemini_client = None
        self._init_clients()

    def _init_clients(self):
        # -- Groq --
        groq_key = (settings.GROQ_API_KEY or "").strip()
        if GROQ_AVAILABLE and groq_key and groq_key not in ("your_groq_api_key_here", ""):
            try:
                self.groq_client = AsyncGroq(api_key=groq_key)
                print(f"[LLM] OK: Groq ready (model: {settings.GROQ_MODEL})", flush=True)
            except Exception as e:
                print(f"[LLM] ERROR: Groq init failed: {e}", flush=True)
                self.groq_client = None
        elif not groq_key:
            print("[LLM] WARNING: GROQ_API_KEY not set -- AI chat disabled", flush=True)
        else:
            print(f"[LLM] WARNING: groq pkg available={GROQ_AVAILABLE}, key set={bool(groq_key)}", flush=True)

        # -- Gemini --
        gemini_key = (settings.GEMINI_API_KEY or "").strip()
        if GEMINI_AVAILABLE and _google_genai and gemini_key and gemini_key != "your_gemini_api_key_here":
            try:
                self.gemini_client = _google_genai.Client(api_key=gemini_key)
                print("[LLM] OK: Gemini ready", flush=True)
            except Exception as e:
                print(f"[LLM] ERROR: Gemini init: {e}", flush=True)
                self.gemini_client = None

    @property
    def is_configured(self) -> bool:
        return self.groq_client is not None or self.gemini_client is not None

    def _ensure_clients(self):
        """Lazy re-init: if startup init failed for any reason, retry once."""
        if not self.is_configured:
            self._init_clients()

    # -- Public API -----------------------------------------------------------
    async def chat(
        self,
        system_prompt: str,
        messages: List[Dict],
        temperature: float = 0.3,
        max_tokens: int = 1000,
        stream: bool = False,
    ) -> Dict:
        self._ensure_clients()
        if self.groq_client:
            return await self._groq_chat(system_prompt, messages, temperature, max_tokens)
        if self.gemini_client:
            return await self._gemini_chat(system_prompt, messages, temperature, max_tokens)
        return self._fallback_response()

    async def complete(self, prompt: str, max_tokens: int = 1000, temperature: float = 0.5) -> Dict:
        return await self.chat(
            system_prompt="You are a helpful AI assistant.",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def stream_chat(
        self,
        system_prompt: str,
        messages: List[Dict],
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ):
        self._ensure_clients()
        if self.groq_client:
            async for chunk in self._groq_stream(system_prompt, messages, temperature, max_tokens):
                yield chunk
        elif self.gemini_client:
            async for chunk in self._gemini_stream(system_prompt, messages, temperature, max_tokens):
                yield chunk
        else:
            yield (
                "**AI Service Not Configured**\n\n"
                "The GROQ_API_KEY in `backend/.env` is missing or invalid.\n\n"
                "1. Check that `GROQ_API_KEY=gsk_...` is set in `backend/.env`\n"
                "2. Restart the backend: `python main.py`\n\n"
                "_Other features (data upload, ML training, analytics) work without an API key._"
            )

    # -- Groq -----------------------------------------------------------------
    async def _groq_chat(self, system_prompt, messages, temperature, max_tokens) -> Dict:
        try:
            groq_messages = [{"role": "system", "content": system_prompt}] + messages
            response = await self.groq_client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=groq_messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return {
                "content": response.choices[0].message.content,
                "tokens": response.usage.total_tokens if response.usage else 0,
                "model": response.model,
            }
        except Exception as e:
            err_str = str(e)
            print(f"[LLM] ERROR: Groq chat failed: {e}", flush=True)
            if "401" in err_str or "invalid_api_key" in err_str or "Invalid API Key" in err_str:
                self.groq_client = None  # mark as dead so _ensure_clients won't re-use it
                return {
                    "content": (
                        "**Groq API Key Invalid or Expired**\n\n"
                        "Your API key returned a 401 error. Please:\n"
                        "1. Go to https://console.groq.com\n"
                        "2. Generate a new API key\n"
                        "3. Update `GROQ_API_KEY` in `backend/.env`\n"
                        "4. Restart the backend\n"
                    ),
                    "tokens": 0,
                    "model": "error",
                }
            if self.gemini_client:
                return await self._gemini_chat(system_prompt, messages, temperature, max_tokens)
            return self._fallback_response()

    async def _groq_stream(self, system_prompt, messages, temperature, max_tokens):
        try:
            groq_messages = [{"role": "system", "content": system_prompt}] + messages
            response = await self.groq_client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=groq_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            err_str = str(e)
            if "401" in err_str or "invalid_api_key" in err_str or "Invalid API Key" in err_str:
                self.groq_client = None
                yield (
                    "**Groq API Key Invalid or Expired** (401)\n\n"
                    "Please generate a new key at https://console.groq.com, "
                    "update `GROQ_API_KEY` in `backend/.env`, and restart the backend."
                )
            else:
                yield f"\n[Error: {e}]"

    # -- Gemini ---------------------------------------------------------------
    async def _gemini_chat(self, system_prompt, messages, temperature, max_tokens) -> Dict:
        try:
            response = await self.gemini_client.aio.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=messages[-1]["content"],
                config={
                    "system_instruction": system_prompt,
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                },
            )
            return {"content": response.text, "tokens": 0, "model": settings.GEMINI_MODEL}
        except Exception as e:
            print(f"[LLM] ERROR: Gemini chat: {e}", flush=True)
            return self._fallback_response()

    async def _gemini_stream(self, system_prompt, messages, temperature, max_tokens):
        try:
            async for chunk in await self.gemini_client.aio.models.generate_content_stream(
                model=settings.GEMINI_MODEL,
                contents=messages[-1]["content"],
                config={
                    "system_instruction": system_prompt,
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                },
            ):
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            yield f"\n[Error: {e}]"

    # -- Fallback -------------------------------------------------------------
    def _fallback_response(self) -> Dict:
        return {
            "content": (
                "**AI Service Not Configured**\n\n"
                "Add your free Groq API key to `backend/.env`:\n\n"
                "```\nGROQ_API_KEY=gsk_...\n```\n\n"
                "Get a free key at https://console.groq.com — then restart the backend."
            ),
            "tokens": 0,
            "model": "fallback",
        }

    # -- Helpers --------------------------------------------------------------
    async def generate_insights(self, data_summary: dict) -> str:
        prompt = f"""Analyze this business data and provide 5 key actionable insights:

{json.dumps(data_summary, indent=2, default=str)}

Format each insight as:
[Insight Title]: Clear explanation with a specific recommendation."""
        result = await self.complete(prompt, max_tokens=800)
        return result["content"]

    async def generate_recommendations(self, context: str) -> list:
        prompt = f"""Based on the following business context, provide 5 strategic recommendations:

{context}

Return as a JSON array only, no extra text:
[{{"title": "...", "description": "...", "priority": "high|medium|low", "impact": "..."}}]"""
        result = await self.complete(prompt, max_tokens=800)
        try:
            text = result["content"]
            start = text.find("[")
            end = text.rfind("]") + 1
            if start != -1 and end > start:
                return json.loads(text[start:end])
        except Exception:
            pass
        return []

    async def explain_prediction(self, prediction: dict, context: str) -> str:
        prompt = f"""Explain this AI prediction in simple, non-technical language:

Prediction: {json.dumps(prediction, indent=2, default=str)}
Context: {context}

Provide:
1. What this prediction means in plain English
2. The key factors that influenced it
3. What action to take
4. How confident to be in this result"""
        result = await self.complete(prompt, max_tokens=500)
        return result["content"]
