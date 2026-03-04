from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, teams, projects, pipeline, scenes, characters, locations, exports, settings as team_settings_router, websocket, legal


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.APP_URL, "http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])
app.include_router(team_settings_router.router, prefix="/api/teams", tags=["team-settings"])
app.include_router(projects.router, prefix="/api/teams/{team_id}/projects", tags=["projects"])
app.include_router(pipeline.router, prefix="/api/teams/{team_id}/projects/{project_id}/pipeline", tags=["pipeline"])
app.include_router(scenes.router, prefix="/api/teams/{team_id}/projects/{project_id}/scenes", tags=["scenes"])
app.include_router(characters.router, prefix="/api/teams/{team_id}/projects/{project_id}/characters", tags=["characters"])
app.include_router(locations.router, prefix="/api/teams/{team_id}/projects/{project_id}/locations", tags=["locations"])
app.include_router(exports.router, prefix="/api/teams/{team_id}/projects/{project_id}/exports", tags=["exports"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])
app.include_router(legal.router, prefix="/api/legal", tags=["legal"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": settings.APP_NAME}
