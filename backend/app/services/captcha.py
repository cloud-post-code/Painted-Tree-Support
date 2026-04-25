import httpx

from app.core.config import get_settings


async def verify_hcaptcha(token: str | None, remoteip: str | None = None) -> bool:
    settings = get_settings()
    if not settings.hcaptcha_secret:
        return True
    if not token:
        return False
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://hcaptcha.com/siteverify",
            data={
                "secret": settings.hcaptcha_secret,
                "response": token,
                "remoteip": remoteip or "",
            },
            timeout=10.0,
        )
        data = r.json()
        return bool(data.get("success"))
