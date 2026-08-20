# Tag Together 💗

A tiny 2-player real-time browser game designed for desktop and mobile.

## Features
- Create a room and share the short room code.
- Two players connect through Socket.IO.
- Mobile joystick + desktop WASD/arrow controls.
- Open uncluttered arena.
- Chaser has a visible tag/proximity ring.
- Close contact immediately swaps chaser/runner.
- Haptic feedback on supported phones.
- First player to 5 successful tags wins, then the next round resets.

## Run locally

1. Install Node.js 18+.
2. In this folder run:
   `npm install`
3. Start:
   `npm start`
4. Open `http://localhost:3000`.

For two phones on the same Wi-Fi, use the computer's LAN IP instead of localhost, e.g. `http://192.168.x.x:3000`.

## Put it online

Deploy this Node/Express app to any Node-compatible host that supports WebSockets. Both players then open the HTTPS game URL on their phones. One player creates a room and sends the room code to the other.

## Important

The server is authoritative for movement, tag distance, role swapping and scores. Room state is kept in memory, so restarting the server closes all rooms.
