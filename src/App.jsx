import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Skull, Eye, Shield, Info, UserPlus, Play, Brain, Clock, Copy, Check, LogOut, AlertCircle, Zap, Target, Menu, X, ChevronRight, Wifi, WifiOff } from 'lucide-react';

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
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [binId, setBinId] = useState('');
  const messagesEndRef = useRef(null);
  const timerInterval = useRef(null);
  const syncInterval = useRef(null);
  const chatContainerRef = useRef(null);

  const JSONBIN_API_KEY = '$2a$10$PsVzgljojE5fq8qZRmpE4uzMr0K9LArqfmumGVSmNY.P8F2iTKrim';
  const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

  const gameImages = {
    night: 'https://user-images.githubusercontent.com/72728486/235316834-f9f84ba0-8df3-4444-81d8-db5270995e6d.jpg',
    day: 'https://user-images.githubusercontent.com/72728486/235344562-4677d2ad-48ee-419d-883f-e0ca9ba1c7b8.jpg',
    voting: 'https://user-images.githubusercontent.com/72728486/235344861-acdba7d1-8fce-41b8-adf6-337c818cda2b.jpg',
    death: 'https://user-images.githubusercontent.com/72728486/235354619-6ad1cabd-216c-4c7c-b7c2-3a564836653a.jpg',
    werewolfWin: 'https://user-images.githubusercontent.com/72728486/235365156-cfab66ce-38b2-4bc7-90d7-7756fc320e06.jpg',
    villageWin: 'https://user-images.githubusercontent.com/72728486/235365148-35b8def7-c1a2-451d-a2f2-6b6a911b37db.jpg'
  };

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

  const createBin = async (roomData) => {
    try {
      const response = await fetch(`${JSONBIN_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
          'X-Bin-Name': `werewolf_${roomData.roomCode}`
        },
        body: JSON.stringify(roomData)
      });
      const data = await response.json();
      return data.metadata.id;
    } catch (error) {
      console.error('Error creating bin:', error);
      setIsConnected(false);
      return null;
    }
  };

  const updateBin = async (binId, data) => {
    try {
      await fetch(`${JSONBIN_BASE_URL}/${binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY
        },
        body: JSON.stringify(data)
      });
      setIsConnected(true);
    } catch (error) {
      console.error('Error updating bin:', error);
      setIsConnected(false);
    }
  };

  const getBinData = async (binId) => {
    try {
      const response = await fetch(`${JSONBIN_BASE_URL}/${binId}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY
        }
      });
      const data = await response.json();
      setIsConnected(true);
      return data.record;
    } catch (error) {
      console.error('Error getting bin:', error);
      setIsConnected(false);
      return null;
    }
  };

  const syncGameState = async () => {
    if (!binId) return;
    
    try {
      const data = await getBinData(binId);
      if (data) {
        setGameState(data.gameState);
        setMessages(data.messages);
        
        const myPlayerRole = data.gameState.roles[username];
        if (myPlayerRole && myPlayerRole !== myRole) {
          setMyRole(myPlayerRole);
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  useEffect(() => {
    if (roomCode && binId) {
      syncInterval.current = setInterval(syncGameState, 2000);
      return () => clearInterval(syncInterval.current);
    }
  }, [roomCode, binId]);

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

  const advancedBotChat = async (botName, phase, currentGameState) => {
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
        if (target) {
          const aggressiveMsg = [
            `${target.name} pasti menyembunyikan sesuatu! Aku bisa merasakannya!`,
            `Sudah waktunya kita bertindak! ${target.name} terlalu mencurigakan!`,
            `Aku tidak percaya ${target.name}! Ada yang tidak beres!`,
            `${target.name}, jelaskan dimana kamu tadi malam!`
          ];
          message = aggressiveMsg[Math.floor(Math.random() * aggressiveMsg.length)];
        }
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
      setTimeout(async () => {
        const newMsg = {
          id: Date.now() + Math.random(),
          user: botName,
          text: message,
          timestamp: new Date().toISOString(),
          type: 'chat'
        };
        const updatedMessages = [...messages, newMsg];
        setMessages(updatedMessages);
        
        if (binId) {
          await updateBin(binId, { gameState, messages: updatedMessages, roomCode, host: username });
        }
      }, 1000 + Math.random() * 3000);
    }
  };

  const injectStoryEvent = async () => {
    const event = storyEvents[Math.floor(Math.random() * storyEvents.length)];
    const eventMsg = {
      id: Date.now(),
      user: 'System',
      text: event,
      timestamp: new Date().toISOString(),
      type: 'story'
    };
    const updatedMessages = [...messages, eventMsg];
    setMessages(updatedMessages);
    
    if (binId) {
      await updateBin(binId, { gameState, messages: updatedMessages, roomCode, host: username });
    }
  };

  const smartBotVoting = (botName, currentGameState) => {
    const personality = currentGameState.botPersonalities[botName];
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

  const resetGameAfterWin = async () => {
    const newGameState = {
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
    };
    
    setGameState(newGameState);
    setMessages([]); // Reset messages setelah game selesai
    setMyRole(null);
    
    if (binId) {
      await updateBin(binId, { gameState: newGameState, messages: [], roomCode, host: username });
    }
  };

  const addBot = async () => {
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
    
    const updatedMessages = [...messages, systemMsg];
    setMessages(updatedMessages);
    setGameState(newGameState);
    
    if (binId) {
      await updateBin(binId, { gameState: newGameState, messages: updatedMessages, roomCode, host: username });
    }
    
    showNotif(`${selectedBot.name} ditambahkan!`, 'success');
  };

  const createRoom = async () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    setShowRoomModal(false);
    
    const initialData = {
      roomCode: code,
      host: username,
      gameState: {
        players: [{ name: username, alive: true, isBot: false }],
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
      },
      messages: [{
        id: Date.now(),
        user: 'System',
        text: storyMessages.lobbyStart,
        timestamp: new Date().toISOString(),
        type: 'system'
      }]
    };
    
    const newBinId = await createBin(initialData);
    if (newBinId) {
      setBinId(newBinId);
      setGameState(initialData.gameState);
      setMessages(initialData.messages);
      showNotif(`Room ${code} dibuat!`, 'success');
    }
  };

  const joinRoom = async () => {
    if (inputRoomCode.trim().length !== 6) {
      showNotif('Kode room harus 6 karakter!', 'error');
      return;
    }
    
    const code = inputRoomCode.toUpperCase();
    
    showNotif('Mencari room...', 'info');
    
    setTimeout(async () => {
      setRoomCode(code);
      setIsHost(false);
      setShowRoomModal(false);
      
      const joinMsg = {
        id: Date.now(),
        user: 'System',
        text: `🚪 ${username} bergabung ke room!`,
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      
      setMessages([joinMsg]);
      showNotif(`Bergabung ke room ${code}!`, 'success');
    }, 1000);
  };

  const copyRoomCode = () => {
    const textToCopy = `Room: ${roomCode}\nBin ID: ${binId}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    showNotif('Kode room & Bin ID disalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    if (confirm('Yakin ingin keluar dari room?')) {
      setRoomCode('');
      setIsHost(false);
      setBinId('');
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
    }
  };

  const handleLogin = () => {
    if (username.trim()) {
      setIsLoggedIn(true);
      setShowRoomModal(true);
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
      const updatedMessages = [...messages, newMsg];
      setMessages(updatedMessages);
      setInputMessage('');
      
      if (binId) {
        await updateBin(binId, { gameState, messages: updatedMessages, roomCode, host: username });
      }
    }
  };

  const handleReady = async () => {
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
    
    const updatedMessages = [...messages, systemMsg];
    setMessages(updatedMessages);
    setGameState(newGameState);
    
    if (binId) {
      await updateBin(binId, { gameState: newGameState, messages: updatedMessages, roomCode, host: username });
    }
  };

  const startGame = async () => {
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
      type: 'system',
      image: gameImages.night
    };
    
    const updatedMessages = [...messages, systemMsg];
    setMessages(updatedMessages);
    setGameState(newGameState);
    setSidebarOpen(false);
    
    if (binId) {
      await updateBin(binId, { gameState: newGameState, messages: updatedMessages, roomCode, host: username });
    }
    
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

  const useSkill = async (targetName) => {
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
    
    const newGameState = { ...gameState, actions: newActions };
    setGameState(newGameState);
    setSidebarOpen(false);
    
    if (binId) {
      await updateBin(binId, { gameState: newGameState, messages, roomCode, host: username });
    }
  };

  const handleVote = async (targetPlayer) => {
    const newVotes = { ...gameState.votes };
    newVotes[username] = targetPlayer;
    
    const voteMsg = {
      id: Date.now(),
      user: 'System',
      text: `🗳️ ${username} telah memberikan vote`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    const updatedMessages = [...messages, voteMsg];
    setMessages(updatedMessages);
    
    const newGameState = { ...gameState, votes: newVotes };
    setGameState(newGameState);
    setSidebarOpen(false);
    
    if (binId) {
      await updateBin(binId, { gameState: newGameState, messages: updatedMessages, roomCode, host: username });
    }
  };

  const nextPhase = async () => {
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
        type: 'system',
        image: deaths.length > 0 ? gameImages.death : gameImages.day
      });

      const winState = checkWinCondition(newGameState);
      if (winState) {
        newMessages.push({
          id: Date.now(),
          user: 'System',
          text: winState,
          timestamp: new Date().toISOString(),
          type: 'system',
          image: winState.includes('GELAP') ? gameImages.werewolfWin : gameImages.villageWin
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
        type: 'system',
        image: gameImages.voting
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
            type: 'system',
            image: gameImages.death
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
          type: 'system',
          image: winState.includes('GELAP') ? gameImages.werewolfWin : gameImages.villageWin
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
          type: 'system',
          image: gameImages.night
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
    
    if (binId) {
      await updateBin(binId, { gameState: newGameState, messages: newMessages, roomCode, host: username });
    }
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
    const colors = { werewolf: 'text-red-500', seer: 'text-purple-500', guard: 'text-blue-500', villager: 'text-gray-400' };
    return colors[role] || 'text-gray-400';
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnpNNiAzNGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6TTM2IDM0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        
        <div className="w-full max-w-md bg-black/80 backdrop-blur-xl border-2 border-purple-500 rounded-3xl p-8 shadow-2xl relative z-10 transform hover:scale-105 transition-all duration-300">
          <div className="text-center mb-8">
            <div className="text-8xl mb-4 animate-bounce">🐺</div>
            <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">WEREWOLF</h1>
            <p className="text-purple-300 text-sm font-bold tracking-wider">MULTIPLAYER STORY GAME</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-yellow-400 font-bold bg-yellow-900/30 rounded-full px-4 py-2">
              <Brain className="w-4 h-4 animate-pulse" />
              <span>AI Bots • Real-time Sync</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Masukkan username..."
                className="w-full px-5 py-4 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-500 rounded-xl text-white focus:outline-none focus:border-pink-400 font-bold text-base placeholder-purple-300 transition-all"
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white py-4 rounded-xl font-black text-xl hover:from-purple-700 hover:via-pink-700 hover:to-red-700 active:scale-95 transition-all shadow-2xl transform hover:shadow-purple-500/50"
            >
              🚪 MASUK KE DESA
            </button>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>Powered by JSONBin Database</p>
          </div>
        </div>
      </div>
    );
  }

  if (showRoomModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-black/90 backdrop-blur-xl border-2 border-purple-500 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-pulse">🎮</div>
            <h2 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">PILIH MODE</h2>
            <p className="text-sm text-purple-300 font-semibold">Buat room baru atau join room</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={createRoom}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-5 rounded-xl font-black text-lg hover:from-purple-700 hover:to-pink-700 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl"
            >
              <Play className="w-6 h-6" />
              BUAT ROOM BARU
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-purple-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-black px-4 text-purple-400 font-bold">ATAU</span>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                placeholder="KODE ROOM"
                maxLength={6}
                className="w-full px-5 py-4 bg-purple-900/50 border-2 border-purple-500 rounded-xl text-white text-center font-black text-2xl tracking-widest focus:outline-none focus:border-pink-400 transition-all"
              />
              <button
                onClick={joinRoom}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-5 rounded-xl font-black text-lg hover:from-blue-700 hover:to-cyan-700 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                <UserPlus className="w-6 h-6" />
                JOIN ROOM
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnpNNiAzNGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6TTM2IDM0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20 pointer-events-none"></div>
      
      {showNotification && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl font-black z-50 shadow-2xl max-w-sm w-full mx-4 text-center backdrop-blur-xl border-2 ${
          showNotification.type === 'success' ? 'bg-green-600/90 border-green-400' : 
          showNotification.type === 'error' ? 'bg-red-600/90 border-red-400' : 
          'bg-blue-600/90 border-blue-400'
        }`}>
          <div className="flex items-center justify-center gap-2">
            {showNotification.type === 'success' && <Check className="w-5 h-5" />}
            {showNotification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {showNotification.type === 'info' && <Info className="w-5 h-5" />}
            <span>{showNotification.text}</span>
          </div>
        </div>
      )}

      {/* Header - Fixed */}
      <div className="flex-shrink-0 bg-black/80 backdrop-blur-xl border-b-2 border-purple-500 p-4 shadow-2xl z-20">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">🐺 WEREWOLF</h1>
            <span className="text-xs text-yellow-400 font-bold">@{username}</span>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-400 animate-pulse" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
            )}
            {roomCode && (
              <button onClick={copyRoomCode} className="flex items-center gap-1 bg-gradient-to-r from-purple-900 to-pink-900 border-2 border-purple-500 rounded-lg px-3 py-2 font-bold text-xs active:scale-95 transition-all hover:shadow-lg hover:shadow-purple-500/50">
                <span className="text-yellow-400">{roomCode}</span>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
            {gameState.isTimerRunning && (
              <div className="flex items-center gap-1 bg-gradient-to-r from-red-600 to-orange-600 border-2 border-red-500 rounded-lg px-3 py-2 font-black text-xs animate-pulse">
                <Clock className="w-4 h-4" />
                <span>{gameState.gameTimer}s</span>
              </div>
            )}
            <button onClick={() => setShowPlayerList(!showPlayerList)} className="flex items-center gap-1 bg-gradient-to-r from-purple-900 to-pink-900 border-2 border-purple-500 rounded-lg px-3 py-2 font-bold text-xs active:scale-95 transition-all hover:shadow-lg hover:shadow-purple-500/50">
              <Users className="w-4 h-4" />
              <span>{gameState.players.length}</span>
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-gradient-to-r from-purple-900 to-pink-900 border-2 border-purple-500 rounded-lg active:scale-95 transition-all hover:shadow-lg hover:shadow-purple-500/50">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        {gameState.phase !== 'lobby' && gameState.phase !== 'ended' && (
          <div className="mt-3 text-center">
            <div className="inline-block bg-gradient-to-r from-purple-900 to-pink-900 border-2 border-purple-500 rounded-full px-5 py-2 shadow-lg">
              <span className="text-sm font-black">
                {gameState.phase === 'night' && '🌙 MALAM - Gunakan skill'}
                {gameState.phase === 'day' && '☀️ PAGI - Diskusi'}
                {gameState.phase === 'voting' && '🗳️ VOTING - Tentukan nasib'}
                {gameState.day > 0 && ` | HARI ${gameState.day}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Player List Modal */}
      {showPlayerList && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-40 flex items-end" onClick={() => setShowPlayerList(false)}>
          <div className="w-full bg-gradient-to-b from-purple-900 to-black border-t-4 border-purple-500 rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">PLAYERS ({gameState.players.length})</h3>
              <button onClick={() => setShowPlayerList(false)} className="p-2 hover:bg-purple-800 rounded-lg transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              {gameState.players.map((player, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-500 rounded-xl p-4 hover:scale-105 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-black text-lg">
                      {player.name[0]}
                    </div>
                    <span className="font-bold">
                      {player.name} {player.isBot && '🤖'}
                    </span>
                  </div>
                  {!player.alive && <Skull className="w-5 h-5 text-red-500 animate-pulse" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end" onClick={() => setShowTutorial(false)}>
          <div className="w-full bg-gradient-to-b from-purple-900 to-black border-t-4 border-purple-500 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">📖 CARA BERMAIN</h2>
              <button onClick={() => setShowTutorial(false)} className="p-2 hover:bg-purple-800 rounded-lg transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-red-900/30 to-red-800/30 border-2 border-red-500 rounded-2xl p-4 hover:scale-105 transition-all">
                <h3 className="text-red-400 font-black mb-2 flex items-center gap-2 text-lg">
                  🐺 WEREWOLF
                </h3>
                <p className="text-sm text-gray-300">Bunuh warga setiap malam. Tujuan: Bunuh semua warga atau samakan jumlah.</p>
              </div>

              <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/30 border-2 border-purple-500 rounded-2xl p-4 hover:scale-105 transition-all">
                <h3 className="text-purple-400 font-black mb-2 flex items-center gap-2 text-lg">
                  🔮 SEER
                </h3>
                <p className="text-sm text-gray-300">Lihat role pemain setiap malam. Gunakan info ini untuk bantu warga!</p>
              </div>

              <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 border-2 border-blue-500 rounded-2xl p-4 hover:scale-105 transition-all">
                <h3 className="text-blue-400 font-black mb-2 flex items-center gap-2 text-lg">
                  🛡️ GUARD
                </h3>
                <p className="text-sm text-gray-300">Lindungi satu pemain setiap malam dari serangan werewolf.</p>
              </div>

              <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 border-2 border-gray-600 rounded-2xl p-4 hover:scale-105 transition-all">
                <h3 className="text-gray-400 font-black mb-2 text-lg">👤 VILLAGER</h3>
                <p className="text-sm text-gray-300">Vote dan diskusi untuk menemukan werewolf!</p>
              </div>

              <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 border-2 border-yellow-500 rounded-2xl p-4">
                <h3 className="text-yellow-400 font-black mb-2 flex items-center gap-2 text-lg">
                  <Zap className="w-5 h-5" />
                  TIPS PRO
                </h3>
                <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
                  <li>Perhatikan pola chat bot berbeda!</li>
                  <li>Gunakan 90 detik voting dengan bijak</li>
                  <li>Story event muncul random</li>
                  <li>Bot bereaksi berdasarkan suspicion</li>
                  <li>Real-time sync dengan JSONBin</li>
                </ul>
              </div>
            </div>

            <button onClick={() => setShowTutorial(false)} className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-black text-lg active:scale-95 transition-all shadow-xl">
              MENGERTI!
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Menu */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-gradient-to-b from-purple-900 to-black border-l-4 border-purple-500 overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">MENU</h3>
                <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-purple-800 rounded-lg transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Role Card */}
              {myRole && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-purple-400 mb-3 tracking-wider">YOUR ROLE</h4>
                  <div className="bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900 border-4 border-purple-500 rounded-2xl p-6 text-center shadow-2xl transform hover:scale-105 transition-all">
                    <div className="text-6xl mb-3 animate-bounce">{getRoleEmoji(myRole)}</div>
                    <div className={`text-2xl font-black uppercase ${getRoleColor(myRole)}`}>{myRole}</div>
                  </div>
                </div>
              )}

              {/* Lobby Controls (Host) */}
              {gameState.phase === 'lobby' && isHost && (
                <div className="space-y-3 mb-6">
                  <button onClick={addBot} className="w-full bg-gradient-to-r from-purple-900 to-pink-900 border-2 border-purple-500 rounded-xl py-4 font-black text-sm hover:from-purple-800 hover:to-pink-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg">
                    <UserPlus className="w-5 h-5" />
                    TAMBAH BOT
                  </button>
                  <button 
                    onClick={handleReady} 
                    className={`w-full border-2 rounded-xl py-4 font-black text-sm active:scale-95 transition-all shadow-lg ${gameState.readyPlayers.includes(username) ? 'bg-green-600 border-green-500' : 'bg-purple-900 border-purple-500 hover:bg-purple-800'}`}
                    disabled={gameState.readyPlayers.includes(username)}
                  >
                    {gameState.readyPlayers.includes(username) ? '✅ READY' : 'READY UP'}
                  </button>
                  <button 
                    onClick={startGame} 
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 border-2 border-red-500 rounded-xl py-5 font-black text-lg hover:from-red-700 hover:to-orange-700 active:scale-95 transition-all disabled:from-gray-700 disabled:to-gray-600 disabled:border-gray-600 flex items-center justify-center gap-2 shadow-xl"
                    disabled={gameState.players.length < 4}
                  >
                    <Play className="w-6 h-6" />
                    START GAME
                  </button>
                  <div className="text-center">
                    <p className="text-sm text-yellow-400 font-bold">
                      {gameState.readyPlayers.length}/{gameState.players.length} ready
                    </p>
                    {gameState.players.length < 4 && <p className="text-xs text-red-400 mt-1 font-bold">Min. 4 players!</p>}
                  </div>
                </div>
              )}

              {/* Lobby (Non-Host) */}
              {gameState.phase === 'lobby' && !isHost && (
                <div className="mb-6">
                  <div className="bg-yellow-900/30 border-2 border-yellow-500 rounded-2xl p-4 text-center mb-3">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 text-yellow-400" />
                    <p className="text-sm font-bold text-yellow-300">Menunggu host memulai...</p>
                  </div>
                  <button 
                    onClick={handleReady} 
                    className={`w-full border-2 rounded-xl py-4 font-black text-sm active:scale-95 transition-all shadow-lg ${gameState.readyPlayers.includes(username) ? 'bg-green-600 border-green-500' : 'bg-purple-900 border-purple-500 hover:bg-purple-800'}`}
                    disabled={gameState.readyPlayers.includes(username)}
                  >
                    {gameState.readyPlayers.includes(username) ? '✅ READY' : 'READY UP'}
                  </button>
                </div>
              )}

              {/* Night Skills */}
              {gameState.phase === 'night' && myRole && myRole !== 'villager' && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2 tracking-wider">
                    <Zap className="w-5 h-5" />
                    GUNAKAN SKILL
                  </h4>
                  <div className="space-y-2">
                    {gameState.players.filter(p => p.alive && p.name !== username).map((player, idx) => (
                      <button
                        key={idx}
                        onClick={() => useSkill(player.name)}
                        className="w-full bg-gradient-to-r from-purple-900 to-pink-900 border-2 border-purple-500 rounded-xl p-4 text-sm font-bold hover:from-purple-800 hover:to-pink-800 active:scale-95 transition-all disabled:from-gray-800 disabled:to-gray-700 disabled:border-gray-600 flex items-center justify-between shadow-lg"
                        disabled={gameState.actions[username]}
                      >
                        <span>{player.name} {player.isBot && '🤖'}</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                  {gameState.actions[username] && <p className="mt-3 text-sm text-green-400 text-center font-bold animate-pulse">✅ Skill digunakan!</p>}
                </div>
              )}

              {/* Voting */}
              {gameState.phase === 'voting' && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2 tracking-wider">
                    <Target className="w-5 h-5" />
                    VOTE TO EXECUTE
                  </h4>
                  <div className="space-y-2">
                    {gameState.players.filter(p => p.alive && p.name !== username).map((player, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleVote(player.name)}
                        className="w-full bg-gradient-to-r from-red-900 to-orange-900 border-2 border-red-500 rounded-xl p-4 text-sm font-bold hover:from-red-800 hover:to-orange-800 active:scale-95 transition-all disabled:from-gray-800 disabled:to-gray-700 disabled:border-gray-600 flex items-center justify-between shadow-lg"
                        disabled={gameState.votes[username]}
                      >
                        <span>{player.name} {player.isBot && '🤖'}</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                  {gameState.votes[username] && <p className="mt-3 text-sm text-green-400 text-center font-bold animate-pulse">✅ Vote tercatat!</p>}
                </div>
              )}

              {/* Menu Buttons */}
              <div className="space-y-3 border-t-2 border-purple-700 pt-5">
                <button onClick={() => { setShowTutorial(true); setSidebarOpen(false); }} className="w-full bg-gradient-to-r from-purple-900 to-pink-900 border-2 border-purple-500 rounded-xl py-4 font-black text-sm hover:from-purple-800 hover:to-pink-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg">
                  <Info className="w-5 h-5" />
                  TUTORIAL
                </button>
                <button onClick={leaveRoom} className="w-full bg-gradient-to-r from-red-900 to-red-800 border-2 border-red-500 rounded-xl py-4 font-black text-sm hover:from-red-800 hover:to-red-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg">
                  <LogOut className="w-5 h-5" />
                  KELUAR ROOM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area - Scrollable dengan style WhatsApp */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10"
        style={{ 
          overflowY: 'scroll',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'system' || msg.type === 'story' ? 'justify-center' : msg.user === username ? 'justify-end' : 'justify-start'} mb-2`}>
            {msg.type === 'system' ? (
              <div className="max-w-[85%]">
                {msg.image && (
                  <div className="mb-2 rounded-xl overflow-hidden border-2 border-yellow-500 shadow-2xl">
                    <img src={msg.image} alt="Game Event" className="w-full h-48 object-cover" />
                  </div>
                )}
                <div className="bg-yellow-900/70 backdrop-blur-sm border border-yellow-500 rounded-2xl px-4 py-3 shadow-xl">
                  <p className="text-xs font-bold text-yellow-100 text-center leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ) : msg.type === 'story' ? (
              <div className="bg-purple-900/70 backdrop-blur-sm border border-purple-500 rounded-2xl px-4 py-3 max-w-[85%] shadow-xl">
                <p className="text-xs font-bold text-purple-200 text-center italic leading-relaxed">{msg.text}</p>
              </div>
            ) : (
              <div className={`max-w-[75%] ${msg.user === username ? 'bg-purple-600' : 'bg-gray-700'} rounded-2xl shadow-lg`}>
                {msg.user !== username && (
                  <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-black text-xs">
                      {msg.user[0]}
                    </div>
                    <span className="font-black text-xs text-purple-300">
                      {msg.user} {gameState.players.find(p => p.name === msg.user)?.isBot && '🤖'}
                    </span>
                  </div>
                )}
                <div className="px-3 pb-2">
                  <p className="text-white text-sm break-words leading-relaxed">{msg.text}</p>
                  <span className="text-[10px] text-gray-300 mt-1 block text-right">
                    {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed Bottom */}
      <div className="flex-shrink-0 bg-black/90 backdrop-blur-xl border-t-2 border-purple-500 p-4 shadow-2xl z-20">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ketik pesan..."
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-500 rounded-full text-white focus:outline-none focus:border-pink-400 font-semibold text-sm placeholder-purple-300 transition-all"
          />
          <button onClick={sendMessage} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 rounded-full hover:from-purple-700 hover:to-pink-700 active:scale-95 transition-all shadow-xl flex items-center justify-center">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WerewolfChatGame;