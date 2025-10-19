import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Moon, Sun, MessageCircle, Trophy, Skull } from 'lucide-react';

// JSONBin Configuration
const JSONBIN_API_KEY = '$2b$10$YOUR_API_KEY_HERE'; // Ganti dengan API key JSONBin Anda
const BIN_ID = 'YOUR_BIN_ID_HERE'; // Ganti dengan Bin ID Anda

const WerewolfChatGame = () => {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [gameState, setGameState] = useState({
    players: [],
    phase: 'lobby', // lobby, night, day, voting
    roles: {},
    votes: {},
    deaths: [],
    day: 0
  });
  const [myRole, setMyRole] = useState(null);
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch data from JSONBin
  const fetchData = async () => {
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY
        }
      });
      const data = await response.json();
      if (data.record) {
        setMessages(data.record.messages || []);
        setGameState(data.record.gameState || gameState);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Update data to JSONBin
  const updateData = async (newMessages, newGameState) => {
    try {
      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY
        },
        body: JSON.stringify({
          messages: newMessages,
          gameState: newGameState
        })
      });
    } catch (error) {
      console.error('Error updating data:', error);
    }
  };

  // Start polling when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      pollInterval.current = setInterval(fetchData, 3000);
      return () => clearInterval(pollInterval.current);
    }
  }, [isLoggedIn]);

  const handleLogin = () => {
    if (username.trim()) {
      setIsLoggedIn(true);
      const newPlayers = [...gameState.players];
      if (!newPlayers.find(p => p.name === username)) {
        newPlayers.push({ name: username, alive: true });
      }
      const newGameState = { ...gameState, players: newPlayers };
      setGameState(newGameState);
      
      const systemMsg = {
        id: Date.now(),
        user: 'System',
        text: `${username} bergabung ke room`,
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      const newMessages = [...messages, systemMsg];
      setMessages(newMessages);
      updateData(newMessages, newGameState);
    }
  };

  const sendMessage = () => {
    if (inputMessage.trim()) {
      const newMsg = {
        id: Date.now(),
        user: username,
        text: inputMessage,
        timestamp: new Date().toISOString(),
        type: 'chat'
      };
      const newMessages = [...messages, newMsg];
      setMessages(newMessages);
      updateData(newMessages, gameState);
      setInputMessage('');
    }
  };

  const startGame = () => {
    if (gameState.players.length < 4) {
      alert('Minimal 4 pemain untuk memulai!');
      return;
    }

    const roles = ['werewolf', 'seer', 'guard', 'villager'];
    const playerRoles = {};
    const shuffled = [...gameState.players].sort(() => Math.random() - 0.5);
    
    shuffled.forEach((player, idx) => {
      if (idx === 0) playerRoles[player.name] = 'werewolf';
      else if (idx === 1) playerRoles[player.name] = 'seer';
      else if (idx === 2) playerRoles[player.name] = 'guard';
      else playerRoles[player.name] = 'villager';
    });

    const newGameState = {
      ...gameState,
      phase: 'night',
      roles: playerRoles,
      day: 1
    };

    setGameState(newGameState);
    setMyRole(playerRoles[username]);

    const systemMsg = {
      id: Date.now(),
      user: 'System',
      text: '🌙 Game dimulai! Malam hari tiba. Periksa role Anda di sidebar.',
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    const newMessages = [...messages, systemMsg];
    setMessages(newMessages);
    updateData(newMessages, newGameState);
  };

  const handleVote = (targetPlayer) => {
    const newVotes = { ...gameState.votes };
    newVotes[username] = targetPlayer;
    
    const newGameState = { ...gameState, votes: newVotes };
    setGameState(newGameState);
    
    const voteMsg = {
      id: Date.now(),
      user: 'System',
      text: `${username} telah memberikan vote`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    const newMessages = [...messages, voteMsg];
    setMessages(newMessages);
    updateData(newMessages, newGameState);
  };

  const getRoleEmoji = (role) => {
    const emojis = {
      werewolf: '🐺',
      seer: '🔮',
      guard: '🛡️',
      villager: '👤'
    };
    return emojis[role] || '👤';
  };

  const getRoleColor = (role) => {
    const colors = {
      werewolf: 'text-red-600',
      seer: 'text-purple-600',
      guard: 'text-blue-600',
      villager: 'text-gray-600'
    };
    return colors[role] || 'text-gray-600';
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md border-2 border-black p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">🐺 WEREWOLF</h1>
            <p className="text-gray-600">Chat & Play Game</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Masukkan username..."
              className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={handleLogin}
              className="w-full bg-black text-white py-3 font-bold hover:bg-gray-800 transition-colors"
            >
              JOIN ROOM
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b-2 border-black p-4 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">🐺 WEREWOLF</h1>
            <span className="text-sm text-gray-600">@{username}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="font-bold">{gameState.players.length}</span>
            </div>
            {gameState.phase === 'night' && <Moon className="w-5 h-5" />}
            {gameState.phase === 'day' && <Sun className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <div className="w-64 border-r-2 border-black p-4 hidden md:block">
          <div className="mb-6">
            <h3 className="font-bold mb-3 text-lg border-b-2 border-black pb-2">PLAYERS</h3>
            <div className="space-y-2">
              {gameState.players.map((player, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 border border-black">
                  <span className="font-medium">{player.name}</span>
                  {!player.alive && <Skull className="w-4 h-4 text-red-600" />}
                </div>
              ))}
            </div>
          </div>

          {myRole && (
            <div className="mb-6">
              <h3 className="font-bold mb-3 text-lg border-b-2 border-black pb-2">YOUR ROLE</h3>
              <div className="border-2 border-black p-4 text-center">
                <div className="text-4xl mb-2">{getRoleEmoji(myRole)}</div>
                <div className={`text-xl font-bold uppercase ${getRoleColor(myRole)}`}>
                  {myRole}
                </div>
              </div>
            </div>
          )}

          {gameState.phase === 'lobby' && (
            <button
              onClick={startGame}
              className="w-full bg-black text-white py-3 font-bold hover:bg-gray-800 transition-colors"
            >
              START GAME
            </button>
          )}

          {gameState.phase === 'voting' && (
            <div>
              <h3 className="font-bold mb-3 text-lg border-b-2 border-black pb-2">VOTE</h3>
              <div className="space-y-2">
                {gameState.players.filter(p => p.alive && p.name !== username).map((player, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleVote(player.name)}
                    className="w-full p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
                    disabled={gameState.votes[username]}
                  >
                    {player.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${
                  msg.type === 'system'
                    ? 'text-center'
                    : msg.user === username
                    ? 'flex justify-end'
                    : 'flex justify-start'
                }`}
              >
                {msg.type === 'system' ? (
                  <div className="bg-gray-100 border border-black px-4 py-2 inline-block">
                    <p className="text-sm font-medium">{msg.text}</p>
                  </div>
                ) : (
                  <div
                    className={`max-w-xs lg:max-w-md ${
                      msg.user === username
                        ? 'bg-black text-white'
                        : 'bg-white border-2 border-black'
                    } p-3`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{msg.user}</span>
                      <span className="text-xs opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="break-words">{msg.text}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t-2 border-black p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ketik pesan..."
                className="flex-1 px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                onClick={sendMessage}
                className="bg-black text-white px-6 py-3 hover:bg-gray-800 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WerewolfChatGame;