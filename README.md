# 🐺 Werewolf Game - Online Multiplayer

Modern online multiplayer Werewolf (Mafia) game built with Vercel serverless functions and JSONBin storage.

## ✨ Features

- 🎮 Real-time multiplayer gameplay
- 🔐 Google Sign-In authentication
- 💬 Live chat system
- 🎭 Role assignment (Werewolf, Villager, etc.)
- 📱 Responsive design
- ☁️ Serverless architecture (Vercel)
- 💾 JSONBin cloud storage

## 🚀 Quick Start

### 1. Create JSONBin Account

1. Go to [JSONBin.io](https://jsonbin.io/)
2. Create a free account
3. Create a new bin with this initial content:

```json
{
  "credentials": [],
  "rooms": {}
}
```

4. Copy your **Bin ID** and **API Key**

### 2. Setup Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Go to **Credentials** → Create **OAuth 2.0 Client ID**
5. Add authorized JavaScript origins:
   - `http://localhost:3000` (for local dev)
   - `https://your-app.vercel.app` (for production)
6. Copy your **Client ID**

### 3. Deploy to Vercel

#### Via Vercel Dashboard:

1. Fork/clone this repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Import Project**
4. Select your repository
5. Add Environment Variables:
   - `MASTER_BIN_ID` = Your JSONBin Bin ID
   - `MASTER_API_KEY` = Your JSONBin API Key
   - `ADMIN_EMAIL` = Your admin email
   - `GOOGLE_CLIENT_ID` = Your Google OAuth Client ID (optional)
6. Click **Deploy**

#### Via Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Add environment variables
vercel env add MASTER_BIN_ID
vercel env add MASTER_API_KEY
vercel env add ADMIN_EMAIL
vercel env add GOOGLE_CLIENT_ID

# Redeploy with env vars
vercel --prod
```

### 4. Update Google Client ID in HTML

After deploying, update the Google Client ID in `public/index.html`:

```html
<div id="g_id_onload"
     data-client_id="YOUR_ACTUAL_CLIENT_ID_HERE"
     ...>
</div>
```

## 🎮 How to Play

### Creating a Room

1. Sign in with Google or use Dev Mode
2. Enter a room name (optional)
3. Click **Create Room**
4. Share the room code with friends

### Joining a Room

1. Sign in with Google or use Dev Mode
2. Click on any available room or enter room code
3. Click **Ready** when you're ready to start
4. Game starts when all players (min 3) are ready

### Game Rules

- **Werewolves**: Kill villagers at night
- **Villagers**: Vote to eliminate suspected werewolves during the day
- **Special Roles**: Coming soon (Seer, Doctor, etc.)

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Run development server
npm run dev

# Open browser
open http://localhost:3000
```

## 📁 Project Structure

```
werewolf-game/
├── api/                    # Serverless API endpoints
│   ├── auth.js            # Authentication
│   ├── rooms/             # Room management
│   │   ├── create.js      # Create room
│   │   ├── list.js        # List rooms
│   │   └── join.js        # Join room
│   ├── chat/              # Chat system
│   │   ├── send.js        # Send message
│   │   └── fetch.js       # Fetch messages
│   └── game/              # Game logic
│       ├── ready.js       # Ready status
│       ├── vote.js        # Voting
│       └── state.js       # Game state
├── lib/                   # Utility libraries
│   └── jsonbin.js         # JSONBin client
├── public/                # Frontend files
│   ├── index.html         # Lobby page
│   └── room.html          # Game room page
├── package.json
├── vercel.json           # Vercel configuration
└── README.md
```

## 🔧 Configuration

### Environment Variables

- `MASTER_BIN_ID` - JSONBin master bin ID (required)
- `MASTER_API_KEY` - JSONBin API key (required)
- `ADMIN_EMAIL` - Admin email address (optional)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (optional)

## 🐛 Troubleshooting

### Room creation fails

- Check if `MASTER_BIN_ID` and `MASTER_API_KEY` are set correctly
- Verify your JSONBin account has available storage
- Check Vercel function logs for errors

### Google Sign-In not working

- Verify `GOOGLE_CLIENT_ID` is set in environment variables
- Update the client ID in `public/index.html`
- Check if authorized origins include your domain
- Make sure Google+ API is enabled

### Chat not updating

- The app uses polling every 2.5 seconds
- Check browser console for errors
- Verify API endpoints are responding

## 🚀 Planned Features

- [ ] More role types (Seer, Doctor, Hunter)
- [ ] Day/Night cycle automation
- [ ] Voice chat integration
- [ ] Game history and statistics
- [ ] Custom game rules
- [ ] Mobile app

## 📝 License

MIT License - feel free to use this project for your own games!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions:
- Create an issue on GitHub
- Email: hanzgantengno1@gmail.com

---

Made with ❤️ for the Werewolf community