import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Moon, Sun, Skull, Eye, Shield, Info, UserPlus, Play, Brain, Clock, MessageCircle, Copy, Check, LogOut, AlertCircle, Zap, Target } from 'lucide-react';

const WerewolfChatGame = () => {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
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
    isTimerRunning: false,
    suspicionLevels: {},
    botPersonalities: {}
  });
  const [myRole, setMyRole] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const messagesEndRef = useRef(null);
  const timerInterval = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const showNotif = (text, type = 'info') => {
    setShowNotification({ text, type });
    setTimeout(() => setShowNotification(null), 3000);
  };

  const storyMessages = {
    lobbyStart: "🎭 Selamat datang di desa Moonbrook yang mistis. Malam ini, gelap gulita meracuni udara. Seseorang di antara kalian bukan manusia biasa...",
    nightStart: "🌙 Malam telah tiba. Bulan purnama bersinar merah darah. Para werewolf membuka mata mereka yang menyala, napas mereka mengembun di udara dingin. Para warga tidur dengan gelisah, bermimpi buruk tentang bayangan-bayangan yang merayap...",
    dayStart: (deaths) => {
      if (deaths.length > 0) {
        const deathDescriptions = deaths.map(name => `${name} ditemukan dengan luka cakaran mengerikan`).join('. ');
        return `☀️ Fajar menyingsing dengan kabut tebal. Teriakan memecah keheningan - ${deathDescriptions}! Jejak berdarah mengarah ke hutan gelap. Kepanikan menyebar di seluruh desa.`;
      }
      return "☀️ Fajar tiba dengan tenang... terlalu tenang. Tidak ada korban malam ini. Apakah werewolf sedang merencanakan sesuatu yang lebih besar? Atau ada yang melindungi dengan bijak?";
    },
    votingStart: "🗳️ Warga berkumpul di balai desa dengan ketakutan di mata mereka. Suara bisikan memenuhi ruangan. Waktu 90 detik dimulai. Kepercayaan telah runtuh. Kalian harus memutuskan - siapa yang akan mati siang ini?",
    werewolfWin: "🎉 KEMENANGAN GELAP! Para werewolf melolong kemenangan mereka ke bulan. Desa Moonbrook jatuh ke kegelapan abadi. Darah warga terakhir mengalir di jalanan batu...",
    villageWin: "🎉 CAHAYA KEMENANGAN! Werewolf terakhir berguling mati. Desa Moonbrook diselamatkan! Warga merayakan dengan air mata lega, tapi trauma akan tetap selamanya..."
  };

  const storyEvents = [
    "🌫️ Kabut tebal merayap dari hutan, membawa bisikan aneh...",
    "🌙 Bulan purnama tiba-tiba terhalang awan hitam. Kegelapan total selama 3 detik...",
    "🕷️ Ribuan laba-laba hitam keluar dari celah-celah rumah...",
    "👻 Pintu rumah tua di ujung desa terbuka sendiri dengan bunyi keras...",
    "🔥 Api unggun di pusat desa berubah warna menjadi hijau menyeramkan...",
    "💀 Suara rantai diseret terdengar dari bawah tanah...",
    "🐺 Auman serigala bergema dari berbagai arah sekaligus...",
    "👁️ Semua warga merasa diawasi dari bayangan...",
    "⛓️ Rantai gereja patah dengan bunyi keras memekakkan telinga...",
    "🌑 Kegelapan semakin pekat, cahaya lilin tidak bisa menembus...",
    "🕸️ Sarang laba-laba raksasa menutupi jendela semua rumah...",
    "🔔 Lonceng gereja berbunyi 13 kali... padahal sudah tidak ada yang menariknya 100 tahun...",
    "❄️ Udara tiba-tiba membeku, napas semua orang membeku...",
    "🩸 Tetesan darah jatuh dari langit tanpa sebab...",
    "⚡ Petir menyambar pohon tua, memperlihatkan sosok bayangan di dalamnya..."
  ];

  const botPersonalities = {
    aggressive: {
      name: 'Aggressive',
      chatStyle: ['Aku yakin dia werewolf!', 'Kita harus cepat bertindak!', 'Tidak ada waktu untuk ragu!', 'Aku sudah lihat kelakuannya!'],
      behavior: 'Cepat menuduh, dominan dalam diskusi'
    },
    analytical: {
      name: 'Analytical', 
      chatStyle: ['Mari kita analisis pola voting...', 'Berdasarkan data sebelumnya...', 'Logikanya adalah...', 'Kita perlu melihat bukti lebih dulu'],
      behavior: 'Berpikir strategis, menganalisis pola'
    },
    defensive: {
      name: 'Defensive',
      chatStyle: ['Kenapa kalian menuduhku?', 'Aku bukan werewolf!', 'Kalian salah sasaran!', 'Coba pikirkan lagi!'],
      behavior: 'Sering membela diri, takut dituduh'
    },
    quiet: {
      name: 'Quiet',
      chatStyle: ['...', 'Hmm', 'Mungkin', 'Aku setuju'],
      behavior: 'Jarang bicara, mengikuti mayoritas'
    },
    chaotic: {
      name: 'Chaotic',
      chatStyle: ['Random vote aja deh', 'Chaos is fun!', 'Siapa tau beruntung?', 'YOLO!'],
      behavior: 'Tidak terprediksi, voting random'
    }
  };

  const botNames = [
    { name: 'Shadow', personality: 'aggressive' },
    { name: 'Cipher', personality: 'analytical' },
    { name: 'Ghost', personality: 'quiet' },
    { name: 'Phoenix', personality: 'defensive' },
    { name: 'Chaos', personality: 'chaotic' },
    { name: 'Raven', personality: 'aggressive' },
    { name: 'Oracle', personality: 'analytical' },
    { name: 'Whisper', personality: 'quiet' }
  ];

  const advancedBotChat = (botName, phase, currentGameState) => {
    const personality = currentGameState.botPersonalities[botName];
    const role = currentGameState.roles[botName];
    const suspicionData = currentGameState.suspicionLevels || {};
    
    let message = '';
    
    if (phase === 'day') {
      const alivePlayers = currentGameState.players.filter(p => p.alive && p.name !== botName);
      
      if (personality === 'analytical') {
        const topSuspect = Object.entries(suspicionData)
          .filter(([name]) => alivePlayers.find(p => p.name === name))
          .sort((a, b) => b[1] - a[1])[0];
        
        if (topSuspect) {
          message = `Berdasarkan analisis, ${topSuspect[0]} memiliki pola mencurigakan. Tingkat kecurigaan: ${Math.round(topSuspect[1] * 100)}%`;
        } else {
          message = 'Mari kita analisis pola voting dari kemarin...';
        }
      } else if (personality === 'aggressive') {
        const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        const aggressiveMsg = [
          `${target.name} pasti menyembunyikan sesuatu! Aku bisa merasakannya!`,
          `Sudah waktunya kita bertindak! ${target.name} terlalu mencurigakan!`,
          `Aku tidak percaya ${target.name}! Ada yang tidak beres!`,
          `${target.name}, jelaskan dimana kamu tadi malam!`
        ];
        message = aggressiveMsg[Math.floor(Math.random() * aggressiveMsg.length)];
      } else if (personality === 'defensive') {
        const defensiveMsg = [
          'Tunggu, kalian tidak bisa langsung menuduh tanpa bukti!',
          'Aku punya alibi yang kuat untuk tadi malam',
          'Kenapa kalian semua menatapku seperti itu?',
          'Ini tidak adil, aku bukan werewolf!'
        ];
        message = defensiveMsg[Math.floor(Math.random() * defensiveMsg.length)];
      } else if (personality === 'quiet') {
        const quietMsg = ['...', 'Hmm', 'Aku setuju', 'Mungkin'];
        message = quietMsg[Math.floor(Math.random() * quietMsg.length)];
      } else if (personality === 'chaotic') {
        const chaoticMsg = [
          'Plot twist: bagaimana kalau kita vote random?',
          'Chaos adalah jawaban!',
          'Siapa yang berani main truth or dare?',
          'YOLO! Vote siapa aja deh!'
        ];
        message = chaoticMsg[Math.floor(Math.random() * chaoticMsg.length)];
      }
      
      if (role === 'werewolf' && Math.random() > 0.7) {
        const deflectMsg = [
          'Kita harus fokus pada yang paling diam...',
          'Werewolf pasti pandai menyembunyikan diri',
          'Aku rasa kita salah sasaran'
        ];
        message = deflectMsg[Math.floor(Math.random() * deflectMsg.length)];
      }
      
    } else if (phase === 'voting') {
      if (personality === 'analytical') {
        message = '📊 Menghitung probabilitas berdasarkan data...';
      } else if (personality === 'aggressive') {
        message = '⚔️ Sudah waktunya! Vote dengan yakin!';
      } else if (personality === 'defensive') {
        message = '🛡️ Aku vote untuk melindungi diri...';
      } else if (personality === 'chaotic') {
        message = '🎲 Eeny, meeny, miny, moe...';
      } else {
        message = '🤔 ...';
      }
    } else if (phase === 'night') {
      const nightMsg = [
        '🌙 Malam yang mencekam...',
        '😰 Aku merasa tidak aman...',
        '🕯️ Semoga pagi datang dengan cepat...'
      ];
      message = nightMsg[Math.floor(Math.random() * nightMsg.length)];
    }
    
    if (message) {
      setTimeout(() => {
        const newMsg = {
          id: Date.now() + Math.random(),
          user: botName,
          text: message,
          timestamp: new Date().toISOString(),
          type: 'chat'
        };
        setMessages(prev => [...prev, newMsg]);
      }, 1000 + Math.random() * 3000);
    }
  };

  const injectStoryEvent = () => {
    const event = storyEvents[Math.floor(Math.random() * storyEvents.length)];
    const eventMsg = {
      id: Date.now(),
      user: 'System',
      text: event,
      timestamp: new Date().toISOString(),
      type: 'story'
    };
    setMessages(prev => [...prev, eventMsg]);
  };

  const smartBotVoting = (botName, currentGameState) => {
    const personality = currentGameState.botPersonalities[botName];
    const role = currentGameState.roles[botName];
    const alivePlayers = currentGameState.players.filter(p => p.alive && p.name !== botName);
    const suspicionData = currentGameState.suspicionLevels || {};
    
    let target;
    
    if (personality === 'analytical') {
      const sorted = Object.entries(suspicionData)
        .filter(([name]) => alivePlayers.find(p => p.name === name))
        .sort((a, b) => b[1] - a[1]);
      target = sorted.length > 0 ? alivePlayers.find(p => p.name === sorted[0][0]) : null;
    } else if (personality === 'aggressive') {
      const humanPlayers = alivePlayers.filter(p => !p.isBot);
      target = humanPlayers.length > 0 ? humanPlayers[Math.floor(Math.random() * humanPlayers.length)] : alivePlayers[0];
    } else if (personality === 'quiet') {
      const existingVotes = Object.values(currentGameState.votes);
      if (existingVotes.length > 0) {
        const mostVoted = existingVotes.reduce((a, b, i, arr) => 
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        );
        target = alivePlayers.find(p => p.name === mostVoted);
      }
    } else if (personality === 'chaotic') {
      target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    } else {
      target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    }
    
    if (!target) target = alivePlayers[0];
    
    return target ? target.name : null;
  };

  const smartBotAction = (botName, phase, currentGameState) => {
    const role = currentGameState.roles[botName];
    const alivePlayers = currentGameState.players.filter(p => p.alive && p.name !== botName);
    
    if (alivePlayers.length === 0) return currentGameState;

    let target;

    if (phase === 'night') {
      if (role === 'werewolf') {
        const humanPlayers = alivePlayers.filter(p => !p.isBot);
        target = humanPlayers.length > 0 ? humanPlayers[Math.floor(Math.random() * humanPlayers.length)] : alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      } else if (role === 'seer') {
        const unknownPlayers = alivePlayers.filter(p => !currentGameState.actions[`seer_${botName}_checked_${p.name}`]);
        target = unknownPlayers.length > 0 ? unknownPlayers[Math.floor(Math.random() * unknownPlayers.length)] : alivePlayers[0];
      } else if (role === 'guard') {
        const humanPlayers = alivePlayers.filter(p => !p.isBot);
        target = humanPlayers.length > 0 ? humanPlayers[Math.floor(Math.random() * humanPlayers.length)] : alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      }

      if (target) {
        const newActions = { ...currentGameState.actions };
        newActions[botName] = target.name;
        return { ...currentGameState, actions: newActions };
      }
    } else if (phase === 'voting') {
      const targetName = smartBotVoting(botName, currentGameState);

      if (targetName) {
        const newVotes = { ...currentGameState.votes };
        newVotes[botName] = targetName;
        return { ...currentGameState, votes: newVotes };
      }
    }
    
    return currentGameState;
  };

  const updateSuspicionLevels = (currentGameState) => {
    const newSuspicion = { ...currentGameState.suspicionLevels };
    
    currentGameState.players.forEach(player => {
      if (!player.alive) return;
      
      if (!newSuspicion[player.name]) {
        newSuspicion[player.name] = Math.random() * 0.3;
      }
      
      if (currentGameState.votes[player.name]) {
        newSuspicion[player.name] = Math.min(1, newSuspicion[player.name] + 0.15);
      }
      
      newSuspicion[player.name] = Math.max(0, newSuspicion[player.name] + (Math.random() - 0.5) * 0.1);
    });
    
    return newSuspicion;
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
      isTimerRunning: false,
      suspicionLevels: {},
      botPersonalities: gameState.botPersonalities
    });
    setMessages([]);
    setMyRole(null);
  };

  const addBot = () => {
    const availableBots = botNames.filter(bot => 
      !gameState.players.find(p => p.name === bot.name)
    );
    
    if (availableBots.length === 0) {
      showNotif('Semua bot sudah masuk!', 'error');
      return;
    }

    const selectedBot = availableBots[0];
    const newPlayers = [...gameState.players, { name: selectedBot.name, alive: true, isBot: true }];
    const newBotPersonalities = { ...gameState.botPersonalities, [selectedBot.name]: selectedBot.personality };
    const newGameState = { ...gameState, players: newPlayers, botPersonalities: newBotPersonalities };
    
    const systemMsg = {
      id: Date.now(),
      user: 'System',
      text: `🤖 ${selectedBot.name} (${botPersonalities[selectedBot.personality].name}) bergabung dengan cerita...`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    setMessages([...messages, systemMsg]);
    setGameState(newGameState);
    showNotif(`${selectedBot.name} ditambahkan!`, 'success');
  };

  const createRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    setShowRoomModal(false);
    showNotif(`Room ${code} dibuat!`, 'success');
  };

  const joinRoom = () => {
    if (inputRoomCode.trim().length === 6) {
      setRoomCode(inputRoomCode.toUpperCase());
      setIsHost(false);
      setShowRoomModal(false);
      showNotif(`Bergabung ke room ${inputRoomCode.toUpperCase()}!`, 'success');
    } else {
      showNotif('Kode room harus 6 karakter!', 'error');
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    showNotif('Kode room disalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    setRoomCode('');
    setIsHost(false);
    setGameState({
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
      isTimerRunning: false,
      suspicionLevels: {},
      botPersonalities: {}
    });
    setMessages([]);
    setMyRole(null);
    showNotif('Keluar dari room', 'info');
  };

  const handleLogin = () => {
    if (username.trim()) {
      setIsLoggedIn(true);
      setShowRoomModal(true);
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

    if (!roomCode) {
      showNotif('Belum ada room aktif!', 'error');
      return;
    }

    const newPlayers = [...gameState.players];
    if (!newPlayers.find(p => p.name === username)) {
      newPlayers.push({ name: username, alive: true, isBot: false });
    }

    const playerRoles = {};
    const shuffled = [...newPlayers].sort(() => Math.random() - 0.5);
    
    shuffled.forEach((player, idx) => {
      if (idx === 0) playerRoles[player.name] = 'werewolf';
      else if (idx === 1) playerRoles[player.name] = 'seer';
      else if (idx === 2) playerRoles[player.name] = 'guard';
      else playerRoles[player.name] = 'villager';
    });

    let newGameState = {
      ...gameState,
      players: newPlayers,
      phase: 'night',
      roles: playerRoles,
      day: 1,
      actions: {},
      votes: {},
      readyPlayers: [],
      gameTimer: 90,
      isTimerRunning: true,
      suspicionLevels: {}
    };

    for (const player of newPlayers.filter(p => p.isBot)) {
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
    
    setMessages([systemMsg]);
    setGameState(newGameState);
    setSidebarOpen(false);
    
    setTimeout(() => {
      newPlayers.filter(p => p.isBot).forEach(bot => {
        advancedBotChat(bot.name, 'night', newGameState);
      });
    }, 1000);
    
    setTimeout(injectStoryEvent, 5000);
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
    else if (myRole === 'seer') {
      const targetRole = gameState.roles[targetName];
      skillText = `🔮 Kamu melihat ${targetName} adalah ${targetRole} ${getRoleEmoji(targetRole)}`;
    }
    else if (myRole === 'guard') skillText = `🛡️ Kamu melindungi ${targetName}`;
    
    showNotif(skillText, 'success');
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
          text: '⏳ Game akan direset dalam 10 detik...',
          timestamp: new Date().toISOString(),
          type: 'system'
        });
        newGameState.phase = 'ended';
        newGameState.isTimerRunning = false;
        setTimeout(() => {
          resetGameAfterWin();
        }, 10000);
      } else {
        newGameState.gameTimer = 90;
        newGameState.suspicionLevels = updateSuspicionLevels(newGameState);
        setTimeout(() => {
          newGameState.players.filter(p => p.isBot && p.alive).forEach(bot => {
            advancedBotChat(bot.name, 'day', newGameState);
          });
        }, 1000);
        setTimeout(injectStoryEvent, 8000);
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
      setTimeout(() => {
        newGameState.players.filter(p => p.isBot && p.alive).forEach(bot => {
          advancedBotChat(bot.name, 'voting', newGameState);
        });
      }, 1000);
      
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
            text: `⚰️ ${executed} dieksekusi oleh warga! Mereka adalah... ${gameState.roles[executed]} ${getRoleEmoji(gameState.roles[executed])}`,
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
          text: '⏳ Game akan direset dalam 10 detik...',
          timestamp: new Date().toISOString(),
          type: 'system'
        });
        newGameState.phase = 'ended';
        newGameState.isTimerRunning = false;
        setTimeout(() => {
          resetGameAfterWin();
        }, 10000);
      } else {
        for (const bot of newGameState.players.filter(p => p.isBot && p.alive)) {
          newGameState = smartBotAction(bot.name, 'night', newGameState);
        }
        newGameState.gameTimer = 90;
        
        newMessages.push({
          id: Date.now() + 2,
          user: 'System',
          text: storyMessages.nightStart,
          timestamp: new Date().toISOString(),
          type: 'system'
        });
        
        setTimeout(() => {
          newGameState.players.filter(p => p.isBot && p.alive).forEach(bot => {
            advancedBotChat(bot.name, 'night', newGameState);
          });
        }, 1000);
        setTimeout(injectStoryEvent, 6000);
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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-black border-4 border-purple-500 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-black border-4 border-purple-400 p-6 shadow-2xl shadow-purple-500/50">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 drop-shadow-lg animate-pulse">🐺</div>
            <h1 className="text-4xl font-black mb-2 text-purple-400 drop-shadow-lg">WEREWOLF</h1>
            <p className="text-purple-300 text-sm font-bold">Interactive Story Game</p>
            <div className="mt-3 text-xs text-yellow-300 flex items-center justify-center gap-2 font-bold">
              <Brain className="w-4 h-4" />
              <span>AI Bots with Personalities</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Masukkan username..."
              className="w-full px-4 py-3 bg-gray-900 border-2 border-purple-400 text-white focus:outline-none focus:border-purple-300 font-bold"
            />
            <button
              onClick={handleLogin}
              className="w-full bg-purple-600 border-2 border-purple-400 text-white py-3 font-black hover:bg-purple-700 drop-shadow-lg transition-all"
            >
              MASUK KE DESA
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showRoomModal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-black border-4 border-purple-500 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-black border-4 border-purple-400 p-6 shadow-2xl shadow-purple-500/50">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎮</div>
            <h2 className="text-2xl font-black text-purple-400 mb-2">PILIH MODE</h2>
            <p className="text-sm text-purple-300 font-bold">Buat room baru atau join room existing</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={createRoom}
              className="w-full bg-purple-600 border-2 border-purple-400 text-white py-4 font-black hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              BUAT ROOM BARU
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-purple-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-black px-2 text-purple-400 font-bold">ATAU</span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                placeholder="MASUKKAN KODE ROOM"
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-900 border-2 border-purple-400 text-white text-center font-black text-lg focus:outline-none focus:border-purple-300 tracking-widest"
              />
              <button
                onClick={joinRoom}
                className="w-full bg-blue-600 border-2 border-blue-400 text-white py-3 font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                JOIN ROOM
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-black border-t-4 border-purple-500 flex flex-col text-white">
      {showNotification && (
        <div className={`fixed top-4 right-4 px-4 py-3 border-2 font-bold z-50 shadow-lg ${showNotification.type === 'success' ? 'bg-green-600 border-green-400' : showNotification.type === 'error' ? 'bg-red-600 border-red-400' : 'bg-blue-600 border-blue-400'}`}>
          {showNotification.text}
        </div>
      )}

      <div className="border-b-4 border-purple-500 p-3 bg-black sticky top-0 z-20 shadow-lg shadow-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-purple-400">🐺 WEREWOLF</h1>
            <span className="text-xs text-yellow-300 font-bold">@{username}</span>
          </div>
          <div className="flex items-center gap-2">
            {roomCode && (
              <div className="flex items-center gap-1 border-2 border-purple-400 bg-purple-900 px-3 py-1 font-black text-sm">
                <span className="text-purple-300">ROOM:</span>
                <span className="text-yellow-300">{roomCode}</span>
                <button onClick={copyRoomCode} className="ml-1 hover:text-yellow-400 transition-colors">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
            <button onClick={() => setShowTutorial(!showTutorial)} className="p-2 border-2 border-purple-400 hover:bg-purple-800 transition-colors">
              <Info className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 border-2 border-purple-400 px-2 py-1 font-bold bg-purple-900">
              <Users className="w-4 h-4" />
              <span>{gameState.players.length}</span>
            </div>
            {gameState.isTimerRunning && (
              <div className="flex items-center gap-1 border-2 border-red-400 px-2 py-1 font-bold bg-red-600 animate-pulse">
                <Clock className="w-4 h-4" />
                <span>{gameState.gameTimer}s</span>
              </div>
            )}
            <button onClick={leaveRoom} className="p-2 border-2 border-red-400 bg-red-600 hover:bg-red-700 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 border-2 border-purple-400 hover:bg-purple-800 font-black">
              ☰
            </button>
          </div>
        </div>
        {gameState.phase !== 'lobby' && gameState.phase !== 'ended' && (
          <div className="mt-2 text-xs font-black text-center">
            {gameState.phase === 'night' && <span className="text-blue-300">🌙 MALAM - Gunakan skill kamu</span>}
            {gameState.phase === 'day' && <span className="text-yellow-300">☀️ PAGI - Diskusi dan cari tersangka</span>}
            {gameState.phase === 'voting' && <span className="text-red-300">🗳️ VOTING - Tentukan nasib seseorang</span>}
            {gameState.day > 0 && <span className="text-purple-300"> | HARI KE-{gameState.day}</span>}
          </div>
        )}
      </div>

      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-end z-50 md:items-center md:justify-center">
          <div className="bg-black border-4 border-purple-400 p-6 w-full max-h-[80vh] overflow-y-auto md:max-w-md shadow-2xl shadow-purple-500/50">
            <h2 className="text-2xl font-black mb-4 text-purple-400">📖 CARA BERMAIN</h2>
            
            <div className="space-y-4 text-sm font-bold">
              <div className="border-2 border-red-500 p-3 bg-red-900/30">
                <h3 className="text-red-400 text-lg mb-1 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  🐺 WEREWOLF
                </h3>
                <p className="text-xs text-gray-300">Bunuh warga setiap malam. Tujuan: Bunuh semua warga atau samakan jumlah dengan warga.</p>
              </div>

              <div className="border-2 border-purple-500 p-3 bg-purple-900/30">
                <h3 className="text-purple-400 text-lg mb-1 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  🔮 SEER
                </h3>
                <p className="text-xs text-gray-300">Lihat role pemain setiap malam. Gunakan info ini untuk membantu warga!</p>
              </div>

              <div className="border-2 border-blue-500 p-3 bg-blue-900/30">
                <h3 className="text-blue-400 text-lg mb-1 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  🛡️ GUARD
                </h3>
                <p className="text-xs text-gray-300">Lindungi satu pemain setiap malam dari serangan werewolf.</p>
              </div>

              <div className="border-2 border-gray-500 p-3 bg-gray-900/30">
                <h3 className="text-gray-400 text-lg mb-1">👤 VILLAGER</h3>
                <p className="text-xs text-gray-300">Vote dan diskusi untuk menemukan werewolf!</p>
              </div>

              <div className="border-2 border-yellow-500 p-3 bg-yellow-900/30">
                <h3 className="text-yellow-400 text-lg mb-1 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  TIPS PRO
                </h3>
                <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                  <li>Perhatikan pola chat bot - mereka punya personality berbeda!</li>
                  <li>Gunakan waktu voting dengan bijak (90 detik)</li>
                  <li>Cerita event akan muncul random - perhatikan petunjuk!</li>
                  <li>Bot AI akan bereaksi berdasarkan suspicion level</li>
                </ul>
              </div>
            </div>

            <button onClick={() => setShowTutorial(false)} className="w-full mt-6 bg-purple-600 border-2 border-purple-400 text-white py-3 font-bold hover:bg-purple-700 transition-all">
              MENGERTI!
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className={`fixed md:relative w-64 border-r-4 border-purple-500 bg-black overflow-y-auto transition-transform transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 z-30 h-full shadow-lg shadow-purple-500/30`}>
          <div className="p-3 space-y-3">
            <div>
              <h3 className="font-black mb-2 text-sm border-b-2 border-purple-500 pb-1 text-purple-400">PLAYERS ({gameState.players.length})</h3>
              <div className="space-y-1">
                {gameState.players.map((player, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border-2 border-purple-400 bg-purple-900/30 text-xs font-bold hover:bg-purple-800/50 transition-colors">
                    <span className="flex items-center gap-2">
                      {player.name} 
                      {player.isBot && <span className="text-yellow-400">🤖</span>}
                      {player.isBot && gameState.botPersonalities[player.name] && (
                        <span className="text-[10px] text-gray-400">
                          ({botPersonalities[gameState.botPersonalities[player.name]]?.name})
                        </span>
                      )}
                    </span>
                    {!player.alive && <Skull className="w-3 h-3 text-red-500" />}
                  </div>
                ))}
              </div>
            </div>

            {myRole && (
              <div>
                <h3 className="font-black mb-2 text-sm border-b-2 border-purple-500 pb-1 text-purple-400">YOUR ROLE</h3>
                <div className="border-4 border-purple-400 p-4 text-center bg-gradient-to-b from-purple-900 to-gray-900 shadow-lg shadow-purple-500/30">
                  <div className="text-5xl mb-2 animate-pulse">{getRoleEmoji(myRole)}</div>
                  <div className={`text-lg font-black uppercase ${getRoleColor(myRole)}`}>{myRole}</div>
                </div>
              </div>
            )}

            {gameState.phase === 'lobby' && isHost && (
              <div className="space-y-2">
                <button onClick={addBot} className="w-full bg-purple-900 border-2 border-purple-400 py-2 font-black hover:bg-purple-800 text-xs transition-all flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  ADD BOT
                </button>
                <button 
                  onClick={handleReady} 
                  className={`w-full py-2 font-black border-2 border-purple-400 text-xs transition-all ${gameState.readyPlayers.includes(username) ? 'bg-green-600' : 'bg-purple-900 hover:bg-purple-800'}`}
                  disabled={gameState.readyPlayers.includes(username)}
                >
                  {gameState.readyPlayers.includes(username) ? '✅ READY' : 'READY UP'}
                </button>
                <button 
                  onClick={startGame} 
                  className="w-full bg-red-600 border-2 border-red-400 py-3 font-black hover:bg-red-700 text-sm disabled:bg-gray-600 disabled:border-gray-500 transition-all flex items-center justify-center gap-2"
                  disabled={gameState.players.length < 4}
                >
                  <Play className="w-4 h-4" />
                  START GAME
                </button>
                <p className="text-xs text-center text-yellow-300 font-bold">
                  {gameState.readyPlayers.length}/{gameState.players.length} ready
                  {gameState.players.length < 4 && <span className="block text-red-400 mt-1">Min. 4 players!</span>}
                </p>
              </div>
            )}

            {gameState.phase === 'lobby' && !isHost && (
              <div className="border-2 border-yellow-500 p-3 bg-yellow-900/20 text-xs font-bold text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                <p className="text-yellow-300">Menunggu host untuk memulai game...</p>
                <button 
                  onClick={handleReady} 
                  className={`w-full mt-3 py-2 font-black border-2 border-purple-400 text-xs transition-all ${gameState.readyPlayers.includes(username) ? 'bg-green-600' : 'bg-purple-900 hover:bg-purple-800'}`}
                  disabled={gameState.readyPlayers.includes(username)}
                >
                  {gameState.readyPlayers.includes(username) ? '✅ READY' : 'READY UP'}
                </button>
              </div>
            )}

            {gameState.phase === 'night' && myRole && myRole !== 'villager' && (
              <div>
                <h3 className="font-black mb-2 text-sm border-b-2 border-purple-500 pb-1 text-purple-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  USE SKILL
                </h3>
                <div className="space-y-1">
                  {gameState.players.filter(p => p.alive && p.name !== username).map((player, idx) => (
                    <button
                      key={idx}
                      onClick={() => useSkill(player.name)}
                      className="w-full p-2 border-2 border-purple-400 bg-purple-900/50 hover:bg-purple-800 text-xs font-bold disabled:bg-gray-800 disabled:border-gray-600 transition-all"
                      disabled={gameState.actions[username]}
                    >
                      {player.name} {player.isBot && '🤖'}
                    </button>
                  ))}
                </div>
                {gameState.actions[username] && <p className="mt-2 text-xs text-green-400 text-center font-bold">✅ Skill digunakan!</p>}
              </div>
            )}

            {gameState.phase === 'voting' && (
              <div>
                <h3 className="font-black mb-2 text-sm border-b-2 border-purple-500 pb-1 text-purple-400 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  VOTE TO EXECUTE
                </h3>
                <div className="space-y-1">
                  {gameState.players.filter(p => p.alive && p.name !== username).map((player, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleVote(player.name)}
                      className="w-full p-2 border-2 border-red-400 bg-red-900/50 hover:bg-red-800 text-xs font-bold disabled:bg-gray-800 disabled:border-gray-600 transition-all"
                      disabled={gameState.votes[username]}
                    >
                      {player.name} {player.isBot && '🤖'}
                    </button>
                  ))}
                </div>
                {gameState.votes[username] && <p className="mt-2 text-xs text-green-400 text-center font-bold">✅ Vote tercatat!</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-gray-900 via-purple-900/30 to-black">
            {messages.map((msg) => (
              <div key={msg.id} className={`${msg.type === 'system' || msg.type === 'story' ? 'flex justify-center' : msg.user === username ? 'flex justify-end' : 'flex justify-start'}`}>
                {msg.type === 'system' ? (
                  <div className="bg-yellow-900 border-2 border-yellow-400 px-4 py-2 inline-block max-w-md rounded-lg shadow-lg">
                    <p className="text-sm font-bold text-white">{msg.text}</p>
                  </div>
                ) : msg.type === 'story' ? (
                  <div className="bg-purple-900 border-2 border-purple-400 px-4 py-2 inline-block max-w-md rounded-lg shadow-lg animate-pulse">
                    <p className="text-sm font-bold text-purple-200">{msg.text}</p>
                  </div>
                ) : (
                  <div className={`max-w-xs ${msg.user === username ? 'bg-purple-600 border-2 border-purple-400' : 'bg-gray-800 border-2 border-gray-600'} p-3 rounded-lg shadow-lg`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-sm">{msg.user}</span>
                      {gameState.players.find(p => p.name === msg.user)?.isBot && <span className="text-xs">🤖</span>}
                      <span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="break-words text-white text-sm font-semibold">{msg.text}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t-4 border-purple-500 p-3 bg-black shadow-lg shadow-purple-500/30">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Kirim pesan..."
                className="flex-1 px-4 py-3 bg-gray-900 border-2 border-purple-400 text-white focus:outline-none focus:border-purple-300 font-bold transition-colors"
              />
              <button onClick={sendMessage} className="bg-purple-600 border-2 border-purple-400 text-white px-4 py-3 hover:bg-purple-700 font-black transition-all">
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