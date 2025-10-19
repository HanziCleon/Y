import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Moon, Sun, Skull, Swords, Eye, Shield, Info, UserPlus, Play, Brain, Clock } from 'lucide-react';

const WerewolfChatGame = () => {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
    readyPlayers: [],
    gameTimer: 90,
    isTimerRunning: false
  });
  const [myRole, setMyRole] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const messagesEndRef = useRef(null);
  const timerInterval = useRef(null);

  // Restore game dari localStorage saat mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('werewolf_username');
    const savedGameState = localStorage.getItem('werewolf_gamestate');
    const savedMessages = localStorage.getItem('werewolf_messages');
    const savedRole = localStorage.getItem('werewolf_role');

    if (savedUsername && savedGameState && savedGameState !== '{}') {
      setUsername(savedUsername);
      setIsLoggedIn(true);
      setGameState(JSON.parse(savedGameState));
      setMessages(JSON.parse(savedMessages || '[]'));
      if (savedRole) setMyRole(savedRole);
    }
  }, []);

  // Auto-save game state ke localStorage
  useEffect(() => {
    if (isLoggedIn && username) {
      localStorage.setItem('werewolf_username', username);
      localStorage.setItem('werewolf_gamestate', JSON.stringify(gameState));
      localStorage.setItem('werewolf_messages', JSON.stringify(messages));
      if (myRole) localStorage.setItem('werewolf_role', myRole);
    }
  }, [gameState, messages, isLoggedIn, username, myRole]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const smartBotAction = (botName, phase, currentGameState) => {
    const role = currentGameState.roles[botName];
    const alivePlayers = currentGameState.players.filter(p => p.alive && p.name !== botName);
    
    if (alivePlayers.length === 0) return currentGameState;

    let target;

    if (phase === 'night') {
      if (role === 'werewolf') {
        target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      } else if (role === 'seer') {
        const unknownPlayers = alivePlayers.filter(p => !currentGameState.actions[`seer_${botName}_checked_${p.name}`]);
        target = unknownPlayers.length > 0 ? unknownPlayers[Math.floor(Math.random() * unknownPlayers.length)] : alivePlayers[0];
      } else if (role === 'guard') {
        target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      }

      if (target) {
        const newActions = { ...currentGameState.actions };
        newActions[botName] = target.name;
        return { ...currentGameState, actions: newActions };
      }
    } else if (phase === 'voting') {
      const nonBotPlayers = alivePlayers.filter(p => !p.isBot);
      target = nonBotPlayers.length > 0 ? nonBotPlayers[Math.floor(Math.random() * nonBotPlayers.length)] : alivePlayers[0];

      if (target) {
        const newVotes = { ...currentGameState.votes };
        newVotes[botName] = target.name;
        return { ...currentGameState, votes: newVotes };
      }
    }
    
    return currentGameState;
  };

  const resetGameAfterWin = () => {
    setGameState({
      players: gameState.players.map(p => ({ ...p, alive: true })),
      phase: 'lobby',
      roles: {},
      votes: {},
      actions: {},
      deaths: [],
      protected: [],
      day: 0,
      readyPlayers: [],
      gameTimer: 90,
      isTimerRunning: false
    });
    setMessages([]);
    setMyRole(null);
    localStorage.removeItem('werewolf_gamestate');
    localStorage.removeItem('werewolf_messages');
    localStorage.removeItem('werewolf_role');
  };

  const addBot = () => {
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
      text: `🤖 ${botName} (BOT AI) bergabung ke room`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    setMessages([...messages, systemMsg]);
    setGameState(newGameState);
  };

  const handleLogin = () => {
    if (username.trim()) {
      setIsLoggedIn(true);
      
      const newPlayers = [...gameState.players];
      const playerExists = newPlayers.find(p => p.name === username);
      
      if (!playerExists) {
        // Jika game sudah dimulai, pemain baru hanya bisa observe/chat
        if (gameState.phase !== 'lobby') {
          newPlayers.push({ name: username, alive: false, isBot: false, isObserver: true });
          const systemMsg = {
            id: Date.now(),
            user: 'System',
            text: `👤 ${username} bergabung sebagai OBSERVER (game sudah dimulai)`,
            timestamp: new Date().toISOString(),
            type: 'system'
          };
          setMessages([...messages, systemMsg]);
        } else {
          // Jika di lobby, pemain bisa join normal
          newPlayers.push({ name: username, alive: true, isBot: false });
          const systemMsg = {
            id: Date.now(),
            user: 'System',
            text: `👤 ${username} bergabung ke room`,
            timestamp: new Date().toISOString(),
            type: 'system'
          };
          setMessages([...messages, systemMsg]);
        }
      }
      
      const newGameState = { ...gameState, players: newPlayers };
      setGameState(newGameState);
      localStorage.setItem('werewolf_username', username);
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
      setMessages([...messages, newMsg]);
      setInputMessage('');
    }
  };

  const handleReady = () => {
    const newReady = [...gameState.readyPlayers];
    if (!newReady.includes(username)) {
      newReady.push(username);
    }
    
    const newGameState = { ...gameState, readyPlayers: newReady };
    
    const systemMsg = {
      id: Date.now(),
      user: 'System',
      text: `✅ ${username} siap bermain (${newReady.length}/${gameState.players.length})`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    setMessages([...messages, systemMsg]);
    setGameState(newGameState);
  };

  const startGame = () => {
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

    let newGameState = {
      ...gameState,
      phase: 'night',
      roles: playerRoles,
      day: 1,
      actions: {},
      votes: {},
      readyPlayers: [],
      gameTimer: 90,
      isTimerRunning: true
    };

    for (const player of gameState.players.filter(p => p.isBot)) {
      newGameState = smartBotAction(player.name, 'night', newGameState);
    }

    if (playerRoles[username]) {
      setMyRole(playerRoles[username]);
    }

    const systemMsg = {
      id: Date.now(),
      user: 'System',
      text: '🌙 Game dimulai! Malam hari tiba. Periksa role Anda dan gunakan skill!',
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    setMessages([...messages, systemMsg]);
    setGameState(newGameState);
    setSidebarOpen(false);
  };

  useEffect(() => {
    if (gameState.isTimerRunning && gameState.gameTimer > 0) {
      timerInterval.current = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          gameTimer: prev.gameTimer - 1
        }));
      }, 1000);
    } else if (gameState.gameTimer === 0 && gameState.isTimerRunning && gameState.phase !== 'lobby') {
      clearTimeout(timerInterval.current);
      nextPhase();
    }

    return () => clearTimeout(timerInterval.current);
  }, [gameState.gameTimer, gameState.isTimerRunning, gameState.phase]);

  const useSkill = (targetName) => {
    const newActions = { ...gameState.actions };
    newActions[username] = targetName;
    
    let skillText = '';
    if (myRole === 'werewolf') skillText = `🐺 Kamu memilih ${targetName} untuk dibunuh`;
    else if (myRole === 'seer') skillText = `🔮 Kamu melihat ${targetName} adalah ${gameState.roles[targetName]}`;
    else if (myRole === 'guard') skillText = `🛡️ Kamu melindungi ${targetName}`;
    
    alert(skillText);
    setGameState({ ...gameState, actions: newActions });
  };

  const handleVote = (targetPlayer) => {
    const newVotes = { ...gameState.votes };
    newVotes[username] = targetPlayer;
    
    const voteMsg = {
      id: Date.now(),
      user: 'System',
      text: `🗳️ ${username} telah memberikan vote`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    setMessages([...messages, voteMsg]);
    setGameState({ ...gameState, votes: newVotes });
  };

  const nextPhase = () => {
    let newGameState = { ...gameState };
    let newMessages = [...messages];
    
    if (gameState.phase === 'night') {
      const deaths = [];
      const protectedPlayers = new Set();
      
      Object.entries(gameState.actions).forEach(([player, target]) => {
        const role = gameState.roles[player];
        if (role === 'guard') {
          protectedPlayers.add(target);
        }
      });

      Object.entries(gameState.actions).forEach(([player, target]) => {
        const role = gameState.roles[player];
        if (role === 'werewolf' && !protectedPlayers.has(target)) {
          deaths.push(target);
        }
      });

      newGameState.phase = 'day';
      newGameState.deaths = deaths;
      newGameState.protected = Array.from(protectedPlayers);
      newGameState.actions = {};
      
      deaths.forEach(name => {
        const player = newGameState.players.find(p => p.name === name);
        if (player) player.alive = false;
      });
      
      const deathText = deaths.length > 0 
        ? `☠️ ${deaths.join(', ')} terbunuh malam ini!` 
        : '✅ Tidak ada korban malam ini';
      
      newMessages.push({
        id: Date.now(),
        user: 'System',
        text: `☀️ Pagi tiba! ${deathText}`,
        timestamp: new Date().toISOString(),
        type: 'system'
      });

      const winState = checkWinCondition(newGameState);
      if (winState) {
        newMessages.push({
          id: Date.now(),
          user: 'System',
          text: winState,
          timestamp: new Date().toISOString(),
          type: 'system'
        });
        newMessages.push({
          id: Date.now() + 1,
          user: 'System',
          text: '⏳ Chat akan direset dalam 5 detik...',
          timestamp: new Date().toISOString(),
          type: 'system'
        });
        newGameState.phase = 'ended';
        newGameState.isTimerRunning = false;
        setTimeout(() => {
          resetGameAfterWin();
        }, 5000);
      } else {
        newGameState.gameTimer = 90;
      }
      
    } else if (gameState.phase === 'day') {
      newGameState.phase = 'voting';
      newGameState.votes = {};
      
      newMessages.push({
        id: Date.now(),
        user: 'System',
        text: '🗳️ Waktu voting! Pilih siapa yang akan dieksekusi',
        timestamp: new Date().toISOString(),
        type: 'system'
      });

      for (const bot of gameState.players.filter(p => p.isBot && p.alive)) {
        newGameState = smartBotAction(bot.name, 'voting', newGameState);
      }

      newGameState.gameTimer = 90;
      
    } else if (gameState.phase === 'voting') {
      const voteCount = {};
      Object.values(gameState.votes).forEach(target => {
        voteCount[target] = (voteCount[target] || 0) + 1;
      });
      
      if (Object.keys(voteCount).length > 0) {
        const maxVotes = Math.max(...Object.values(voteCount));
        const executed = Object.keys(voteCount).find(k => voteCount[k] === maxVotes);
        
        if (executed) {
          const player = newGameState.players.find(p => p.name === executed);
          if (player) player.alive = false;
          
          newMessages.push({
            id: Date.now(),
            user: 'System',
            text: `⚰️ ${executed} dieksekusi! Role: ${gameState.roles[executed]}`,
            timestamp: new Date().toISOString(),
            type: 'system'
          });
        }
      }
      
      newGameState.phase = 'night';
      newGameState.day += 1;
      newGameState.votes = {};
      newGameState.actions = {};

      const winState = checkWinCondition(newGameState);
      if (winState) {
        newMessages.push({
          id: Date.now(),
          user: 'System',
          text: winState,
          timestamp: new Date().toISOString(),
          type: 'system'
        });
        newMessages.push({
          id: Date.now() + 1,
          user: 'System',
          text: '⏳ Chat akan direset dalam 5 detik...',
          timestamp: new Date().toISOString(),
          type: 'system'
        });
        newGameState.phase = 'ended';
        newGameState.isTimerRunning = false;
        setTimeout(() => {
          resetGameAfterWin();
        }, 5000);
      } else {
        for (const bot of newGameState.players.filter(p => p.isBot && p.alive)) {
          newGameState = smartBotAction(bot.name, 'night', newGameState);
        }
        newGameState.gameTimer = 90;
      }
    }
    
    setMessages(newMessages);
    setGameState(newGameState);
  };

  const checkWinCondition = (state) => {
    let werewolfCount = 0;
    let villageCount = 0;

    state.players.forEach(p => {
      if (p.alive) {
        const role = state.roles[p.name];
        if (role === 'werewolf') werewolfCount++;
        else villageCount++;
      }
    });

    if (werewolfCount === 0) {
      return '🎉 KEMENANGAN WARGA! Semua werewolf telah dieliminasi!';
    } else if (werewolfCount >= villageCount) {
      return '🎉 KEMENANGAN WEREWOLF! Werewolf sudah mengambil alih desa!';
    }

    return null;
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
      <div className="min-h-screen bg-white border-4 border-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border-4 border-black p-6">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🐺</div>
            <h1 className="text-3xl font-bold mb-2 text-black">WEREWOLF</h1>
            <p className="text-black text-sm">Chat & Play Game</p>
            <div className="mt-2 text-xs text-black flex items-center justify-center gap-2">
              <Brain className="w-4 h-4" />
              <span>Smart AI Bots</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Username..."
              className="w-full px-4 py-3 bg-white border-2 border-black text-black focus:outline-none text-sm"
            />
            <button
              onClick={handleLogin}
              className="w-full bg-white border-2 border-black text-black py-3 font-bold hover:bg-gray-100 text-sm"
            >
              JOIN ROOM
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white border-t-4 border-black flex flex-col text-black">
      {/* Header */}
      <div className="border-b-4 border-black p-3 bg-white sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold">🐺 WEREWOLF</h1>
            <span className="text-xs text-gray-600">@{username}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTutorial(!showTutorial)} className="p-2 border-2 border-black hover:bg-gray-100 text-sm">
              <Info className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 border-2 border-black px-2 py-1">
              <Users className="w-4 h-4" />
              <span className="font-bold text-sm">{gameState.players.length}</span>
            </div>
            {gameState.isTimerRunning && (
              <div className="flex items-center gap-1 border-2 border-black px-2 py-1">
                <Clock className="w-4 h-4" />
                <span className="font-bold text-sm">{gameState.gameTimer}s</span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 border-2 border-black hover:bg-gray-100"
            >
              ☰
            </button>
          </div>
        </div>
        {gameState.phase !== 'lobby' && gameState.phase !== 'ended' && (
          <div className="mt-2 text-xs font-bold text-center text-black">
            {gameState.phase === 'night' && '🌙 MALAM - Gunakan skill Anda'}
            {gameState.phase === 'day' && '☀️ PAGI - Diskusi pemain'}
            {gameState.phase === 'voting' && '🗳️ VOTING - Pilih korban'}
            {gameState.day > 0 && ` | HARI ${gameState.day}`}
          </div>
        )}
      </div>

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50 md:items-center md:justify-center">
          <div className="bg-white border-4 border-black p-4 w-full max-h-[80vh] overflow-y-auto md:max-w-md">
            <h2 className="text-xl font-bold mb-3 text-black">📖 CARA MAIN</h2>
            <div className="space-y-3 text-sm">
              <div><h3 className="font-bold">🐺 WEREWOLF</h3><p className="text-xs">Bunuh warga setiap malam</p></div>
              <div><h3 className="font-bold">🔮 SEER</h3><p className="text-xs">Lihat role pemain</p></div>
              <div><h3 className="font-bold">🛡️ GUARD</h3><p className="text-xs">Lindungi pemain</p></div>
              <div><h3 className="font-bold">👤 VILLAGER</h3><p className="text-xs">Vote cari werewolf</p></div>
            </div>
            <button onClick={() => setShowTutorial(false)} className="w-full mt-4 bg-white border-2 border-black text-black py-2 font-bold hover:bg-gray-100 text-sm">
              CLOSE
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Mobile Drawer */}
        <div className={`fixed md:relative w-64 border-r-4 border-black bg-white overflow-y-auto transition-transform transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 z-30 h-full`}>
          <div className="p-3 space-y-3">
            {/* Players */}
            <div>
              <h3 className="font-bold mb-2 text-sm border-b-2 border-black pb-1">PLAYERS</h3>
              <div className="space-y-1">
                {gameState.players.map((player, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border-2 border-black bg-white text-xs">
                    <span>{player.name} {player.isBot && '🤖'}</span>
                    {!player.alive && <Skull className="w-3 h-3" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Role */}
            {myRole && (
              <div>
                <h3 className="font-bold mb-2 text-sm border-b-2 border-black pb-1">YOUR ROLE</h3>
                <div className="border-4 border-black p-3 text-center bg-white">
                  <div className="text-3xl mb-1">{getRoleEmoji(myRole)}</div>
                  <div className={`text-sm font-bold uppercase ${getRoleColor(myRole)}`}>{myRole}</div>
                </div>
              </div>
            )}

            {/* Lobby Controls */}
            {gameState.phase === 'lobby' && (
              <div className="space-y-2">
                <button onClick={addBot} className="w-full bg-white border-2 border-black py-2 font-bold hover:bg-gray-100 text-xs">
                  ADD BOT
                </button>
                <button 
                  onClick={handleReady} 
                  className={`w-full py-2 font-bold border-2 border-black text-xs ${gameState.readyPlayers.includes(username) ? 'bg-gray-300' : 'bg-white hover:bg-gray-100'}`}
                  disabled={gameState.readyPlayers.includes(username)}
                >
                  {gameState.readyPlayers.includes(username) ? '✅ READY' : 'READY'}
                </button>
                <button 
                  onClick={startGame} 
                  className="w-full bg-white border-2 border-black py-2 font-bold hover:bg-gray-100 text-xs disabled:bg-gray-200"
                  disabled={gameState.players.length < 4}
                >
                  START
                </button>
                <p className="text-xs text-center">{gameState.readyPlayers.length}/{gameState.players.length} ready</p>
              </div>
            )}

            {/* Night Skills */}
            {gameState.phase === 'night' && myRole && myRole !== 'villager' && (
              <div>
                <h3 className="font-bold mb-2 text-sm border-b-2 border-black pb-1">SKILL</h3>
                <div className="space-y-1">
                  {gameState.players.filter(p => p.alive && p.name !== username).map((player, idx) => (
                    <button
                      key={idx}
                      onClick={() => useSkill(player.name)}
                      className="w-full p-2 border-2 border-black bg-white hover:bg-gray-100 text-xs font-bold disabled:bg-gray-200"
                      disabled={gameState.actions[username]}
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
                {gameState.actions[username] && <p className="mt-1 text-xs text-black text-center font-bold">✅ Done!</p>}
              </div>
            )}

            {/* Voting */}
            {gameState.phase === 'voting' && (
              <div>
                <h3 className="font-bold mb-2 text-sm border-b-2 border-black pb-1">VOTE</h3>
                <div className="space-y-1">
                  {gameState.players.filter(p => p.alive && p.name !== username).map((player, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleVote(player.name)}
                      className="w-full p-2 border-2 border-black bg-white hover:bg-gray-100 text-xs font-bold disabled:bg-gray-200"
                      disabled={gameState.votes[username]}
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
                {gameState.votes[username] && <p className="mt-1 text-xs text-black text-center font-bold">✅ Voted!</p>}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
            {messages.map((msg) => (
              <div key={msg.id} className={`${msg.type === 'system' ? 'flex justify-center' : msg.user === username ? 'flex justify-end' : 'flex justify-start'}`}>
                {msg.type === 'system' ? (
                  <div className="bg-white border-2 border-black px-3 py-1 inline-block max-w-xs">
                    <p className="text-xs font-bold text-black">{msg.text}</p>
                  </div>
                ) : (
                  <div className={`max-w-xs ${msg.user === username ? 'bg-gray-200 border-2 border-black' : 'bg-white border-2 border-black'} p-2 rounded-sm`}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="font-bold text-xs">{msg.user}</span>
                      <span className="text-xs text-gray-600">{new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="break-words text-black text-sm">{msg.text}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t-4 border-black p-3 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Pesan..."
                className="flex-1 px-3 py-2 bg-white border-2 border-black text-black focus:outline-none text-sm"
              />
              <button onClick={sendMessage} className="bg-white border-2 border-black text-black px-3 py-2 hover:bg-gray-100 font-bold">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WerewolfChatGame;