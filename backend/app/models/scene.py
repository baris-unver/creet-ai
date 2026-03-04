import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, Text, Float, Integer, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class StageStatus(str, PyEnum):
    PENDING = "pending"
    GENERATING = "generating"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    NEEDS_REVIEW = "needs_review"
    FAILED = "failed"


class Scene(Base):
    __tablename__ = "scenes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    scene_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    script: Mapped[str | None] = mapped_column(Text)
    image_prompt: Mapped[str | None] = mapped_column(Text)
    voiceover_text: Mapped[str | None] = mapped_column(Text)
    status: Mapped[StageStatus] = mapped_column(Enum(StageStatus, name="stage_status", create_type=False), nullable=False, default=StageStatus.PENDING)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="scenes")
    assets = relationship("GeneratedAsset", back_populates="scene", lazy="selectin")
    scene_characters = relationship("SceneCharacter", back_populates="scene", lazy="selectin")
    scene_locations = relationship("SceneLocation", back_populates="scene", lazy="selectin")


class SceneCharacter(Base):
    __tablename__ = "scene_characters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scene_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False)
    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)

    scene = relationship("Scene", back_populates="scene_characters")
    character = relationship("Character", back_populates="scene_characters")


class SceneLocation(Base):
    __tablename__ = "scene_locations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scene_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False)
    location_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)

    scene = relationship("Scene", back_populates="scene_locations")
    location = relationship("Location", back_populates="scene_locations")
