from app.services.llm_service import llm_service


def suggestion_agent(query):

    prompt = f"""

Suggest 3 short follow-up questions.

Question:
{query}

"""

    return llm_service.generate_answer(prompt)