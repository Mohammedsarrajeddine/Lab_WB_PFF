"""Pydantic schemas for the chatbot API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ConversationHistoryItem(BaseModel):
    role: str = Field(
        ..., pattern="^(user|assistant)$", description="Either 'user' or 'assistant'"
    )
    content: str = Field(min_length=1, max_length=4000)


class ChatMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_history: list[ConversationHistoryItem] = Field(default_factory=list)


class ChatMessageOut(BaseModel):
    response: str
    is_off_hours: bool
    sources: list[str] = Field(default_factory=list)
