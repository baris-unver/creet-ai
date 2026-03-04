import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.scene import StageStatus


class AssetType(str, PyEnum):
    IMAGE = "image"
    AUDIO = "audio"
    SUBTITLE = "subtitle"


class GeneratedAsset(Base):
    __tablename__ = "generated_assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    scene_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_type: Mapped[AssetType] = mapped_column(Enum(AssetType, name="asset_type"), nullable=False)
    storage_path: Mapped[str | None] = mapped_column(String(1024))
    status: Mapped[StageStatus] = mapped_column(Enum(StageStatus, name="stage_status", create_type=False), nullable=False, default=StageStatus.PENDING)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB)
    provider_used: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    scene = relationship("Scene", back_populates="assets")
