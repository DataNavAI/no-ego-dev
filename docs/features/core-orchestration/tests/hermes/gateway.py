import asyncio
import ipaddress
import json
import os
from pathlib import Path
import signal
import sys


source = Path(sys.argv[1]).resolve()
model_port = int(sys.argv[2])
sys.path.insert(0, str(source))


def guard(event, args):
    if event == "socket.connect":
        address = args[1]
        if isinstance(address, tuple):
            try:
                allowed = ipaddress.ip_address(address[0]).is_loopback and address[1] == model_port
            except ValueError:
                allowed = False
            if not allowed:
                raise PermissionError("Hermes test forbids non-model networking")
    elif event == "socket.getaddrinfo":
        if args[0] not in ("127.0.0.1", "::1", "localhost", None):
            raise PermissionError("Hermes test forbids external DNS")
    elif event in ("subprocess.Popen", "os.system", "os.exec", "os.posix_spawn"):
        raise PermissionError("Hermes test forbids external commands")


sys.addaudithook(guard)


async def main():
    import socket

    try:
        socket.create_connection(("192.0.2.1", 443), timeout=0.1)
    except PermissionError:
        pass
    else:
        raise RuntimeError("Network isolation self-test failed")
    from gateway.config import PlatformConfig
    from gateway.platforms.api_server import APIServerAdapter
    import gateway.platforms.api_server as api

    if not Path(api.__file__).resolve().is_relative_to(source):
        raise RuntimeError("Wrong Hermes source imported")
    gateway = APIServerAdapter(PlatformConfig(enabled=True, extra={
        "host": "127.0.0.1", "port": 0, "key": os.environ["API_SERVER_KEY"],
    }))
    stopping = asyncio.Event()
    loop = asyncio.get_running_loop()
    for name in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(name, stopping.set)
    try:
        if not await gateway.connect():
            raise RuntimeError("Hermes API gateway failed to start")
        port = gateway._site._server.sockets[0].getsockname()[1]
        print("NED_HERMES_READY " + json.dumps({"port": port, "egressGuard": True}), flush=True)
        await stopping.wait()
    finally:
        await asyncio.wait_for(gateway.disconnect(), timeout=5)


asyncio.run(main())
