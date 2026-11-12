"""Export the app contract for TypeScript generation; no running server needed."""
import json
from pathlib import Path

from app.main import create_app

target = Path(__file__).resolve().parents[2] / 'mobile' / 'openapi.json'
target.write_text(json.dumps(create_app().openapi(), indent=2) + '\n', encoding='utf-8')
