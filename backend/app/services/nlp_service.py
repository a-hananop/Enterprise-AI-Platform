"""
NLP Service - Uses HuggingFace free models (run locally)
Models: sentiment, NER, summarization, zero-shot classification, keywords
"""
from typing import List, Dict, Optional
import re


class NLPService:
    def __init__(self):
        self._sentiment_pipeline = None
        self._ner_pipeline = None
        self._summarizer = None
        self._classifier = None
        self._keyword_model = None
        self._sentence_model = None

    def _get_sentiment_pipeline(self):
        if not self._sentiment_pipeline:
            try:
                from transformers import pipeline
                self._sentiment_pipeline = pipeline(
                    "sentiment-analysis",
                    model="distilbert-base-uncased-finetuned-sst-2-english",
                    truncation=True, max_length=512
                )
            except Exception as e:
                print(f"Sentiment pipeline error: {e}")
        return self._sentiment_pipeline

    def _get_ner_pipeline(self):
        if not self._ner_pipeline:
            try:
                from transformers import pipeline
                self._ner_pipeline = pipeline(
                    "ner",
                    model="dslim/bert-base-NER",
                    aggregation_strategy="simple",
                    truncation=True
                )
            except Exception as e:
                print(f"NER pipeline error: {e}")
        return self._ner_pipeline

    def _get_summarizer(self):
        if not self._summarizer:
            try:
                from transformers import pipeline
                self._summarizer = pipeline(
                    "summarization",
                    model="sshleifer/distilbart-cnn-12-6",
                    truncation=True
                )
            except Exception as e:
                print(f"Summarizer error: {e}")
        return self._summarizer

    def _get_classifier(self):
        if not self._classifier:
            try:
                from transformers import pipeline
                self._classifier = pipeline(
                    "zero-shot-classification",
                    model="facebook/bart-large-mnli",
                    truncation=True
                )
            except Exception as e:
                print(f"Classifier error: {e}")
        return self._classifier

    def _get_sentence_model(self):
        if not self._sentence_model:
            try:
                from sentence_transformers import SentenceTransformer
                self._sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception as e:
                print(f"Sentence model error: {e}")
        return self._sentence_model

    async def sentiment(self, text: str) -> Dict:
        """Analyze sentiment of text"""
        pipe = self._get_sentiment_pipeline()
        if not pipe:
            return self._rule_based_sentiment(text)
        try:
            text_trunc = text[:512]
            result = pipe(text_trunc)[0]
            label = result["label"].lower()
            score = round(result["score"], 4)

            # Map to positive/negative/neutral
            sentiment_map = {
                "positive": "positive", "pos": "positive",
                "negative": "negative", "neg": "negative",
                "neutral": "neutral", "neu": "neutral",
            }
            normalized = sentiment_map.get(label, label)

            return {
                "label": normalized,
                "score": score,
                "confidence": score,
                "raw_label": label,
            }
        except Exception as e:
            return self._rule_based_sentiment(text)

    async def ner(self, text: str) -> Dict:
        """Extract named entities"""
        pipe = self._get_ner_pipeline()
        if not pipe:
            return self._rule_based_ner(text)
        try:
            results = pipe(text[:512])
            entities = []
            for r in results:
                entities.append({
                    "text": r.get("word", ""),
                    "label": r.get("entity_group", ""),
                    "score": round(r.get("score", 0), 4),
                    "start": r.get("start", 0),
                    "end": r.get("end", 0),
                })
            # Group by type
            grouped = {}
            for e in entities:
                t = e["label"]
                if t not in grouped:
                    grouped[t] = []
                if e["text"] not in [x["text"] for x in grouped[t]]:
                    grouped[t].append(e)
            return {"entities": entities, "grouped": grouped}
        except Exception:
            return self._rule_based_ner(text)

    async def summarize(self, text: str, max_length: int = 150, min_length: int = 50) -> Dict:
        """Summarize long text"""
        if len(text.split()) < 50:
            return {"summary": text, "method": "original_short"}

        pipe = self._get_summarizer()
        if not pipe:
            return self._extractive_summary(text, max_sentences=3)

        try:
            text_trunc = text[:1024]
            result = pipe(text_trunc, max_length=max_length, min_length=min(min_length, len(text.split())), do_sample=False)[0]
            return {"summary": result["summary_text"], "method": "abstractive"}
        except Exception:
            return self._extractive_summary(text, max_sentences=3)

    async def zero_shot_classify(self, text: str, labels: List[str], multi_label: bool = False) -> Dict:
        """Zero-shot text classification"""
        pipe = self._get_classifier()
        if not pipe:
            return {"labels": labels, "scores": {l: 1.0/len(labels) for l in labels}}
        try:
            result = pipe(text[:512], labels, multi_label=multi_label)
            scores = dict(zip(result["labels"], result["scores"]))
            top_label = result["labels"][0]
            return {
                "top_label": top_label,
                "top_score": round(result["scores"][0], 4),
                "scores": {k: round(v, 4) for k, v in scores.items()},
                "labels": result["labels"],
            }
        except Exception as e:
            return {"labels": labels, "scores": {l: 0.0 for l in labels}, "error": str(e)}

    async def extract_keywords(self, text: str, top_k: int = 10) -> Dict:
        """Extract keywords using TF-IDF-like scoring"""
        import math
        from collections import Counter

        # Simple but effective keyword extraction
        stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
                      "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
                      "have", "has", "had", "do", "does", "did", "will", "would", "could",
                      "should", "may", "might", "can", "this", "that", "these", "those",
                      "it", "its", "as", "if", "so", "not", "no", "nor"}

        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        filtered = [w for w in words if w not in stop_words]
        freq = Counter(filtered)

        # Score by frequency with length bonus
        scores = {w: count * (1 + 0.1 * len(w)) for w, count in freq.most_common(50)}
        top = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]

        return {
            "keywords": [{"word": w, "score": round(s, 2)} for w, s in top],
            "word_count": len(words),
        }

    async def semantic_similarity(self, text1: str, text2: str) -> float:
        """Compute cosine similarity between two texts"""
        model = self._get_sentence_model()
        if not model:
            # Fallback: Jaccard similarity
            s1 = set(text1.lower().split())
            s2 = set(text2.lower().split())
            if not s1 or not s2:
                return 0.0
            return len(s1 & s2) / len(s1 | s2)
        try:
            import numpy as np
            emb = model.encode([text1, text2])
            cos_sim = np.dot(emb[0], emb[1]) / (np.linalg.norm(emb[0]) * np.linalg.norm(emb[1]))
            return round(float(cos_sim), 4)
        except Exception:
            return 0.0

    async def classify_topic(self, text: str) -> Dict:
        """Classify text into business topics"""
        labels = ["sales", "finance", "marketing", "operations", "customer service",
                  "legal", "HR", "technology", "strategy", "other"]
        return await self.zero_shot_classify(text, labels)

    async def analyze_dataset_column(self, file_path: str, source_type: str, text_col: str, tasks: List[str]) -> Dict:
        """Run NLP on a dataset text column"""
        import pandas as pd
        try:
            if source_type == "csv":
                df = pd.read_csv(file_path)
            elif source_type == "excel":
                df = pd.read_excel(file_path)
            else:
                df = pd.read_json(file_path)
        except Exception as e:
            return {"error": str(e)}

        if text_col not in df.columns:
            return {"error": f"Column '{text_col}' not found"}

        results = {"total": len(df), "column": text_col, "tasks": {}}
        texts = df[text_col].dropna().astype(str).tolist()[:500]  # Limit

        if "sentiment" in tasks:
            sentiments = []
            for t in texts[:200]:
                s = await self.sentiment(t)
                sentiments.append(s["label"])
            from collections import Counter
            dist = Counter(sentiments)
            results["tasks"]["sentiment"] = {
                "distribution": dict(dist),
                "positive_rate": round(dist.get("positive", 0) / len(sentiments) * 100, 1) if sentiments else 0,
            }

        if "keywords" in tasks:
            all_text = " ".join(texts[:100])
            kw = await self.extract_keywords(all_text, top_k=15)
            results["tasks"]["keywords"] = kw

        return results

    # ── Fallback methods (no model needed) ────────────────────
    def _rule_based_sentiment(self, text: str) -> Dict:
        positive_words = {"good", "great", "excellent", "amazing", "fantastic", "love", "happy", "wonderful", "best", "perfect"}
        negative_words = {"bad", "terrible", "awful", "horrible", "hate", "worst", "poor", "disappointing", "fail", "wrong"}
        words = set(text.lower().split())
        pos = len(words & positive_words)
        neg = len(words & negative_words)
        if pos > neg:
            return {"label": "positive", "score": 0.7, "confidence": 0.7}
        elif neg > pos:
            return {"label": "negative", "score": 0.7, "confidence": 0.7}
        return {"label": "neutral", "score": 0.5, "confidence": 0.5}

    def _rule_based_ner(self, text: str) -> Dict:
        import re
        entities = []
        # Simple regex-based NER
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b', text)
        for e in emails:
            entities.append({"text": e, "label": "EMAIL", "score": 1.0})
        for d in dates:
            entities.append({"text": d, "label": "DATE", "score": 1.0})
        return {"entities": entities, "grouped": {"EMAIL": [{"text": e} for e in emails], "DATE": [{"text": d} for d in dates]}}

    def _extractive_summary(self, text: str, max_sentences: int = 3) -> Dict:
        sentences = re.split(r'(?<=[.!?])\s+', text)
        if len(sentences) <= max_sentences:
            return {"summary": text, "method": "original"}
        # Pick first + most "informative" sentences (heuristic)
        summary = " ".join(sentences[:max_sentences])
        return {"summary": summary, "method": "extractive"}
