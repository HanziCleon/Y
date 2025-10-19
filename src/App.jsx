import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Moon, Sun, Skull, Swords, Eye, Shield, Info, UserPlus, Play, Brain, Clock, MessageCircle } from 'lucide-react';

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
  const [showNotification, setShowNotification] = useState(null);
  const messagesEndRef = useRef(null);
  const timerInterval = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Restore dari localStorage
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

  // Auto-save
  useEffect(() => {
    if (isLoggedIn && username) {
      localStorage.setItem('werewolf_username', username);
      localStorage.setItem('werewolf_gamestate', JSON.stringify(gameState));
      localStorage.setItem('werewolf_messages', JSON.stringify(messages));
      if (myRole) localStorage.setItem('werewolf_role', myRole);
    }
  }, [gameState, messages, isLoggedIn, username, myRole]);

  const showNotif = (text, type = 'info') => {
    setShowNotification({ text, type });
    setTimeout(() => setShowNotification(null), 3000);
  };

  const storyMessages = {
    lobbyStart: "🎭 Selamat datang di desa Moonbrook yang mistis. Malam ini, gelap gulita meracuni udara. Seseorang di antara kalian bukan manusia biasa...",
    nightStart: "🌙 Malam telah tiba. Para werewolf membuka matanya dengan napas berat, siap berburu. Sementara itu, para warga tidur dengan gelisah, merasakan sesuatu yang tidak beres.",
    dayStart: (deaths) => deaths.length > 0 ? `☀️ Fajar tiba. Warga desa terbangun dengan horor - ${deaths.join(', ')} telah terbunuh! Jejak daging berlumur darah tertinggal di tempat tidur mereka.` : "☀️ Fajar tiba dengan mulus. Tidak ada korban malam ini... atau apakah pembunuh itu disembunyikan oleh seseorang?",
    votingStart: "🗳️ Warga berkumpul di balai desa. Kepercayaan telah runtuh. Kalian memiliki 90 detik untuk menentukan siapa yang akan dieksekusi. Siapa yang Anda yakini adalah pembunuh?",
    werewolfWin: "🎉 WEREWOLF MENANG! Mereka telah memusnahkan semua warga. Desa Moonbrook jatuh ke kegelapan selamanya...",
    villageWin: "🎉 WARGA MENANG! Semua werewolf telah dibasmi! Desa Moonbrook selamat... untuk kali ini."
  };

  const storyEvents = [
    "🌫️ Angin dingin meniup, membawa bau kejadian buruk...",
    "🌙 Bulan purnama bersinar menerangi desa yang sunyi...",
    "🕷️ Suara jangkrik terdengar dari kejauhan, menciptakan ketegangan...",
    "👻 Seseorang mendengar langkah kaki di rumahnya sendiri...",
    "🔥 Api di rumah tetangga menyala tiba-tiba tanpa sebab...",
    "💀 Nisan lama di makam tua tampak tergali habis...",
    "🐺 Terdengar auman yang mengerikan dari hutan...",
    "👁️ Bayangan aneh terlihat melintas di jendela malam ini...",
    "⛓️ Rantai pintu rumah warga bergerak sendiri...",
    "🌑 Kegelapan semakin dalam, cahaya lilin mulai redup...",
    "🕸️ Sarang laba-laba aneh muncul di setiap sudut desa...",
    "🔔 Bel gereja berbunyi misterius tanpa ada yang menariknya...",
  ];

  const botDebateTopics = [
    { topic: "Siapa yang paling mencurigakan?", responses: ["Dia terlalu diam", "Ekspresinya aneh", "Dia berbicara terlalu banyak", "Dia tidak bergerak"] },
    { topic: "Apakah werewolf butuh strategi khusus?", responses: ["Mereka pasti bekerja bersama", "Satu werewolf bisa sangat berbahaya", "Mereka pasti terkoordinasi", "Kita harus fokus pada yang kasar"] },
    { topic: "Siapa yang bisa dipercaya?", responses: ["Orangnya yang bersikap natural", "Yang berbicara jujur", "Kita harus lihat tindakan mereka", "Tidak ada yang bisa dipercaya"] }
  ];

  const trivia = [
    "💡 Werewolf berhasil menang 60% lebih sering jika mereka terkoordinasi dengan baik!",
    "💡 Seer adalah role paling penting dalam permainan karena informasi.",
    "💡 Guardian bisa mengubah hasil permainan dengan strategi proteksi yang tepat.",
    "💡 Voting dalam 30 detik pertama biasanya random - diskusi matang lebih efektif!",
    "💡 Warga yang diam biasanya mencurigakan, tapi bisa jadi mereka strategic.",
    "💡 Konspirasi antar werewolf sering ketahuan dari pola voting mereka!",
    "💡 Perubahan perilaku pemain adalah indikator terkuat mereka memiliki role.",
    "💡 Seer harus selektif cek siapa - jangan boros pengecekan awal!"
  ];

  const interactiveMessages = [
    { type: "story_event", content: "🌙 Sesuatu yang aneh terjadi di desa..." },
    { type: "town_reaction", content: "👥 Warga mulai berdiskusi tentang situasi..." },
    { type: "mystery", content: "❓ Misteri siapa pembunuhnya semakin dalam..." }
  ];

  const botAIChat = (phase, gameStateData) => {
    const alivePlayers = gameStateData.players.filter(p => p.alive && p.isBot);
    if (alivePlayers.length === 0) return;

    setTimeout(() => {
      const botPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      const botRole = gameStateData.roles[botPlayer.name];
      let botMessage = '';

      if (phase === 'day') {
        const suspiciousPlayers = gameStateData.players.filter(p => p.alive && p.name !== botPlayer.name);
        const target = suspiciousPlayers[Math.floor(Math.random() * suspiciousPlayers.length)];
        const messages = [
          `Hmm, aku curiga ${target.name}... ada yang aneh dengannya.`,
          `Tunggu, siapa yang pergi ke rumah ${target.name} tadi malam?`,
          `${target.name} terlalu diam. Itu mencurigakan...`,
          `Aku merasa ${target.name} menyembunyikan sesuatu.`,
          `Lihat cara ${target.name} berbicara. Seperti berbohong...`
        ];
        botMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (phase === 'voting') {
        const messages = [
          `Aku akan memilih berdasarkan kepercayaan... ${botPlayer.name} membuat keputusan.`,
          `Ini adalah momen yang menentukan. Aku harus membuat pilihan yang tepat.`,
          `Semoga keputusanku benar. Nyawa kita tergantung pada ini.`
        ];
        botMessage = messages[Math.floor(Math.random() * messages.length)];
      } else if (phase === 'night' && botRole !== 'villager') {
        const messages = [
          `${botRole === 'werewolf' ? '🐺' : botRole === 'seer' ? '🔮' : '🛡️'} Saatnya untuk beraksi...`,
          `Aku akan menggunakan kekuatan saya dengan bijak.`,
          `Malam ini sangat penting bagi keselamatan kita.`
        ];
        botMessage = messages[Math.floor(Math.random() * messages.length)];
      }

      if (botMessage) {
        const newMsg = {
          id: Date.now(),
          user: botPlayer.name,
          text: botMessage,
          timestamp: new Date().toISOString(),
          type: 'chat'
        };
        setMessages(prev => [...prev, newMsg]);
      }
    }, 2000 + Math.random() * 3000);
  };

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
      showNotif('Semua bot sudah masuk!', 'error');
      return;
    }

    const botName = availableNames[0];
    const newPlayers = [...gameState.players, { name: botName, alive: true, isBot: true }];
    const newGameState = { ...gameState, players: newPlayers };
    
    const systemMsg = {
      id: Date.now(),
      user: 'System',
      text: `🤖 ${botName} bergabung dengan cerita...`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    setMessages([...messages, systemMsg]);
    setGameState(newGameState);
    showNotif(`${botName} ditambahkan!`, 'success');
  };

  const handleLogin = () => {
    if (username.trim()) {
      setIsLoggedIn(true);
      
      const newPlayers = [...gameState.players];
      if (!newPlayers.find(p => p.name === username)) {
        newPlayers.push({ name: username, alive: true, isBot: false });
      }
      const newGameState = { ...gameState, players: newPlayers };
      
      const systemMsg = {
        id: Date.now(),
        user: 'System',
        text: storyMessages.lobbyStart,
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      
      setMessages([...messages, systemMsg]);
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
      showNotif('Minimal 4 pemain untuk memulai!', 'error');
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
      text: storyMessages.nightStart,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    setMessages([...messages, systemMsg]);
    setGameState(newGameState);
    setSidebarOpen(false);
    setTimeout(() => botAIChat('night', newGameState), 1000);
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
      text: `🗳️ ${username} telah memberikan vote untuk ${targetPlayer}`,
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
      
      newMessages.push({
        id: Date.now(),
        user: 'System',
        text: storyMessages.dayStart(deaths),
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
        setTimeout(() => botAIChat('day', newGameState), 1000);
      }
      
    } else if (gameState.phase === 'day') {
      newGameState.phase = 'voting';
      newGameState.votes = {};
      
      newMessages.push({
        id: Date.now(),
        user: 'System',
        text: storyMessages.votingStart,
        timestamp: new Date().toISOString(),
        type: 'system'
      });

      for (const bot of gameState.players.filter(p => p.isBot && p.alive)) {
        newGameState = smartBotAction(bot.name, 'voting', newGameState);
      }

      newGameState.gameTimer = 90;
      setTimeout(() => botAIChat('voting', newGameState), 1000);
      
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
            text: `⚰️ ${executed} dieksekusi! Mereka adalah... ${gameState.roles[executed]} ${getRoleEmoji(gameState.roles[executed])}`,
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
        setTimeout(() => botAIChat('night', newGameState), 1000);
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
      return storyMessages.villageWin;
    } else if (werewolfCount >= villageCount) {
      return storyMessages.werewolfWin;
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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black border-4 border-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-black border-4 border-white p-6">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 drop-shadow-lg">🐺</div>
            <h1 className="text-4xl font-black mb-2 text-white drop-shadow-lg">WEREWOLF</h1>
            <p className="text-white text-sm font-bold">Chat & Play Interactive Story Game</p>
            <div className="mt-3 text-xs text-yellow-300 flex items-center justify-center gap-2 font-bold">
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
              className="w-full px-4 py-3 bg-gray-900 border-2 border-white text-white focus:outline-none font-bold"
            />
            <button
              onClick={handleLogin}
              className="w-full bg-red-600 border-2 border-white text-white py-3 font-black hover:bg-red-700 drop-shadow-lg"
            >
              MASUK DESA
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-b from-gray-900 to-black border-t-4 border-white flex flex-col text-white">
      {/* Notification */}
      {showNotification && (
        <div className={`fixed top-4 right-4 px-4 py-3 border-2 border-white font-bold z-40 ${showNotification.type === 'success' ? 'bg-green-600' : showNotification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
          {showNotification.text}
        </div>
      )}

      {/* Header */}
      <div className="border-b-4 border-white p-3 bg-black sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black">🐺 WEREWOLF</h1>
            <span className="text-xs text-yellow-300 font-bold">@{username}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTutorial(!showTutorial)} className="p-2 border-2 border-white hover:bg-gray-700">
              <Info className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 border-2 border-white px-2 py-1 font-bold">
              <Users className="w-4 h-4" />
              <span>{gameState.players.length}</span>
            </div>
            {gameState.isTimerRunning && (
              <div className="flex items-center gap-1 border-2 border-white px-2 py-1 font-bold bg-red-600">
                <Clock className="w-4 h-4" />
                <span>{gameState.gameTimer}s</span>
              </div>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 border-2 border-white hover:bg-gray-700 font-black">
              ☰
            </button>
          </div>
        </div>
        {gameState.phase !== 'lobby' && gameState.phase !== 'ended' && (
          <div className="mt-2 text-xs font-black text-center text-yellow-300">
            {gameState.phase === 'night' && '🌙 MALAM - Gunakan skill'}
            {gameState.phase === 'day' && '☀️ PAGI - Diskusi'}
            {gameState.phase === 'voting' && '🗳️ VOTING - Tentukan nasib'}
            {gameState.day > 0 && ` | HARI ${gameState.day}`}
          </div>
        )}
      </div>

      {/* Tutorial */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-end z-50 md:items-center md:justify-center">
          <div className="bg-black border-4 border-white p-4 w-full max-h-[80vh] overflow-y-auto md:max-w-md">
            <h2 className="text-xl font-black mb-3 text-yellow-300">📖 CARA MAIN</h2>
            <div className="space-y-3 text-sm font-bold">
              <div><h3 className="text-red-400">🐺 WEREWOLF</h3><p className="text-xs">Bunuh warga setiap malam</p></div>
              <div><h3 className="text-purple-400">🔮 SEER</h3><p className="text-xs">Lihat role pemain</p></div>
              <div><h3 className="text-blue-400">🛡️ GUARD</h3><p className="text-xs">Lindungi pemain</p></div>
              <div><h3 className="text-gray-400">👤 VILLAGER</h3><p className="text-xs">Vote cari werewolf</p></div>
            </div>
            <button onClick={() => setShowTutorial(false)} className="w-full mt-4 bg-red-600 border-2 border-white text-white py-2 font-bold hover:bg-red-700">
              CLOSE
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`fixed md:relative w-64 border-r-4 border-white bg-black overflow-y-auto transition-transform transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 z-30 h-full`}>
          <div className="p-3 space-y-3">
            <div>
              <h3 className="font-black mb-2 text-sm border-b-2 border-white pb-1 text-yellow-300">PLAYERS ({gameState.players.filter(p => !p.isObserver).length})</h3>
              <div className="space-y-1">
                {gameState.players.filter(p => !p.isObserver).map((player, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border-2 border-white bg-gray-900 text-xs font-bold">
                    <span>{player.name} {player.isBot && '🤖'}</span>
                    {!player.alive && <Skull className="w-3 h-3" />}
                  </div>
                ))}
              </div>
            </div>

            {gameState.players.some(p => p.isObserver) && (
              <div>
                <h3 className="font-black mb-2 text-sm border-b-2 border-white pb-1 text-yellow-300">👁️ OBSERVER ({gameState.players.filter(p => p.isObserver).length})</h3>
                <div className="space-y-1">
                  {gameState.players.filter(p => p.isObserver).map((player, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border-2 border-white bg-gray-800 text-xs font-bold">
                      <span>{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myRole && (
              <div>
                <h3 className="font-black mb-2 text-sm border-b-2 border-white pb-1 text-yellow-300">YOUR ROLE</h3>
                <div className="border-4 border-white p-4 text-center bg-gray-900">
                  <div className="text-4xl mb-2">{getRoleEmoji(myRole)}</div>
                  <div className={`text-sm font-black uppercase ${getRoleColor(myRole)}`}>{myRole}</div>
                </div>
              </div>
            )}

            {gameState.phase === 'lobby' && (
              <div className="space-y-2">
                <button onClick={addBot} className="w-full bg-gray-900 border-2 border-white py-2 font-black hover:bg-gray-700 text-xs">
                  ADD BOT
                </button>
                <button 
                  onClick={handleReady} 
                  className={`w-full py-2 font-black border-2 border-white text-xs ${gameState.readyPlayers.includes(username) ? 'bg-green-600' : 'bg-gray-900 hover:bg-gray-700'}`}
                  disabled={gameState.readyPlayers.includes(username)}
                >
                  {gameState.readyPlayers.includes(username) ? '✅ READY' : 'READY'}
                </button>
                <button 
                  onClick={startGame} 
                  className="w-full bg-red-600 border-2 border-white py-2 font-black hover:bg-red-700 text-xs disabled:bg-gray-600"
                  disabled={gameState.players.length < 4}
                >
                  START
                </button>
                <p className="text-xs text-center text-yellow-300 font-bold">{gameState.readyPlayers.length}/{gameState.players.length} ready</p>
              </div>
            )}

            {gameState.phase === 'night' && myRole && myRole !== 'villager' && !gameState.players.find(p => p.name === username)?.isObserver && (
              <div>
                <h3 className="font-black mb-2 text-sm border-b-2 border-white pb-1 text-yellow-300">SKILL</h3>
                <div className="space-y-1">
                  {gameState.players.filter(p => p.alive && p.name !== username && !p.isObserver).map((player, idx) => (
                    <button
                      key={idx}
                      onClick={() => useSkill(player.name)}
                      className="w-full p-2 border-2 border-white bg-gray-900 hover:bg-gray-700 text-xs font-bold disabled:bg-gray-800"
                      disabled={gameState.actions[username]}
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
                {gameState.actions[username] && <p className="mt-1 text-xs text-green-400 text-center font-bold">✅ Done!</p>}
              </div>
            )}

            {gameState.phase === 'voting' && !gameState.players.find(p => p.name === username)?.isObserver && (
              <div>
                <h3 className="font-black mb-2 text-sm border-b-2 border-white pb-1 text-yellow-300">VOTE</h3>
                <div className="space-y-1">
                  {gameState.players.filter(p => p.alive && p.name !== username && !p.isObserver).map((player, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleVote(player.name)}
                      className="w-full p-2 border-2 border-white bg-gray-900 hover:bg-gray-700 text-xs font-bold disabled:bg-gray-800"
                      disabled={gameState.votes[username]}
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
                {gameState.votes[username] && <p className="mt-1 text-xs text-green-400 text-center font-bold">✅ Voted!</p>}
              </div>
            )}

            {gameState.players.find(p => p.name === username)?.isObserver && (
              <div className="border-2 border-white p-3 bg-gray-900 text-xs font-bold">
                <p className="mb-1">👁️ OBSERVER MODE</p>
                <p className="text-gray-300">Kamu bisa chat dan lihat permainan.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-gray-900 to-black">
            {messages.map((msg) => (
              <div key={msg.id} className={`${msg.type === 'system' ? 'flex justify-center' : msg.user === username ? 'flex justify-end' : 'flex justify-start'}`}>
                {msg.type === 'system' ? (
                  <div className="bg-yellow-900 border-2 border-yellow-400 px-4 py-2 inline-block max-w-md rounded-lg">
                    <p className="text-sm font-bold text-white">{msg.text}</p>
                  </div>
                ) : (
                  <div className={`max-w-xs ${msg.user === username ? 'bg-red-600 border-2 border-red-400' : 'bg-gray-800 border-2 border-white'} p-3 rounded-lg`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-sm">{msg.user}</span>
                      {gameState.players.find(p => p.name === msg.user)?.isBot && <span className="text-xs">🤖</span>}
                      <span className="text-xs text-gray-300">{new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="break-words text-white text-sm font-semibold">{msg.text}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t-4 border-white p-3 bg-black">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Pesan..."
                className="flex-1 px-4 py-3 bg-gray-900 border-2 border-white text-white focus:outline-none font-bold"
              />
              <button onClick={sendMessage} className="bg-red-600 border-2 border-white text-white px-4 py-3 hover:bg-red-700 font-black">
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