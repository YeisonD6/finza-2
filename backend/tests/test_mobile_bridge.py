import json
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
    def start():
        return subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    def ready(process):
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

    process = start()
    try:
        ready(process)
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
        process.terminate()
        process.wait(timeout=15)
        process = start()
        ready(process)
        login = urllib.request.Request(
            url + "/api/v1/auth/login",
            data=json.dumps({"email": "bridge-b@example.com", "password": "correct horse battery"}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(login, timeout=5) as response:
            token = json.load(response)["access_token"]
        request = urllib.request.Request(
            url + "/api/v1/movements?month=2024-04", headers={"Authorization": "Bearer " + token}
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            saved = json.load(response)["items"]
        assert (
            len(saved) == 1
            and saved[0]["note"] == "persist-after-restart"
            and saved[0]["amount"] == "1234.50"
        )
        request = urllib.request.Request(
            url + "/api/v1/dashboard/summary?month=2024-04", headers={"Authorization": "Bearer " + token}
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            dashboard = json.load(response)
        assert dashboard["net"] == "-1234.50"
        assert dashboard["recent_movements"][0]["id"] == saved[0]["id"]
        assert dashboard["comparison"]["reason"] == "no_previous_data"
    finally:
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=15)
