from app.db.chroma_handler import db_manager
from app.services.llm_service import llm_service

class AnatyaAgent:

    # ============================================================
    # STRICT CITATION PROMPT — NotebookLM Style
    # ============================================================
    def _build_prompt(self, user_query, context_str):
       
        return f"""### ROLE: STRICT FACTUAL EXTRACTOR
        ### TASK: Extract answers from SNIPPETS with MANDATORY citations.

        ### RULES (NO EXCEPTIONS):
        1. **START DIRECTLY**: No "Here is the info" or "According to...". Start with the first point.
        2. **MANDATORY CITATIONS**: Its mandatory only  Pdf  Every single sentence or bullet point MUST end with the source number in brackets like [1] or [2]. If you don't add [number], the answer is INVALID.
        3. **NO SUMMARY**: Do not write a summary or "Overall" paragraph at the end.
        4. **FORMAT**: 
        - Use `##` for topics.
        - Use `- **Bold term**:` for bullet points.
        5. **ZERO REFUSAL**: Do not say "I don't have information". Extract whatever is relevant from the snippets.


{context_str}

### USER QUESTION: 
{user_query}

### FINAL VERIFIED ANSWER:"""

    def _get_context(self, user_query, user_id, selected_sources):
        where_filter = {"user_id": user_id}
        if selected_sources and len(selected_sources) > 0:
            where_filter = {"$and": [{"user_id": user_id}, {"source": {"$in": selected_sources}}]}

        # NotebookLM style: 3-4 high-quality chunks for better focus
        results = db_manager.collection.query(
            query_texts=[user_query],
            n_results=4, 
            where=where_filter
        )
        
        context_chunks = []
        sources = []
        
        if results and results.get("documents") and results["documents"][0]:
            for i, (doc, meta) in enumerate(zip(results["documents"][0], results["metadatas"][0]), 1):
                s_name = meta.get('source', 'Unknown')
                # ✅ Explicit index mapping for the LLM to understand [1], [2]
                context_chunks.append(f"SOURCE [{i}]: {s_name}\nCONTENT: {doc.strip()}")
                sources.append(s_name)

        context_str = "\n\n---\n\n".join(context_chunks)
        unique_sources = list(dict.fromkeys(sources))
        return context_str, unique_sources

    def handle_query(self, user_query, user_id, selected_sources=None):
        context_str, sources = self._get_context(user_query, user_id, selected_sources)
        prompt = self._build_prompt(user_query, context_str)
        final_answer = llm_service.generate_answer(prompt)

        # Smart suggestions logic
        suggestion_prompt = f"Based on: {final_answer[:300]}, write 3 short follow-up questions. No numbers, one per line."
        suggestions_raw = llm_service.generate_answer(suggestion_prompt)
        suggestions = [s.strip().lstrip("0123456789.-*• ").strip() for s in suggestions_raw.split("\n") if "?" in s][:3]

        return {
            "answer": final_answer,
            "sources": sources if sources else ["General Knowledge"],
            "suggestions": suggestions
        }

    def stream_query(self, user_query, user_id, selected_sources=None):
        context_str, sources = self._get_context(user_query, user_id, selected_sources)
        prompt = self._build_prompt(user_query, context_str)
        # Groq/LLM Streaming call
        answer_stream = llm_service.generate_streaming_answer(prompt)
        return answer_stream, sources

# Instance
anatya_agent = AnatyaAgent()