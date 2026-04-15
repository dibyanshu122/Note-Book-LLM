import os
from groq import Groq

class LLMService:
    def __init__(self):
        # ✅ Seedha environment se key uthayega, file ki zaroorat nahi
        self.api_key = os.environ.get("GROQ_API_KEY")
        
        if not self.api_key:
            # Agar terminal mein set nahi kiya, toh yahan temporary dalo backup ke liye
            self.api_key = "YOUR_GROQ_API_KEY_HERE" 
            
        self.client = Groq(api_key=self.api_key)
        
        # 🚀 Model Selection: 
        # "llama-3.3-70b-versatile" (NotebookLM quality) 
        # "llama-3.1-8b-instant" (Lightning speed)
        self.model = "llama-3.3-70b-versatile"

    def generate_streaming_answer(self, prompt):
        """Groq LPU speed - Real-time streaming"""
        try:
            stream = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model,
                temperature=0.0, # Strictly 0 for factual accuracy
                max_tokens=1024,
                top_p=1,
                stream=True,
            )

            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    yield token
        except Exception as e:
            yield f"Groq Connection Error: {str(e)}"

    def generate_answer(self, prompt):
        """Internal processing & Suggestions (Fastest path)"""
        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model,
                temperature=0.0,
                max_tokens=512,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Groq Error: {str(e)}"

# ✅ Agent ready for action
llm_service = LLMService()



# import requests
# import json

# class LLMService:
#     def __init__(self):
#         self.url = "http://localhost:11434/api/generate"
#         self.model = "llama3.2:1b"

#     def generate_streaming_answer(self, prompt):
#         """ChatGPT style word-by-word streaming ke liye"""
#         payload = {
#             "model": self.model,
#             "prompt": prompt,
#             "stream": True, # ✅ Streaming ON
#             "options": {"num_predict": 1000, "temperature": 0.2, "top_p": 0.9}
#         }
        
#         # Requests ke saath stream karna
#         response = requests.post(self.url, json=payload, stream=True)
#         for line in response.iter_lines():
#             if line:
#                 try:
#                     chunk = json.loads(line)
#                     yield chunk.get("response", "") # Ek-ek word generator se bahar bhejo
#                 except json.JSONDecodeError:
#                     continue

#     def generate_answer(self, prompt):
#         """Normal answer ke liye (Used by Verifier and Formatter agents)"""
#         payload = {
#             "model": self.model,
#             "prompt": prompt,
#             "stream": False, # ✅ Streaming OFF for internal agent processing
#             "options": {"num_predict": 500, "temperature": 0.2, "top_p": 0.9}
#         }
        
#         try:
#             response = requests.post(self.url, json=payload)
#             response.raise_for_status()
#             return response.json().get("response", "")
#         except Exception as e:
#             return f"LLM Error: {str(e)}"

# # ✅ IMPORTANT: Is instance ko export karna zaroori hai taaki agents.py ise use kar sake
# llm_service = LLMService()