from pathlib import Path
import os
import signal
root=Path(os.environ['HERMES_HOME'])/'workspace'
filename=root/'fixture.pid'
if filename.exists():
    pid=int(filename.read_text())
    try:
        command=Path('/proc/'+str(pid)+'/cmdline').read_bytes()
        if str(root/'broken.py').encode() in command:
            os.kill(pid,signal.SIGTERM)
    except FileNotFoundError:
        pass
    filename.unlink()
