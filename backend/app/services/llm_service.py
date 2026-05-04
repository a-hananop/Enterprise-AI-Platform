"""
LLM Service - Uses Groq (FREE tier) as primary LLM
Optional fallback: Google Gemini (new google-genai package)
"""
import json
from typing import List, Dict, Optional
from app.config import settings

# ── Groq ────────────────────────────────────────────────────
try:
    from groq import AsyncGroq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

# ── Google Gemini (new package: pip install google-genai) ───
# Only load if key is configured — avoids FutureWarning from old package
GEMINI_AVAILABLE = False
_google_genai = None
if settings.GEMINI_API_KEY:
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
        if GROQ_AVAILABLE and settings.GROQ_API_KEY:
            self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

        if GEMINI_AVAILABLE and _google_genai and settings.GEMINI_API_KEY:
            try:
                self.gemini_client = _google_genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception:
                self.gemini_client = None

    # ── Public API ───────────────────────────────────────────
    async def chat(
        self,
        system_prompt: str,
        messages: List[Dict],
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> Dict:
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

    # ── Groq ─────────────────────────────────────────────────
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
            print(f"[LLM] Groq error: {e}")
            if self.gemini_client:
                return await self._gemini_chat(system_prompt, messages, temperature, max_tokens)
            return self._fallback_response()

    # ── Gemini (new google-genai SDK) ─────────────────────────
    async def _gemini_chat(self, system_prompt, messages, temperature, max_tokens) -> Dict:
        try:
            full_prompt = f"{system_prompt}\n\n"
            for msg in messages:
                role = "User" if msg["role"] == "user" else "Assistant"
                full_prompt += f"{role}: {msg['content']}\n"
            full_prompt += "Assistant:"

            response = self.gemini_client.models.generate_content(
                model="gemini-1.5-flash",
                contents=full_prompt,
            )
            return {"content": response.text, "tokens": 0, "model": "gemini-1.5-flash"}
        except Exception as e:
            print(f"[LLM] Gemini error: {e}")
            return self._fallback_response()

    # ── Fallback ──────────────────────────────────────────────
    def _fallback_response(self) -> Dict:
        return {
            "content": (
                "⚠️ **AI Service Not Configured**\n\n"
                "To enable AI responses, add a free API key to `backend/.env`:\n\n"
                "**Groq (Recommended — Free):**\n"
                "1. Sign up at https://console.groq.com\n"
                "2. Create an API key\n"
                "3. Add to `.env`: `GROQ_API_KEY=gsk_...`\n"
                "4. Restart the backend\n\n"
                "_Data upload, ML training, and analytics work without any API key._"
            ),
            "tokens": 0,
            "model": "fallback",
        }

    # ── Helpers ───────────────────────────────────────────────
    async def generate_insights(self, data_summary: dict) -> str:
        prompt = f"""Analyze this business data and provide 5 key actionable insights:

{json.dumps(data_summary, indent=2, default=str)}

Format each insight as:
🔍 **Insight Title**: Clear explanation with a specific recommendation."""
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
