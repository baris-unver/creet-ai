from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.dependencies import DB, CurrentUser
from app.schemas.user import UserResponse, UserWithPolicy
from app.services.auth import (
    create_token,
    exchange_google_code,
    has_accepted_policy,
    process_pending_invitations,
    record_policy_acceptance,
    upsert_user,
)

router = APIRouter()


@router.get("/google/login")
async def google_login(settings: Settings = Depends(get_settings)):
    params = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    })
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


@router.get("/google/callback")
async def google_callback(
    code: str,
    response: Response,
    db: DB,
    settings: Settings = Depends(get_settings),
):
    try:
        google_user = await exchange_google_code(code, settings)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to authenticate with Google")

    user = await upsert_user(db, google_user)
    await process_pending_invitations(db, user)

    token = create_token(user.id, settings)

    accepted = await has_accepted_policy(db, user.id, settings.POLICY_VERSION)
    redirect_path = "/" if accepted else "/accept-policy"

    response.set_cookie(
        key="creet_token",
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.JWT_EXPIRY_HOURS * 3600,
        path="/",
    )

    from fastapi.responses import RedirectResponse
    redirect = RedirectResponse(url=f"{settings.APP_URL}{redirect_path}", status_code=302)
    redirect.set_cookie(
        key="creet_token",
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.JWT_EXPIRY_HOURS * 3600,
        path="/",
    )
    return redirect


@router.get("/me", response_model=UserWithPolicy)
async def get_me(
    current_user: CurrentUser,
    db: DB,
    settings: Settings = Depends(get_settings),
):
    accepted = await has_accepted_policy(db, current_user.id, settings.POLICY_VERSION)
    return UserWithPolicy(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        has_accepted_current_policy=accepted,
        is_superadmin=current_user.is_superadmin,
    )


@router.post("/accept-policy")
async def accept_policy(
    request: Request,
    current_user: CurrentUser,
    db: DB,
    settings: Settings = Depends(get_settings),
):
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await record_policy_acceptance(db, current_user.id, settings.POLICY_VERSION, ip, ua)
    return {"accepted": True}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("creet_token", path="/")
    return {"logged_out": True}
