from app.database import SyncSessionLocal
from sqlalchemy import select
from app.models.user import SystemSetting
from app.utils.encryption import decrypt_value

db = SyncSessionLocal()
r = db.execute(select(SystemSetting).where(SystemSetting.key == "openai_api_key"))
s = r.scalar_one_or_none()
if s and s.value_enc:
    k = decrypt_value(s.value_enc)
    print("KEY_FOUND:", k[0:8] + "..." + k[len(k)-4:])
else:
    print("NO_KEY_FOUND")
db.close()
