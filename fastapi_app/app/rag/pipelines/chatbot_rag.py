"""RAG pipeline for the lab chatbot.

Orchestrates: embed query → pgvector search → build prompt → Groq LLM.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.groq import generate_chat_completion
from app.rag.retrieval.vector_store import query_similar

_SYSTEM_PROMPT_TEMPLATE = """\
Tu es l'assistant virtuel (Chatbot AI) du laboratoire d'analyses médicales "PFF", situé à Rabat, Maroc.
Tu réponds en français (souvent le cas) ou en Darija marocaine si le message de l'utilisateur l'exige. 
Tu réponds de manière professionnelle, claire, rassurante et bienveillante.

Règles impératives :
1. Réponds UNIQUEMENT à partir des informations fournies dans le contexte ci-dessous. Ne devine jamais d'informations factuelles (horaires, prix, jeûne).
2. Si la question dépasse le cadre du laboratoire ou nécessite un avis médical (diagnostic, interprétation), explique que tu n'es qu'une IA et oriente le patient vers son médecin traitant.
3. Ne donne jamais de diagnostic médical.
4. Si le patient pose une question sur les tarifs, précise toujours qu'il s'agit d'une estimation indicative selon la nomenclature.
5. Sois concis, direct et poli (utiliser des emojis occasionnellement est recommandé).
6. Si tu ne trouves pas la réponse exacte dans tes connaissances, dis-le poliment et suggère au patient de joindre le secrétariat ou ses proches.

{off_hours_context}

--- KNOWLEDGE BASE CONTEXT ---
{context}
------------------------------
"""

_OFF_HOURS_NOTICE = (
    "Le laboratoire est actuellement fermé. "
    "Tu informes le patient qu'une assistante traitera sa demande dès l'ouverture."
)


async def run_chatbot_rag(
    session: AsyncSession,
    *,
    patient_message: str,
    conversation_history: list[dict[str, str]],
    is_off_hours: bool = False,
) -> tuple[str, list[str]]:
    """Run the full RAG pipeline and return (response, sources).

    Parameters
    ----------
    session:
        Database session for pgvector retrieval.
    patient_message:
        The latest message from the patient.
    conversation_history:
        Previous messages as ``[{"role": "user"|"assistant", "content": "..."}]``.
    is_off_hours:
        Whether the lab is currently closed.

    Returns
    -------
    tuple[str, list[str]]
        The assistant response text and the list of context chunks used.
    """
    # 1. Retrieve relevant knowledge
    sources = await query_similar(session, patient_message, top_k=3)

    # 2. Build system prompt with retrieved context
    context_block = "\n\n".join(sources) if sources else "Aucune information pertinente trouvée."
    off_hours_context = _OFF_HOURS_NOTICE if is_off_hours else ""
    system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(
        context=context_block,
        off_hours_context=off_hours_context,
    )

    # 3. Build message list for Groq
    messages = [
        *conversation_history,
        {"role": "user", "content": patient_message},
    ]

    # 4. Call Groq LLM
    response = await generate_chat_completion(
        messages=messages,
        system_prompt=system_prompt,
        temperature=0.3,
    )

    return response, sources
