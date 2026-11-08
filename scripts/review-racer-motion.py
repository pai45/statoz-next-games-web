"""Create and decode a bounded QA clip from the browser compositor recording."""
from pathlib import Path
import hashlib
import json
import subprocess
import imageio_ffmpeg

root = Path(__file__).resolve().parents[1]
output = root / "test-results" / "racer"
timing = json.loads((output / "motion-timing.json").read_text())
source = output / "silverstone-full-run.webm"
clip = output / "silverstone-motion.mp4"
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-ss", str(timing["startSeconds"]), "-i", str(source), "-t", "10", "-an", "-r", "30", "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(clip)], check=True)
subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(clip), "-f", "null", "-"], check=True)
for second in [0, 3, 6, 9]:
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-ss", str(second), "-i", str(clip), "-frames:v", "1", str(output / f"motion-{second}.png")], check=True)
record = {"clip": str(clip.relative_to(root)), "sha256": hashlib.sha256(clip.read_bytes()).hexdigest(), "bytes": clip.stat().st_size, "decode": "passed", "durationSeconds": 10, "outputFps": 30, "method": "Browser compositor capture; ordinary live driving. Export frame rate is not a measurement of native game frame rate."}
(output / "motion-video.json").write_text(json.dumps(record, indent=2) + "\n")
print(json.dumps(record))
