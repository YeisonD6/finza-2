import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import pytest


def test_typescript_mobile_client_against_real_api_and_postgres(pg_identity):
    root = Path(__file__).resolve().parents[2]
    cli = root / "mobile/node_modules/tsx/dist/cli.mjs"
    node = os.getenv("FINZA_NODE") or shutil.which("node")
    if not node or not cli.exists():
        pytest.skip("Requires mobile npm ci and Node for real TypeScript bridge")
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    url = f"http://127.0.0.1:{port}"
    # Same migrated disposable database and JWT settings as the test fixture.
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        for _ in range(100):
            try:
                with urllib.request.urlopen(url + "/health/live", timeout=1):
                    break
            except OSError:
                if process.poll() is not None:
                    pytest.fail("Temporary API process exited")
                time.sleep(0.1)
        else:
            pytest.fail("Temporary API did not start")
        result = subprocess.run(
            [node, str(cli), str(root / "mobile/tests/backend-bridge.ts")],
            env={**os.environ, "FINZA_BRIDGE_URL": url},
            capture_output=True,
            text=True,
            timeout=45,
            check=False,
        )
        assert result.returncode == 0, result.stdout + result.stderr
        assert "BRIDGE_OK" in result.stdout
    finally:
        process.terminate()
        process.wait(timeout=15)
