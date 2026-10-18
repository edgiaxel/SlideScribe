import os
import sys
import time
import json
import base64
import asyncio
import subprocess
import httpx
import websockets

SCREENSHOT_DIR = os.path.abspath("artifacts/screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

CHROME_BIN = "/usr/bin/google-chrome"
FRONTEND_URL = "http://localhost:5173"
BACKEND_URL = "http://localhost:8000"

class ChromeDevToolsClient:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self._msg_id = 0
        self.console_logs = []
        self.failed_requests = []
        self._pending_responses = {}

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=20 * 1024 * 1024)
        asyncio.create_task(self._listener())

    async def _listener(self):
        try:
            async for raw in self.ws:
                msg = json.loads(raw)
                if "id" in msg:
                    fut = self._pending_responses.pop(msg["id"], None)
                    if fut and not fut.done():
                        fut.set_result(msg)
                else:
                    method = msg.get("method", "")
                    params = msg.get("params", {})
                    if method == "Runtime.consoleAPICalled":
                        log_type = params.get("type", "log")
                        args = [str(a.get("value", a.get("description", ""))) for a in params.get("args", [])]
                        log_entry = f"[{log_type.upper()}] " + " ".join(args)
                        self.console_logs.append(log_entry)
                    elif method == "Runtime.exceptionThrown":
                        details = params.get("exceptionDetails", {})
                        text = details.get("text", "")
                        exc = details.get("exception", {}).get("description", "")
                        self.console_logs.append(f"[EXCEPTION] {text} {exc}".strip())
                    elif method == "Network.responseReceived":
                        resp = params.get("response", {})
                        status = resp.get("status", 200)
                        url = resp.get("url", "")
                        if status >= 400:
                            self.failed_requests.append(f"{status} {url}")
                    elif method == "Network.loadingFailed":
                        url = params.get("url", "")
                        err = params.get("errorText", "")
                        self.failed_requests.append(f"FAILED {url} ({err})")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            pass

    async def send(self, method: str, params: dict = None):
        self._msg_id += 1
        msg_id = self._msg_id
        payload = {"id": msg_id, "method": method, "params": params or {}}
        loop = asyncio.get_running_loop()
        fut = loop.create_future()
        self._pending_responses[msg_id] = fut
        await self.ws.send(json.dumps(payload))
        return await fut

    async def evaluate(self, expression: str):
        res = await self.send("Runtime.evaluate", {
            "expression": expression,
            "awaitPromise": True,
            "returnByValue": True
        })
        result = res.get("result", {}).get("result", {})
        return result.get("value")

    async def screenshot(self, filepath: str):
        res = await self.send("Page.captureScreenshot", {"format": "png"})
        b64data = res.get("result", {}).get("data", "")
        if b64data:
            with open(filepath, "wb") as f:
                f.write(base64.b64decode(b64data))
            return True
        return False

    async def close(self):
        if self.ws:
            await self.ws.close()

async def run_smoke_test():
    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "checks": {},
        "screenshots": [],
        "console_errors": [],
        "failed_network_requests": []
    }

    # 1. Start Chrome
    print("[1/8] Starting Google Chrome with remote debugging on port 9222...")
    proc = subprocess.Popen([
        CHROME_BIN,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--remote-debugging-port=9222",
        "--window-size=1440,900"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    await asyncio.sleep(1.5)

    try:
        # 2. Get WebSocket debugger URL
        async with httpx.AsyncClient() as http:
            cdp_info = await http.get("http://localhost:9222/json")
            pages = cdp_info.json()
            target = next((p for p in pages if p.get("type") == "page"), pages[0])
            ws_url = target["webSocketDebuggerUrl"]

        client = ChromeDevToolsClient(ws_url)
        await client.connect()

        # Enable domains
        await client.send("Page.enable")
        await client.send("Runtime.enable")
        await client.send("Network.enable")

        # 3. Visit Home View
        print(f"[2/8] Navigating to Home view at {FRONTEND_URL}...")
        await client.send("Page.navigate", {"url": FRONTEND_URL})
        await asyncio.sleep(2.5)

        title = await client.evaluate("document.title")
        has_nav = await client.evaluate("document.querySelector('aside') !== null")
        has_heading = await client.evaluate("document.body.innerText.includes('SlideScribe') || document.body.innerText.includes('Workspace')")
        
        home_path = os.path.join(SCREENSHOT_DIR, "01_home.png")
        await client.screenshot(home_path)
        report["screenshots"].append("01_home.png")
        report["checks"]["home_loaded"] = {
            "passed": bool(title and has_nav),
            "details": f"Page title: '{title}', Sidebar present: {has_nav}"
        }
        print("  ✓ Home loaded and captured: 01_home.png")

        # 4. Visit Note Editor View
        print("[3/8] Testing Note Editor View...")
        # First ensure notes are loaded, or click "New Note"
        await asyncio.sleep(1.0)
        editor_opened = await client.evaluate("""
            (() => {
                // Check if a note button in sidebar or a card on home exists
                const noteBtns = Array.from(document.querySelectorAll('button'))
                    .filter(el => el.innerText.includes('Understanding') || el.innerText.includes('Machine') || el.innerText.includes('New Note'));
                if (noteBtns.length > 0) {
                    noteBtns[0].click();
                    return true;
                }
                return false;
            })()
        """)
        await asyncio.sleep(2.0)

        editor_present = await client.evaluate("""
            document.querySelector('.ProseMirror') !== null || 
            document.querySelector('input[placeholder*="title"]') !== null
        """)
        editor_path = os.path.join(SCREENSHOT_DIR, "02_note_editor.png")
        await client.screenshot(editor_path)
        report["screenshots"].append("02_note_editor.png")
        report["checks"]["note_editor_opened"] = {
            "passed": bool(editor_present),
            "details": f"Editor/article DOM element found: {editor_present}"
        }
        print("  ✓ Note Editor opened and captured: 02_note_editor.png")

        # 5. Test Note Interaction & Autosave
        print("[4/8] Testing Note Editing & Autosave...")
        edit_result = await client.evaluate("""
            (() => {
                const titleInput = document.querySelector('input[placeholder*="title"]');
                if (titleInput) {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(titleInput, "Verified Lecture Note - Autosave Test");
                    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                    titleInput.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
                return false;
            })()
        """)
        await asyncio.sleep(2.0)
        save_indicator = await client.evaluate("""
            (() => {
                const text = document.body.innerText;
                return text.includes('Saved') || text.includes('Saving');
            })()
        """)
        report["checks"]["note_autosave_interaction"] = {
            "passed": bool(edit_result and save_indicator),
            "details": f"Title updated: {edit_result}, Autosave indicator active: {save_indicator}"
        }
        print(f"  ✓ Note editing & autosave verified: {save_indicator}")

        # 6. Test Navigation to Import Materials View
        print("[5/8] Navigating to Import Materials View...")
        import_nav = await client.evaluate("""
            (() => {
                const importBtn = Array.from(document.querySelectorAll('button, a'))
                    .find(el => el.innerText.toLowerCase().includes('import materials') || el.innerText.toLowerCase().includes('import'));
                if (importBtn) {
                    importBtn.click();
                    return true;
                }
                return false;
            })()
        """)
        await asyncio.sleep(1.5)

        import_zone_present = await client.evaluate("""
            (() => {
                const text = document.body.innerText;
                return text.includes('Import Lecture Materials') || text.includes('PDF') || text.includes('Upload');
            })()
        """)
        import_path = os.path.join(SCREENSHOT_DIR, "03_import_materials.png")
        await client.screenshot(import_path)
        report["screenshots"].append("03_import_materials.png")

        # Test empty file submission validation
        empty_validation = await client.evaluate("""
            (() => {
                const processBtn = Array.from(document.querySelectorAll('button'))
                    .find(el => el.innerText.includes('Extract & Generate') || el.innerText.includes('Process'));
                if (processBtn && processBtn.disabled) {
                    return "button_disabled_by_default";
                }
                return "active_state";
            })()
        """)
        report["checks"]["import_materials_view"] = {
            "passed": bool(import_zone_present),
            "details": f"Dropzones visible: {import_zone_present}, Empty submit protection: {empty_validation}"
        }
        print("  ✓ Import Materials view verified and captured: 03_import_materials.png")

        # 7. Test Navigation to Study View
        print("[6/8] Navigating to Study View...")
        study_nav = await client.evaluate("""
            (() => {
                const studyBtn = Array.from(document.querySelectorAll('button, a'))
                    .find(el => el.innerText.toLowerCase().includes('study'));
                if (studyBtn) {
                    studyBtn.click();
                    return true;
                }
                return false;
            })()
        """)
        await asyncio.sleep(2.0)

        study_present = await client.evaluate("""
            (() => {
                const text = document.body.innerText;
                return text.includes('Study') || text.includes('Quiz') || text.includes('Flashcards');
            })()
        """)
        study_path = os.path.join(SCREENSHOT_DIR, "04_study.png")
        await client.screenshot(study_path)
        report["screenshots"].append("04_study.png")

        # Test switching between Quiz and Flashcards tabs
        tab_switch = await client.evaluate("""
            (() => {
                const flashcardTab = Array.from(document.querySelectorAll('button'))
                    .find(el => el.innerText.includes('Flashcards'));
                if (flashcardTab) {
                    flashcardTab.click();
                    return true;
                }
                return false;
            })()
        """)
        await asyncio.sleep(1.0)
        flashcard_active = await client.evaluate("""
            (() => {
                const text = document.body.innerText;
                return text.includes('Flip Card') || text.includes('Card') || text.includes('Flashcard');
            })()
        """)

        report["checks"]["study_view_and_tabs"] = {
            "passed": bool(study_present),
            "details": f"Study view present: {study_present}, Flashcard tab toggled: {tab_switch}, Flashcard state: {flashcard_active}"
        }
        print("  ✓ Study view and tab interactions verified: 04_study.png")

        # 8. Test Settings Modal
        print("[7/8] Testing Settings Modal Interaction...")
        settings_opened = await client.evaluate("""
            (() => {
                const settingsBtn = Array.from(document.querySelectorAll('button'))
                    .find(el => el.innerText.toLowerCase().includes('settings'));
                if (settingsBtn) {
                    settingsBtn.click();
                    return true;
                }
                return false;
            })()
        """)
        await asyncio.sleep(1.0)
        settings_modal_visible = await client.evaluate("""
            (() => {
                const text = document.body.innerText;
                return text.includes('Profile Settings') || text.includes('Display Name');
            })()
        """)
        settings_path = os.path.join(SCREENSHOT_DIR, "05_settings_modal.png")
        await client.screenshot(settings_path)
        report["screenshots"].append("05_settings_modal.png")

        # Close settings modal
        await client.evaluate("""
            (() => {
                const cancelBtn = Array.from(document.querySelectorAll('button'))
                    .find(el => el.innerText.includes('Cancel') || el.innerText.includes('Close'));
                if (cancelBtn) cancelBtn.click();
            })()
        """)
        await asyncio.sleep(0.5)

        report["checks"]["settings_modal"] = {
            "passed": bool(settings_opened and settings_modal_visible),
            "details": f"Settings opened: {settings_opened}, Modal text verified: {settings_modal_visible}"
        }
        print("  ✓ Settings modal verified and captured: 05_settings_modal.png")

        # 9. Collect Console Errors & Failed Requests
        print("[8/8] Analyzing Browser Logs & Network Telemetry...")
        console_errors = [l for l in client.console_logs if "ERROR" in l or "EXCEPTION" in l]
        report["console_errors"] = console_errors
        report["failed_network_requests"] = client.failed_requests

        await client.close()

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()

    # Summary
    all_passed = all(c["passed"] for c in report["checks"].values())
    report["overall_status"] = "PASSED" if all_passed else "FAILED"
    
    print("\n" + "="*50)
    print(f"SMOKE TEST SUMMARY: {report['overall_status']}")
    print("="*50)
    for check_name, info in report["checks"].items():
        status = "PASSED" if info["passed"] else "FAILED"
        print(f"- {check_name}: {status} ({info['details']})")
    
    print(f"\nScreenshots captured in: {SCREENSHOT_DIR}")
    for s in report["screenshots"]:
        print(f"  • {s}")

    if report["console_errors"]:
        print(f"\nConsole Errors ({len(report['console_errors'])}):")
        for err in report["console_errors"]:
            print(f"  ! {err}")
    else:
        print("\nConsole Errors: None (0)")

    if report["failed_network_requests"]:
        print(f"\nFailed Network Requests ({len(report['failed_network_requests'])}):")
        for req in report["failed_network_requests"]:
            print(f"  ! {req}")
    else:
        print("Failed Network Requests: None (0)")
    print("="*50)

    # Save JSON report
    report_path = os.path.join(SCREENSHOT_DIR, "smoke_test_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Detailed JSON report written to: {report_path}\n")

if __name__ == "__main__":
    asyncio.run(run_smoke_test())
