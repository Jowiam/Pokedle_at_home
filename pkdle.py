"""Local development server for the PokeGuess browser game."""

from __future__ import annotations

import functools
import http.server
import webbrowser
from pathlib import Path


HOST = "127.0.0.1"
PORT = 8000
ROOT = Path(__file__).parent


class GameServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True


def main() -> None:
    """Serve the game and open it in the default browser."""
    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler,
        directory=str(ROOT),
    )
    server = GameServer((HOST, PORT), handler)
    url = f"http://{HOST}:{PORT}/index.html"
    print(f"PokeGuess is running at {url}")
    print("Press Ctrl+C to stop the server.")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping PokeGuess.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()