import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, Text, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VideoFormat(str, PyEnum):
    YOUTUBE = "youtube"
    YOUTUBE_SHORTS = "youtube_shorts"
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    INSTAGRAM_REELS = "instagram_reels"


class DurationTier(str, PyEnum):
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"


class PipelineStage(str, PyEnum):
    BRIEF = "brief"
    OUTLINE = "outline"
    SCENARIO = "scenario"
    SCENES = "scenes"
    CHARACTERS = "characters"
    MEDIA_GENERATION = "media_generation"
    REVIEW = "review"
    ASSEMBLY = "assembly"
    COMPLETE = "complete"


STAGE_ORDER = list(PipelineStage)

VIDEO_FORMAT_SPECS = {
    VideoFormat.YOUTUBE: {"width": 1920, "height": 1080, "aspect": "16:9", "max_seconds": None},
    VideoFormat.YOUTUBE_SHORTS: {"width": 1080, "height": 1920, "aspect": "9:16", "max_seconds": 60},
    VideoFormat.TIKTOK: {"width": 1080, "height": 1920, "aspect": "9:16", "max_seconds": 180},
    VideoFormat.INSTAGRAM: {"width": 1080, "height": 1080, "aspect": "1:1", "max_seconds": 60},
    VideoFormat.INSTAGRAM_REELS: {"width": 1080, "height": 1920, "aspect": "9:16", "max_seconds": 90},
}

DURATION_TIER_SPECS = {
    DurationTier.SHORT: {"min_seconds": 15, "max_seconds": 60, "min_scenes": 3, "max_scenes": 12},
    DurationTier.MEDIUM: {"min_seconds": 60, "max_seconds": 180, "min_scenes": 12, "max_scenes": 36},
    DurationTier.LONG: {"min_seconds": 180, "max_seconds": 360, "min_scenes": 36, "max_scenes": 72},
}


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    brief: Mapped[str | None] = mapped_column(Text)
    format: Mapped[VideoFormat] = mapped_column(Enum(VideoFormat, name="video_format"), nullable=False)
    duration_tier: Mapped[DurationTier] = mapped_column(Enum(DurationTier, name="duration_tier"), nullable=False)
    pipeline_stage: Mapped[PipelineStage] = mapped_column(
        Enum(PipelineStage, name="pipeline_stage"), nullable=False, default=PipelineStage.BRIEF
    )
    pipeline_state: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    outline: Mapped[str | None] = mapped_column(Text)
    scenario: Mapped[str | None] = mapped_column(Text)

    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    team = relationship("Team", back_populates="projects")
    scenes = relationship("Scene", back_populates="project", lazy="noload", order_by="Scene.scene_number")
    characters = relationship("Character", back_populates="project", lazy="noload")
    locations = relationship("Location", back_populates="project", lazy="noload")
    exports = relationship("Export", back_populates="project", lazy="noload")
    lock = relationship("ProjectLock", back_populates="project", uselist=False, lazy="noload")


class ProjectLock(Base):
    __tablename__ = "project_locks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False)
    locked_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    locked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_ping: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="lock")
