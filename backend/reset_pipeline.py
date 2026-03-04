from app.database import SyncSessionLocal
from sqlalchemy import text

db = SyncSessionLocal()
result = db.execute(text("SELECT id, pipeline_stage, pipeline_state FROM projects"))
for row in result.fetchall():
    print(f"Project: {row[0]}, Stage: {row[1]}, State: {row[2]}")
    state = dict(row[2]) if isinstance(row[2], dict) else {}
    has_failed = any(v == "failed" for v in state.values())
    if has_failed:
        new_state = {k: ("approved" if k == "brief" else "pending") for k in state}
        db.execute(
            text("UPDATE projects SET pipeline_stage = 'BRIEF', pipeline_state = :state WHERE id = :pid"),
            {"state": str(new_state).replace("'", '"'), "pid": str(row[0])},
        )
        print(f"  -> RESET to BRIEF")
db.commit()
db.close()
print("Done")
