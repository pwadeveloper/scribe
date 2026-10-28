"""Render the composition frame by frame through the shared headless browser.

Screenshots use --base64 so each capture finishes inside its own command
before the next renderFrame() runs; file-path screenshots are written
asynchronously and can capture a later timeline state under load."""
import base64, json, os, subprocess, sys, time
fmt = sys.argv[1]
fps = int(sys.argv[2]) if len(sys.argv) > 2 else 60
ROOT = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(ROOT, 'frames', fmt)
os.makedirs(out, exist_ok=True)
B = os.path.expanduser('~/.claude/skills/gstack/browse/dist/browse')
W, H = (1080, 1920) if fmt == 'vertical' else (1920, 1080)
duration = 49.754
total = int(duration * fps)

def chain(cmds):
    return subprocess.run([B, 'chain'], input=json.dumps(cmds), capture_output=True, text=True).stdout

chain([["viewport", f"{W}x{H}", "--scale", "1"],
       ["goto", f"file://{ROOT}/comp/index.html?format={fmt}"],
       ["wait", "--load"], ["js", "window.ready"]])
start = time.time()
BATCH = 24
f = 0
while f < total:
    frames = list(range(f, min(total, f + BATCH)))
    cmds = []
    for i in frames:
        cmds.append(["js", f"renderFrame({i / fps:.6f}, {i})"])
        cmds.append(["screenshot", "--viewport", "--base64"])
    stdout = chain(cmds)
    shots = [ln.split('base64,', 1)[1].strip() for ln in stdout.splitlines() if ln.startswith('[screenshot] data:image/png;base64,')]
    if len(shots) != len(frames):
        print(f'batch at {f}: expected {len(frames)} shots, got {len(shots)}; retrying', flush=True)
        # Reload the page and retry this batch from scratch
        chain([["goto", f"file://{ROOT}/comp/index.html?format={fmt}"], ["wait", "--load"], ["js", "window.ready"]])
        continue
    for i, data in zip(frames, shots):
        with open(f'{out}/f{i:05d}.png', 'wb') as fh:
            fh.write(base64.b64decode(data))
    f += BATCH
    done = min(total, f)
    if (f // BATCH) % 10 == 0 or done == total:
        el = time.time() - start
        print(f'{fmt}: {done}/{total} frames, {el:.0f}s elapsed, ~{el / done * (total - done):.0f}s left', flush=True)
missing = [i for i in range(total) if not os.path.exists(f'{out}/f{i:05d}.png')]
print('missing frames:', len(missing), flush=True)
