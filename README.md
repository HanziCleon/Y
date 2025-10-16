Werewolf — Vercel + JSONBin edition
----------------------------------

1) Create a master JSONBin (v3) and paste initial content:
{
  "credentials": [],
  "rooms": {}
}

2) Add Environment Variables on Vercel (Project Settings -> Environment Variables):
   - MASTER_BIN_ID  (bin id for the master bin)
   - MASTER_API_KEY (master key)
   - ADMIN_EMAIL (optional)

3) Commit this repo and Deploy to Vercel (Import repo).
   - No socket server needed — serverless functions in api/ handle everything.

4) Usage:
   - Open site root -> Dev login via email -> Create Room.
   - Join room in multiple tabs/dev devices.
   - Players click Ready -> when everyone Ready (min 3) roles assigned.
   - Chat uses polling (every 2.5s). Messages saved in room's own JSONBin.

Notes:
- This version is optimized for Vercel serverless. It stores chat & game data per-room bin (per your request).
- If you want automated night/day timer or richer role skill support, we can wire werewolf.js functions deeper into endpoints (game skill endpoints).