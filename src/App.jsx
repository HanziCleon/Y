import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Moon, Sun, Skull, Swords, Eye, Shield, Info, Play, UserPlus } from 'lucide-react';

// JSONBin Configuration
const JSONBIN_API_KEY = '$2a$10$PsVzgljojE5fq8qZRmpE4uzMr0K9LArqfmumGVSmNY.P8F2iTKrim';
const BIN_ID = '68efb31dae596e708f156b67';

const WerewolfChatGame = () => {
  const [username, setUsername] = useState(localStorage.getItem('werewolf_username') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('werewolf_username'));
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [gameState, setGameState] = useState({
    players: [],
    phase: 'lobby',
    roles: {},
    votes: {},
    actions: {},
    deaths: [],
    protected: [],
    day: 0,
    readyPlayers: []
  });
  const [myRole, setMyRole] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

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
        headers: { 'X-Master-Key': JSONBIN_API_KEY }
      });
      const data = await response.json();
      if (data.record) {
        setMessages(data.record.messages || []);
        const gs = data.record.gameState || gameState;
        setGameState(gs);
        if (gs.roles[username]) {
          setMyRole(gs.roles[username]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

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
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      pollInterval.current = setInterval(fetchData, 3000);
      return () => clearInterval(pollInterval.current);
    }
  }, [isLoggedIn]);

  // BOT AI
  const addBot = async () => {
    const botNames = ['BotAlpha', 'BotBeta', 'BotGamma', 'BotDelta', 'BotOmega'];
    const availableNames = botNames.filter(name => 
      !gameState.players.find(p => p.name === name)
    );
    
    if (availableNames.length === 0) {
      alert('Semua bot sudah masuk!');
      return;
    }

    const botName = availableNames[0];
    const newPlayers = [...gameState.players, { name: botName, alive: true, isBot: true }];
    const newGameState = { ...gameState, players: newPlayers };
    
    const systemMsg = {
      id: Date.now(),
      user: 'System',
      text: `🤖 ${botName} (BOT) bergabung ke room`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    const newMessages = [...messages, systemMsg];
    setMessages(newMessages);
    setGameState(newGameState);
    await updateData(newMessages, newGameState);
  };

  const botAction = async (botName, phase) => {
    const role = gameState.roles[botName];
    const alivePlayers = gameState.players.filter(p => p.alive && p.name !== botName);
    
    if (alivePlayers.length === 0) return;
    
    const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    
    if (phase === 'night') {
      const newActions = { ...gameState.actions };
      newActions[botName] = target.name;
      
      const newGameState = { ...gameState, actions: newActions };
      setGameState(newGameState);
      await updateData(messages, newGameState);
    } else if (phase === 'voting') {
      const newVotes = { ...gameState.votes };
      newVotes[botName] = target.name;
      
      const newGameState = { ...gameState, votes: newVotes };
      setGameState(newGameState);
      await updateData(messages, newGameState);
    }
  };

  const handleLogin = async () => {
    if (username.trim()) {
      localStorage.setItem('werewolf_username', username);
      setIsLoggedIn(true);
      
      const newPlayers = [...gameState.players];
      if (!newPlayers.find(p => p.name === username)) {
        newPlayers.push({ name: username, alive: true, isBot: false });
      }
      const newGameState = { ...gameState, players: newPlayers };
      
      const systemMsg = {
        id: Date.now(),
        user: 'System',
        text: `👤 ${username} bergabung ke room`,
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      
      const newMessages = [...messages, systemMsg];
      setMessages(newMessages);
      setGameState(newGameState);
      await updateData(newMessages, newGameState);
    }
  };

  const sendMessage = async () => {
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
      await updateData(newMessages, gameState);
      setInputMessage('');
    }
  };

  const handleReady = async () => {
    const newReady = [...gameState.readyPlayers];
    if (!newReady.includes(username)) {
      newReady.push(username);
    }
    
    const newGameState = { ...gameState, readyPlayers: newReady };
    setGameState(newGameState);
    
    const systemMsg = {
      id: Date.now(),
      user: 'System',
      text: `✅ ${username} siap bermain (${newReady.length}/${gameState.players.length})`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    const newMessages = [...messages, systemMsg];
    setMessages(newMessages);
    await updateData(newMessages, newGameState);
    
    // Auto start jika semua ready
    if (newReady.length === gameState.players.length && gameState.players.length >= 4) {
      setTimeout(() => startGame(), 2000);
    }
  };

  const startGame = async () => {
    if (gameState.players.length < 4) {
      alert('Minimal 4 pemain untuk memulai!');
      return;
    }

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
      day: 1,
      actions: {},
      votes: {},
      readyPlayers: []
    };

    setGameState(newGameState);
    setMyRole(playerRoles[username]);

    const systemMsg = {
      id: Date.now(),
      user: 'System',
      text: '🌙 Game dimulai! Malam hari tiba. Periksa role Anda dan gunakan skill!',
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    const newMessages = [...messages, systemMsg];
    setMessages(newMessages);
    await updateData(newMessages, newGameState);

    // Bot auto action
    setTimeout(() => {
      gameState.players.filter(p => p.isBot).forEach(bot => {
        botAction(bot.name, 'night');
      });
    }, 2000);
  };

  const useSkill = async (targetName) => {
    const newActions = { ...gameState.actions };
    newActions[username] = targetName;
    
    const newGameState = { ...gameState, actions: newActions };
    setGameState(newGameState);
    
    let skillText = '';
    if (myRole === 'werewolf') skillText = `🐺 Kamu memilih ${targetName} untuk dibunuh`;
    else if (myRole === 'seer') skillText = `🔮 Kamu melihat ${targetName} adalah ${gameState.roles[targetName]}`;
    else if (myRole === 'guard') skillText = `🛡️ Kamu melindungi ${targetName}`;
    
    alert(skillText);
    setSelectedTarget(null);
    await updateData(messages, newGameState);
  };

  const handleVote = async (targetPlayer) => {
    const newVotes = { ...gameState.votes };
    newVotes[username] = targetPlayer;
    
    const newGameState = { ...gameState, votes: newVotes };
    setGameState(newGameState);
    
    const voteMsg = {
      id: Date.now(),
      user: 'System',
      text: `🗳️ ${username} telah memberikan vote`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    const newMessages = [...messages, voteMsg];
    setMessages(newMessages);
    await updateData(newMessages, newGameState);
  };

  const nextPhase = async () => {
    let newGameState = { ...gameState };
    
    if (gameState.phase === 'night') {
      // Process night actions
      const deaths = [];
      const protected = [];
      
      Object.entries(gameState.actions).forEach(([player, target]) => {
        const role = gameState.roles[player];
        if (role === 'werewolf' && !gameState.actions[`guard_${target}`]) {
          deaths.push(target);
        } else if (role === 'guard') {
          protected.push(target);
          newGameState.actions[`guard_${target}`] = true;
        }
      });
      
      newGameState.phase = 'day';
      newGameState.deaths = deaths;
      newGameState.protected = protected;
      newGameState.actions = {};
      
      deaths.forEach(name => {
        const player = newGameState.players.find(p => p.name === name);
        if (player) player.alive = false;
      });
      
      const deathText = deaths.length > 0 
        ? `☠️ ${deaths.join(', ')} terbunuh malam ini!` 
        : '✅ Tidak ada korban malam ini';
      
      const systemMsg = {
        id: Date.now(),
        user: 'System',
        text: `☀️ Pagi tiba! ${deathText}`,
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      
      const newMessages = [...messages, systemMsg];
      setMessages(newMessages);
      await updateData(newMessages, newGameState);
      
    } else if (gameState.phase === 'day') {
      newGameState.phase = 'voting';
      newGameState.votes = {};
      
      const systemMsg = {
        id: Date.now(),
        user: 'System',
        text: '🗳️ Waktu voting! Pilih siapa yang akan dieksekusi',
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      
      const newMessages = [...messages, systemMsg];
      setMessages(newMessages);
      await updateData(newMessages, newGameState);
      
      // Bot auto vote
      setTimeout(() => {
        gameState.players.filter(p => p.isBot && p.alive).forEach(bot => {
          botAction(bot.name, 'voting');
        });
      }, 2000);
      
    } else if (gameState.phase === 'voting') {
      // Count votes
      const voteCount = {};
      Object.values(gameState.votes).forEach(target => {
        voteCount[target] = (voteCount[target] || 0) + 1;
      });
      
      const maxVotes = Math.max(...Object.values(voteCount));
      const executed = Object.keys(voteCount).find(k => voteCount[k] === maxVotes);
      
      if (executed) {
        const player = newGameState.players.find(p => p.name === executed);
        if (player) player.alive = false;
        
        const systemMsg = {
          id: Date.now(),
          user: 'System',
          text: `⚰️ ${executed} dieksekusi! Role: ${gameState.roles[executed]}`,
          timestamp: new Date().toISOString(),
          type: 'system'
        };
        
        const newMessages = [...messages, systemMsg];
        setMessages(newMessages);
        await updateData(newMessages, newGameState);
      }
      
      newGameState.phase = 'night';
      newGameState.day += 1;
      newGameState.votes = {};
      newGameState.actions = {};
    }
    
    setGameState(newGameState);
  };

  const getRoleEmoji = (role) => {
    const emojis = { werewolf: '🐺', seer: '🔮', guard: '🛡️', villager: '👤' };
    return emojis[role] || '👤';
  };

  const getRoleColor = (role) => {
    const colors = { werewolf: 'text-red-600', seer: 'text-purple-600', guard: 'text-blue-600', villager: 'text-gray-600' };
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
            <button onClick={() => setShowTutorial(!showTutorial)} className="p-2 border-2 border-black hover:bg-black hover:text-white">
              <Info className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="font-bold">{gameState.players.length}</span>
            </div>
            {gameState.phase === 'night' && <Moon className="w-5 h-5" />}
            {gameState.phase === 'day' && <Sun className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-4 border-black p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">📖 CARA MAIN</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold">🐺 WEREWOLF (Serigala)</h3>
                <p>Bunuh warga setiap malam. Menang jika jumlah = warga</p>
              </div>
              <div>
                <h3 className="font-bold">🔮 SEER (Peramal)</h3>
                <p>Lihat role pemain setiap malam. Bantu warga cari werewolf</p>
              </div>
              <div>
                <h3 className="font-bold">🛡️ GUARD (Penjaga)</h3>
                <p>Lindungi 1 pemain setiap malam dari serangan werewolf</p>
              </div>
              <div>
                <h3 className="font-bold">👤 VILLAGER (Warga)</h3>
                <p>Diskusi dan vote untuk cari werewolf</p>
              </div>
            </div>
            <button onClick={() => setShowTutorial(false)} className="w-full mt-6 bg-black text-white py-3 font-bold">
              MENGERTI!
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <div className="w-64 border-r-2 border-black p-4 hidden md:block overflow-y-auto">
          <div className="mb-6">
            <h3 className="font-bold mb-3 text-lg border-b-2 border-black pb-2">PLAYERS</h3>
            <div className="space-y-2">
              {gameState.players.map((player, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 border border-black">
                  <span className="font-medium text-sm">{player.name} {player.isBot && '🤖'}</span>
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
                <div className={`text-xl font-bold uppercase ${getRoleColor(myRole)}`}>{myRole}</div>
              </div>
            </div>
          )}

          {gameState.phase === 'lobby' && (
            <div className="space-y-2">
              <button onClick={addBot} className="w-full bg-white border-2 border-black py-2 font-bold hover:bg-gray-100 flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" /> ADD BOT
              </button>
              <button 
                onClick={handleReady} 
                className={`w-full py-3 font-bold ${gameState.readyPlayers.includes(username) ? 'bg-green-500 text-white' : 'bg-black text-white hover:bg-gray-800'}`}
                disabled={gameState.readyPlayers.includes(username)}
              >
                {gameState.readyPlayers.includes(username) ? '✅ READY' : 'SIAP MAIN'}
              </button>
              <p className="text-xs text-center text-gray-600">
                {gameState.readyPlayers.length}/{gameState.players.length} siap
              </p>
            </div>
          )}

          {gameState.phase === 'night' && myRole && myRole !== 'villager' && (
            <div>
              <h3 className="font-bold mb-3 text-lg border-b-2 border-black pb-2">SKILL TARGET</h3>
              <div className="space-y-2">
                {gameState.players.filter(p => p.alive && p.name !== username).map((player, idx) => (
                  <button
                    key={idx}
                    onClick={() => useSkill(player.name)}
                    className="w-full p-2 border-2 border-black hover:bg-black hover:text-white transition-colors text-sm"
                    disabled={gameState.actions[username]}
                  >
                    {myRole === 'werewolf' && <Swords className="w-4 h-4 inline mr-1" />}
                    {myRole === 'seer' && <Eye className="w-4 h-4 inline mr-1" />}
                    {myRole === 'guard' && <Shield className="w-4 h-4 inline mr-1" />}
                    {player.name}
                  </button>
                ))}
              </div>
              {gameState.actions[username] && (
                <p className="mt-2 text-xs text-green-600 text-center">✅ Skill digunakan!</p>
              )}
            </div>
          )}

          {gameState.phase === 'voting' && (
            <div>
              <h3 className="font-bold mb-3 text-lg border-b-2 border-black pb-2">VOTE</h3>
              <div className="space-y-2">
                {gameState.players.filter(p => p.alive && p.name !== username).map((player, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleVote(player.name)}
                    className="w-full p-2 border-2 border-black hover:bg-black hover:text-white transition-colors text-sm"
                    disabled={gameState.votes[username]}
                  >
                    {player.name}
                  </button>
                ))}
              </div>
              {gameState.votes[username] && (
                <p className="mt-2 text-xs text-green-600 text-center">✅ Vote diberikan!</p>
              )}
            </div>
          )}

          {(gameState.phase === 'day' || gameState.phase === 'voting' || gameState.phase === 'night') && (
            <button onClick={nextPhase} className="w-full mt-4 bg-yellow-400 border-2 border-black py-3 font-bold hover:bg-yellow-500">
              ⏭️ NEXT PHASE
            </button>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${msg.type === 'system' ? 'text-center' : msg.user === username ? 'flex justify-end' : 'flex justify-start'}`}
              >
                {msg.type === 'system' ? (
                  <div className="bg-gray-100 border border-black px-4 py-2 inline-block">
                    <p className="text-sm font-medium">{msg.text}</p>
                  </div>
                ) : (
                  <div className={`max-w-xs lg:max-w-md ${msg.user === username ? 'bg-black text-white' : 'bg-white border-2 border-black'} p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{msg.user}</span>
                      <span className="text-xs opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="break-words">{msg.text}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

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
              <button onClick={sendMessage} className="bg-black text-white px-6 py-3 hover:bg-gray-800 transition-colors">
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