import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Skull, Eye, Shield, Info, UserPlus, Play, Clock, Copy, Check, LogOut, AlertCircle, Zap, Target, Menu, X, ChevronRight, Wifi, WifiOff } from 'lucide-react';

// Google OAuth Script Loader
const loadGoogleScript = () => {
  return new Promise((resolve) => {
    if (window.google) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
};

const WerewolfChatGame = () => {
  const [googleUser, setGoogleUser] = useState(null);
  const [username, setUsername] = useState('');
  const [roomUsername, setRoomUsername] = useState('');
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
  const [copied, setCopied] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [binId, setBinId] = useState('');
  const messagesEndRef = useRef(null);
  const timerInterval = useRef(null);
  const botChatTimers = useRef({});
  const googleButtonRef = useRef(null);

  const JSONBIN_API_KEY = '$2a$10$PsVzgljojE5fq8qZRmpE4uzMr0K9LArqfmumGVSmNY.P8F2iTKrim';
  const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';
  const GOOGLE_CLIENT_ID = '779631712094-6t77ptt5366r218o80pmijmeelboj25g.apps.googleusercontent.com';

  const gameImages = {
    night: 'https://user-images.githubusercontent.com/72728486/235316834-f9f84ba0-8df3-4444-81d8-db5270995e6d.jpg',
    day: 'https://user-images.githubusercontent.com/72728486/235344562-4677d2ad-48ee-419d-883f-e0ca9ba1c7b8.jpg',
    voting: 'https://user-images.githubusercontent.com/72728486/235344861-acdba7d1-8fce-41b8-adf6-337c818cda2b.jpg',
    death: 'https://user-images.githubusercontent.com/72728486/235354619-6ad1cabd-216c-4c7c-b7c2-3a564836653a.jpg',
    werewolfWin: 'https://user-images.githubusercontent.com/72728486/235365156-cfab66ce-38b2-4bc7-90d7-7756fc320e06.jpg',
    villageWin: 'https://user-images.githubusercontent.com/72728486/235365148-35b8def7-c1a2-451d-a2f2-6b6a911b37db.jpg'
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Google OAuth and check for saved session
  useEffect(() => {
    loadGoogleScript().then(() => {
      // Check for saved Google session
      const savedGoogleUser = localStorage.getItem('werewolf_google_user');
      if (savedGoogleUser) {
        try {
          const user = JSON.parse(savedGoogleUser);
          setGoogleUser(user);
          setIsLoggedIn(true);
          setShowRoomModal(true);
        } catch (e) {
          localStorage.removeItem('werewolf_google_user');
        }
      }

      // Initialize Google Sign-In
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleLogin
        });
      }
    });
  }, []);

  // Render Google button when ref is ready
  useEffect(() => {
    if (googleButtonRef.current && window.google && !isLoggedIn) {
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        { 
          theme: "filled_blue", 
          size: "large",
          width: 350,
          text: "signin_with"
        }
      );
    }
  }, [isLoggedIn]);

  const handleGoogleLogin = (response) => {
    const userObject = parseJwt(response.credential);
    const googleUserData = {
      email: userObject.email,
      name: userObject.name,
      picture: userObject.picture,
      sub: userObject.sub
    };
    
    setGoogleUser(googleUserData);
    setIsLoggedIn(true);
    setShowRoomModal(true);
    localStorage.setItem('werewolf_google_user', JSON.stringify(googleUserData));
  };

  const parseJwt = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  };

  const handleGoogleLogout = () => {
    if (confirm('Logout dari akun Google?')) {
      setGoogleUser(null);
      setIsLoggedIn(false);
      localStorage.removeItem('werewolf_google_user');
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
      setRoomUsername('');
      setShowRoomModal(false);
      
      if (window.google) {
        window.google.accounts.id.disableAutoSelect();
      }
    }
  };

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const botPersonalityProfiles = {
    aggressive: {
      name: 'Aggressive',
      chatPatterns: [
        'Aku yakin %target% itu werewolf!',
        '%target% pasti musuh kita!',
        'Vote %target% sekarang!',
        'Lihat cara %target% bicara? Mencurigakan!',
        'Aku bisa rasakan kejahatannya dari %target%',
        '%target% terlalu diam, itu aneh',
        'Jangan percaya %target%!',
        'Serangan malam lalu pasti dari %target%'
      ],
      votingStrategy: 'targets_humans_if_werewolf',
      suspicionIncrease: 0.12
    },
    analytical: {
      name: 'Analytical',
      chatPatterns: [
        'Mari kita lihat pola voting kemarin...',
        'Statistik menunjukkan %target% mencurigakan',
        'Berdasarkan data, %target% berperilaku aneh',
        'Logika menyarankan %target% adalah werewolf',
        'Pola komunikasi %target% tidak konsisten',
        'Jika kita analisis, %target% sangat mencurigakan',
        'Data menunjuk pada %target%',
        'Bukti objektif menunjukkan %target%'
      ],
      votingStrategy: 'most_suspected',
      suspicionIncrease: 0.08
    },
    defensive: {
      name: 'Defensive',
      chatPatterns: [
        'Kenapa kalian menuduhku terus?',
        'Aku punya alibi jelas untuk malam lalu!',
        'Berhati-hatilah sebelum menuduh',
        'Jangan voting sembarangan!',
        'Aku bukan werewolf, percayalah',
        'Kalian semua salah fokus',
        'Ini tidak adil untuk saya',
        'Dengarkan penjelasanku dulu'
      ],
      votingStrategy: 'avoids_random',
      suspicionIncrease: 0.05
    },
    mysterious: {
      name: 'Mysterious',
      chatPatterns: [
        '...',
        'Hmm, menarik sekali',
        'Ada sesuatu yang tidak beres di sini',
        'Aku sedang mengamati sesuatu',
        'Tunggu, perhatikan itu',
        'Cukup aneh',
        'Saya punya firasat',
        'Semuanya tidak sesederhana yang terlihat'
      ],
      votingStrategy: 'follows_majority',
      suspicionIncrease: 0.06
    },
    chaotic: {
      name: 'Chaotic',
      chatPatterns: [
        'Vote random saja, kenapa tidak?',
        'Ini akan jadi seru!',
        'Mari kita lihat apa yang terjadi',
        'Chaos itu fun!',
        'Siapa peduli, vote aja',
        'Plot twist time!',
        'Hehe, menarik menarik',
        'Semuanya bisa terjadi'
      ],
      votingStrategy: 'completely_random',
      suspicionIncrease: 0.04
    },
    manipulator: {
      name: 'Manipulator',
      chatPatterns: [
        'Bagaimana kalau kita fokus pada %target%?',
        'Saya hanya ingin desa aman',
        '%target% punya banyak musuh di sini',
        'Mari kita buat strategi bersama',
        'Aku mempercayai semua kecuali %target%',
        '%target% terlihat berbeda hari ini',
        'Dengarkan saya, %target% aneh',
        'Kita harus bersatu melawan %target%'
      ],
      votingStrategy: 'deflect_from_self',
      suspicionIncrease: 0.09
    }
  };

  const botNames = [
    { name: 'Raven', personality: 'aggressive' },
    { name: 'Cipher', personality: 'analytical' },
    { name: 'Nova', personality: 'mysterious' },
    { name: 'Blaze', personality: 'chaotic' },
    { name: 'Echo', personality: 'defensive' },
    { name: 'Shade', personality: 'manipulator' },
    { name: 'Vex', personality: 'aggressive' },
    { name: 'Mira', personality: 'analytical' },
    { name: 'Storm', personality: 'chaotic' },
    { name: 'Void', personality: 'mysterious' }
  ];

  const storyMessages = {
    lobbyStart: "🎭 Selamat datang di Moonbrook. Desa yang gelap menanti takdir... Seseorang di sini bukan manusia.",
    nightStart: "🌙 Malam turun. Bulan purnama bersinar merah. Ketenangan malam dibawa teror... werewolf silau.",
    dayStart: (deaths) => {
      if (deaths.length > 0) {
        return `☀️ Pagi datang dengan kabut... tubuh ${deaths.join(', ')} ditemukan! Jejak cakaran mengerikan menunjuk ke hutan.`;
      }
      return "☀️ Pagi yang aneh... tidak ada korban. Apakah werewolf sedang menunggu? Atau ada yang melindungi?";
    },
    votingStart: "🗳️ Warga berkumpul di balai desa. Ketakutan terlihat di mata semua. 90 detik untuk memutuskan nasib. Siapa yang akan dieksekusi?",
    werewolfWin: "🐺 WEREWOLF MENANG! Serigala melolong kemenangan mereka ke bulan purnama. Desa Moonbrook jatuh gelap.",
    villageWin: "✨ DESA TERSELAMATKAN! Werewolf terakhir tumbang. Warga merayakan dengan lega... tapi trauma tetap tersisa."
  };

  const storyEvents = [
    "🌫️ Kabut tebal merayap dari hutan...",
    "🌙 Bulan tiba-tiba terhalang awan hitam",
    "👻 Pintu tua di ujung desa terbuka sendiri",
    "🔥 Api unggun berubah warna menjadi hijau",
    "💀 Suara rantai terdengar dari bawah",
    "🐺 Auman serigala bergema dari berbagai arah",
    "👁️ Semua terasa diawasi dari bayangan",
    "🌑 Kegelapan semakin pekat, cahaya lilin tipis",
    "⛓️ Rantai gereja patah dengan bunyi keras",
    "🕸️ Sarang laba-laba menutupi jendela"
  ];

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

  const generateBotChat = (botName, phase, currentGameState) => {
    const personality = currentGameState.botPersonalities[botName];
    const profile = botPersonalityProfiles[personality];
    if (!profile) return null;

    const alivePlayers = currentGameState.players.filter(p => p.alive && p.name !== botName);
    const role = currentGameState.roles[botName];

    let message = '';

    if (phase === 'day' && alivePlayers.length > 0) {
      const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      const pattern = profile.chatPatterns[Math.floor(Math.random() * profile.chatPatterns.length)];
      message = pattern.replace('%target%', randomPlayer.name);
      
      if (Math.random() > 0.6 && role === 'werewolf') {
        const humanPlayers = alivePlayers.filter(p => !p.isBot);
        if (humanPlayers.length > 0) {
          const target = humanPlayers[Math.floor(Math.random() * humanPlayers.length)];
          message = profile.chatPatterns[Math.floor(Math.random() * profile.chatPatterns.length)].replace('%target%', target.name);
        }
      }
    } else if (phase === 'voting') {
      const phrases = [
        'Aku voting untuk keputusan terbaik',
        'Saatnya memutuskan nasib desa',
        'Vote diberikan dengan pertimbangan matang',
        'Ini adalah pilihan saya',
        'Semoga keputusan ini benar'
      ];
      message = phrases[Math.floor(Math.random() * phrases.length)];
    } else if (phase === 'night') {
      const nightPhrases = [
        '😰 Malam yang panjang menanti...',
        '🕯️ Semoga fajar datang dengan cepat',
        '😶 Ada yang aneh malam ini',
        '🌙 Malam penuh ketakutan',
        '😔 Aku berharap akan selamat'
      ];
      message = nightPhrases[Math.floor(Math.random() * nightPhrases.length)];
    }

    return message;
  };

  const scheduleBotChat = async (botName, phase, currentGameState, delay = 2000) => {
    if (botChatTimers.current[botName]) {
      clearTimeout(botChatTimers.current[botName]);
    }

    botChatTimers.current[botName] = setTimeout(async () => {
      const message = generateBotChat(botName, phase, currentGameState);
      if (message) {
        const newMsg = {
          id: Date.now() + Math.random(),
          user: botName,
          text: message,
          timestamp: new Date().toISOString(),
          type: 'chat',
          isBot: true
        };
        
        setMessages(prev => [...prev, newMsg]);
        
        if (binId) {
          const currentData = await getBinData(binId);
          if (currentData) {
            await updateBin(binId, { 
              ...currentData, 
              messages: [...currentData.messages, newMsg] 
            });
          }
        }
      }
    }, delay + Math.random() * 3000);
  };

  const injectStoryEvent = async (currentGameState) => {
    const event = storyEvents[Math.floor(Math.random() * storyEvents.length)];
    const eventMsg = {
      id: Date.now(),
      user: 'Desa',
      text: event,
      timestamp: new Date().toISOString(),
      type: 'story'
    };
    
    setMessages(prev => [...prev, eventMsg]);
    
    if (binId) {
      const currentData = await getBinData(binId);
      if (currentData) {
        await updateBin(binId, { 
          ...currentData, 
          messages: [...currentData.messages, eventMsg] 
        });
      }
    }
  };

  const smartBotVoting = (botName, currentGameState) => {
    const personality = currentGameState.botPersonalities[botName];
    const profile = botPersonalityProfiles[personality];
    const alivePlayers = currentGameState.players.filter(p => p.alive && p.name !== botName);
    const suspicionData = currentGameState.suspicionLevels || {};
    
    let target;
    
    if (profile.votingStrategy === 'most_suspected') {
      const sorted = Object.entries(suspicionData)
        .filter(([name]) => alivePlayers.find(p => p.name === name))
        .sort((a, b) => b[1] - a[1]);
      target = sorted.length > 0 ? alivePlayers.find(p => p.name === sorted[0][0]) : null;
    } else if (profile.votingStrategy === 'targets_humans_if_werewolf') {
      const humanPlayers = alivePlayers.filter(p => !p.isBot);
      target = humanPlayers.length > 0 ? humanPlayers[Math.floor(Math.random() * humanPlayers.length)] : alivePlayers[0];
    } else if (profile.votingStrategy === 'follows_majority') {
      const existingVotes = Object.values(currentGameState.votes);
      if (existingVotes.length > 0) {
        const mostVoted = existingVotes.reduce((a, b, i, arr) => 
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        );
        target = alivePlayers.find(p => p.name === mostVoted);
      }
    } else if (profile.votingStrategy === 'completely_random') {
      target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    } else if (profile.votingStrategy === 'deflect_from_self') {
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
        target = humanPlayers.length > 0 ? humanPlayers[Math.floor(Math.random() * humanPlayers.length)] : alivePlayers[0];
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
        const personality = currentGameState.botPersonalities[player.name];
        const profile = botPersonalityProfiles[personality];
        newSuspicion[player.name] = Math.min(1, newSuspicion[player.name] + (profile?.suspicionIncrease || 0.1));
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
    setMyRole(null);
    
    const initialMsg = {
      id: Date.now(),
      user: 'Desa',
      text: storyMessages.lobbyStart,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    setMessages([initialMsg]);
    
    if (binId) {
      await updateBin(binId, { 
        gameState: newGameState, 
        messages: [initialMsg], 
        roomCode, 
        host: roomUsername 
      });
    }
  };

  const addBot = async () => {
    const availableBots = botNames.filter(bot => 
      !gameState.players.find(p => p.name === bot.name)
    );
    
    if (availableBots.length === 0) return;

    const selectedBot = availableBots[Math.floor(Math.random() * availableBots.length)];
    const newPlayers = [...gameState.players, { name: selectedBot.name, alive: true, isBot: true }];
    const newBotPersonalities = { ...gameState.botPersonalities, [selectedBot.name]: selectedBot.personality };
    const newGameState = { ...gameState, players: newPlayers, botPersonalities: newBotPersonalities };
    
    const systemMsg = {
      id: Date.now(),
      user: 'Desa',
      text: `🤖 ${selectedBot.name} (${botPersonalityProfiles[selectedBot.personality].name}) bergabung...`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    setMessages(prev => [...prev, systemMsg]);
    setGameState(newGameState);
    
    if (binId) {
      const currentData = await getBinData(binId);
      if (currentData) {
        await updateBin(binId, { 
          ...currentData,
          gameState: newGameState, 
          messages: [...currentData.messages, systemMsg]
        });
      }
    }
  };

  const createRoom = async () => {
    if (!username.trim()) return;
    
    const code = generateRoomCode();
    setRoomCode(code);
    setRoomUsername(username);
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
        user: 'Desa',
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
    }
    setUsername('');
  };

  const joinRoom = async () => {
    if (inputRoomCode.trim().length !== 6 || !username.trim()) {
      return;
    }
    
    const code = inputRoomCode.toUpperCase();
    setRoomCode(code);
    setRoomUsername(username);
    setIsHost(false);
    setShowRoomModal(false);
    
    const joinMsg = {
      id: Date.now(),
      user: 'Desa',
      text: `👤 ${username} bergabung ke room!`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    setMessages([joinMsg]);
    setUsername('');
  };

  const copyRoomCode = () => {
    const textToCopy = `Room: ${roomCode}\nBin ID: ${binId}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    if (confirm('Keluar dari room?')) {
      setRoomCode('');
      setIsHost(false);
      setBinId('');
      setRoomUsername('');
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
      setShowRoomModal(true);
    }
  };

  const sendMessage = async () => {
    if (inputMessage.trim()) {
      const newMsg = {
        id: Date.now(),
        user: roomUsername,
        text: inputMessage,
        timestamp: new Date().toISOString(),
        type: 'chat'
      };
      
      setMessages(prev => [...prev, newMsg]);
      setInputMessage('');
      
      if (binId) {
        const currentData = await getBinData(binId);
        if (currentData) {
          await updateBin(binId, { 
            ...currentData, 
            messages: [...currentData.messages, newMsg] 
          });
        }
      }
    }
  };

  const handleReady = async () => {
    const newReady = [...gameState.readyPlayers];
    if (!newReady.includes(roomUsername)) {
      newReady.push(roomUsername);
    }
    
    const newGameState = { ...gameState, readyPlayers: newReady };
    
    const systemMsg = {
      id: Date.now(),
      user: 'Desa',
      text: `✅ ${roomUsername} siap bermain (${newReady.length}/${gameState.players.length})`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    setMessages(prev => [...prev, systemMsg]);
    setGameState(newGameState);
    
    if (binId) {
      const currentData = await getBinData(binId);
      if (currentData) {
        await updateBin(binId, { 
          ...currentData,
          gameState: newGameState, 
          messages: [...currentData.messages, systemMsg]
        });
      }
    }
  };

  const startGame = async () => {
    if (gameState.players.length < 4) return;
    if (!roomCode) return;

    const newPlayers = [...gameState.players];
    if (!newPlayers.find(p => p.name === roomUsername)) {
      newPlayers.push({ name: roomUsername, alive: true, isBot: false });
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

    if (playerRoles[roomUsername]) {
      setMyRole(playerRoles[roomUsername]);
    }

    const systemMsg = {
      id: Date.now(),
      user: 'Desa',
      text: storyMessages.nightStart,
      timestamp: new Date().toISOString(),
      type: 'system',
      image: gameImages.night
    };
    
    setMessages(prev => [...prev, systemMsg]);
    setGameState(newGameState);
    setSidebarOpen(false);
    
    if (binId) {
      const currentData = await getBinData(binId);
      if (currentData) {
        await updateBin(binId, { 
          ...currentData,
          gameState: newGameState, 
          messages: [...currentData.messages, systemMsg]
        });
      }
    }
    
    setTimeout(() => {
      newPlayers.filter(p => p.isBot).forEach((bot, idx) => {
        scheduleBotChat(bot.name, 'night', newGameState, 1500 + idx * 800);
      });
    }, 1500);
    
    setTimeout(() => injectStoryEvent(newGameState), 6000);
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
    newActions[roomUsername] = targetName;
    
    const newGameState = { ...gameState, actions: newActions };
    setGameState(newGameState);
    setSidebarOpen(false);
    
    if (binId) {
      const currentData = await getBinData(binId);
      if (currentData) {
        await updateBin(binId, { 
          ...currentData,
          gameState: newGameState
        });
      }
    }
  };

  const handleVote = async (targetPlayer) => {
    const newVotes = { ...gameState.votes };
    newVotes[roomUsername] = targetPlayer;
    
    const newGameState = { ...gameState, votes: newVotes };
    setGameState(newGameState);
    setSidebarOpen(false);
    
    if (binId) {
      const currentData = await getBinData(binId);
      if (currentData) {
        await updateBin(binId, { 
          ...currentData,
          gameState: newGameState
        });
      }
    }
  };

  const nextPhase = async () => {
    let newGameState = { ...gameState };
    
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
      
      const dayMsg = {
        id: Date.now(),
        user: 'Desa',
        text: storyMessages.dayStart(deaths),
        timestamp: new Date().toISOString(),
        type: 'system',
        image: deaths.length > 0 ? gameImages.death : gameImages.day
      };
      
      setMessages(prev => [...prev, dayMsg]);

      const winState = checkWinCondition(newGameState);
      if (winState) {
        const winMsg = {
          id: Date.now() + 1,
          user: 'Desa',
          text: winState,
          timestamp: new Date().toISOString(),
          type: 'system',
          image: winState.includes('GELAP') ? gameImages.werewolfWin : gameImages.villageWin
        };
        setMessages(prev => [...prev, winMsg]);
        newGameState.phase = 'ended';
        newGameState.isTimerRunning = false;
        
        if (binId) {
          const currentData = await getBinData(binId);
          if (currentData) {
            await updateBin(binId, { 
              ...currentData,
              gameState: newGameState,
              messages: [...currentData.messages, dayMsg, winMsg]
            });
          }
        }
        
        setTimeout(() => {
          resetGameAfterWin();
        }, 8000);
      } else {
        newGameState.gameTimer = 90;
        newGameState.suspicionLevels = updateSuspicionLevels(newGameState);
        
        if (binId) {
          const currentData = await getBinData(binId);
          if (currentData) {
            await updateBin(binId, { 
              ...currentData,
              gameState: newGameState,
              messages: [...currentData.messages, dayMsg]
            });
          }
        }
        
        setTimeout(() => {
          newGameState.players.filter(p => p.isBot && p.alive).forEach((bot, idx) => {
            scheduleBotChat(bot.name, 'day', newGameState, 1000 + idx * 700);
          });
        }, 1000);
        setTimeout(() => injectStoryEvent(newGameState), 8000);
      }
      
    } else if (gameState.phase === 'day') {
      newGameState.phase = 'voting';
      newGameState.votes = {};
      
      const votingMsg = {
        id: Date.now(),
        user: 'Desa',
        text: storyMessages.votingStart,
        timestamp: new Date().toISOString(),
        type: 'system',
        image: gameImages.voting
      };
      
      setMessages(prev => [...prev, votingMsg]);

      for (const bot of gameState.players.filter(p => p.isBot && p.alive)) {
        newGameState = smartBotAction(bot.name, 'voting', newGameState);
      }

      newGameState.gameTimer = 90;
      
      if (binId) {
        const currentData = await getBinData(binId);
        if (currentData) {
          await updateBin(binId, { 
            ...currentData,
            gameState: newGameState,
            messages: [...currentData.messages, votingMsg]
          });
        }
      }
      
      setTimeout(() => {
        newGameState.players.filter(p => p.isBot && p.alive).forEach((bot, idx) => {
          scheduleBotChat(bot.name, 'voting', newGameState, 1500 + idx * 700);
        });
      }, 1000);
      
    } else if (gameState.phase === 'voting') {
      const voteCount = {};
      Object.values(gameState.votes).forEach(target => {
        voteCount[target] = (voteCount[target] || 0) + 1;
      });
      
      const executionMsg = [];
      
      if (Object.keys(voteCount).length > 0) {
        const maxVotes = Math.max(...Object.values(voteCount));
        const executed = Object.keys(voteCount).find(k => voteCount[k] === maxVotes);
        
        if (executed) {
          const player = newGameState.players.find(p => p.name === executed);
          if (player) player.alive = false;
          
          executionMsg.push({
            id: Date.now(),
            user: 'Desa',
            text: `⚰️ ${executed} dieksekusi! Mereka adalah... ${gameState.roles[executed]}`,
            timestamp: new Date().toISOString(),
            type: 'system',
            image: gameImages.death
          });
        }
      }
      
      if (executionMsg.length > 0) {
        setMessages(prev => [...prev, ...executionMsg]);
      }
      
      newGameState.phase = 'night';
      newGameState.day += 1;
      newGameState.votes = {};
      newGameState.actions = {};

      const winState = checkWinCondition(newGameState);
      if (winState) {
        const winMsg = {
          id: Date.now() + 2,
          user: 'Desa',
          text: winState,
          timestamp: new Date().toISOString(),
          type: 'system',
          image: winState.includes('GELAP') ? gameImages.werewolfWin : gameImages.villageWin
        };
        setMessages(prev => [...prev, winMsg]);
        newGameState.phase = 'ended';
        newGameState.isTimerRunning = false;
        
        if (binId) {
          const currentData = await getBinData(binId);
          if (currentData) {
            await updateBin(binId, { 
              ...currentData,
              gameState: newGameState,
              messages: [...currentData.messages, ...executionMsg, winMsg]
            });
          }
        }
        
        setTimeout(() => {
          resetGameAfterWin();
        }, 8000);
      } else {
        for (const bot of newGameState.players.filter(p => p.isBot && p.alive)) {
          newGameState = smartBotAction(bot.name, 'night', newGameState);
        }
        newGameState.gameTimer = 90;
        
        const nightMsg = {
          id: Date.now() + 3,
          user: 'Desa',
          text: storyMessages.nightStart,
          timestamp: new Date().toISOString(),
          type: 'system',
          image: gameImages.night
        };
        
        setMessages(prev => [...prev, nightMsg]);
        
        if (binId) {
          const currentData = await getBinData(binId);
          if (currentData) {
            await updateBin(binId, { 
              ...currentData,
              gameState: newGameState,
              messages: [...currentData.messages, ...executionMsg, nightMsg]
            });
          }
        }
        
        setTimeout(() => {
          newGameState.players.filter(p => p.isBot && p.alive).forEach((bot, idx) => {
            scheduleBotChat(bot.name, 'night', newGameState, 1500 + idx * 800);
          });
        }, 1000);
        setTimeout(() => injectStoryEvent(newGameState), 6000);
      }
    }
    
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
    const colors = { werewolf: 'bg-red-900/40 border-red-600', seer: 'bg-purple-900/40 border-purple-600', guard: 'bg-blue-900/40 border-blue-600', villager: 'bg-gray-700/40 border-gray-600' };
    return colors[role] || 'bg-gray-700/40 border-gray-600';
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎭</div>
            <h1 className="text-4xl font-black mb-2 text-blue-300">WEREWOLF</h1>
            <p className="text-blue-400 text-sm font-semibold">Chat & Story Game</p>
          </div>
          
          <div className="space-y-4">
            <div ref={googleButtonRef} className="flex justify-center"></div>
            <p className="text-xs text-blue-300 text-center font-semibold">
              Login dengan Google untuk bermain
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showRoomModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={googleUser?.picture} alt="Profile" className="w-12 h-12 rounded-full border-2 border-blue-500" />
              <div className="text-left">
                <p className="text-sm font-bold text-blue-300">{googleUser?.name}</p>
                <p className="text-xs text-blue-400">{googleUser?.email}</p>
              </div>
            </div>
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-3xl font-black text-blue-300 mb-2">ROOM</h2>
            <p className="text-sm text-blue-400 font-semibold">Buat atau Join</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (inputRoomCode ? joinRoom() : createRoom())}
              placeholder="Username untuk room ini..."
              className="w-full px-5 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-400 font-semibold text-sm placeholder-blue-400/50"
            />
            
            <button
              onClick={createRoom}
              disabled={!username.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-all"
            >
              + BUAT ROOM
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-blue-500/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-slate-900 px-2 text-blue-400">ATAU</span>
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
                className="w-full px-5 py-3 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white text-center font-bold text-2xl tracking-widest focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={joinRoom}
                disabled={!username.trim() || inputRoomCode.length !== 6}
                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-all"
              >
                JOIN ROOM
              </button>
            </div>

            <button
              onClick={handleGoogleLogout}
              className="w-full mt-6 bg-red-900/40 border border-red-600/50 hover:border-red-500 text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-all"
            >
              Logout Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-slate-900/90 backdrop-blur-xl border-b border-blue-500/30 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={googleUser?.picture} alt="Profile" className="w-8 h-8 rounded-full border-2 border-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-blue-300">🎭 WEREWOLF</h1>
              <span className="text-xs sm:text-sm text-blue-400 font-semibold truncate block">@{roomUsername}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            {roomCode && (
              <button onClick={copyRoomCode} className="hidden sm:flex items-center gap-1 bg-slate-800/50 border border-blue-500/30 rounded-lg px-2 sm:px-3 py-1 sm:py-2 font-bold text-xs active:scale-95 transition-all">
                <span className="text-blue-300">{roomCode}</span>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
            {gameState.isTimerRunning && (
              <div className="flex items-center gap-1 bg-red-900/40 border border-red-600/50 rounded-lg px-2 sm:px-3 py-1 sm:py-2 font-bold text-xs animate-pulse">
                <Clock className="w-3 h-4" />
                <span>{gameState.gameTimer}s</span>
              </div>
            )}
            <button onClick={() => setShowPlayerList(!showPlayerList)} className="flex items-center gap-1 bg-slate-800/50 border border-blue-500/30 rounded-lg px-2 sm:px-3 py-1 sm:py-2 font-bold text-xs active:scale-95 transition-all">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">{gameState.players.length}</span>
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-slate-800/50 border border-blue-500/30 rounded-lg active:scale-95 transition-all">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        {gameState.phase !== 'lobby' && gameState.phase !== 'ended' && (
          <div className="mt-3 text-center">
            <div className="inline-block bg-slate-800/50 border border-blue-500/30 rounded-full px-4 py-2 shadow-lg">
              <span className="text-xs sm:text-sm font-black text-blue-300">
                {gameState.phase === 'night' && '🌙 NIGHT'}
                {gameState.phase === 'day' && '☀️ DAY'}
                {gameState.phase === 'voting' && '🗳️ VOTING'}
                {gameState.day > 0 && ` | DAY ${gameState.day}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Player List Modal */}
      {showPlayerList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-end sm:items-center sm:justify-center p-4" onClick={() => setShowPlayerList(false)}>
          <div className="w-full sm:max-w-sm bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-h-[70vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-black text-blue-300">PLAYERS ({gameState.players.length})</h3>
              <button onClick={() => setShowPlayerList(false)} className="p-2 hover:bg-slate-800/50 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {gameState.players.map((player, idx) => (
                <div key={idx} className={`flex items-center justify-between bg-slate-800/50 border ${getRoleColor(gameState.roles[player.name])} rounded-lg p-3 text-sm`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {player.name[0]}
                    </div>
                    <span className="font-semibold truncate">{player.name} {player.isBot && '🤖'}</span>
                  </div>
                  {!player.alive && <Skull className="w-5 h-5 text-red-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Menu */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-64 sm:w-72 max-w-[85vw] bg-slate-900/95 backdrop-blur-xl border-l border-blue-500/30 overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg sm:text-xl font-black text-blue-300">MENU</h3>
                <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-slate-800/50 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Role Card */}
              {myRole && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-blue-400 mb-3 tracking-wider uppercase">YOUR ROLE</h4>
                  <div className={`${getRoleColor(myRole)} border-2 rounded-xl p-4 text-center`}>
                    <div className="text-5xl mb-2">{getRoleEmoji(myRole)}</div>
                    <div className="text-lg font-black text-blue-300 uppercase">{myRole}</div>
                  </div>
                </div>
              )}

              {/* Lobby Controls */}
              {gameState.phase === 'lobby' && isHost && (
                <div className="space-y-3 mb-6">
                  <button onClick={addBot} className="w-full bg-slate-800/50 border border-blue-500/30 hover:border-blue-400 rounded-lg py-3 font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    ADD BOT
                  </button>
                  <button 
                    onClick={handleReady} 
                    className={`w-full border-2 rounded-lg py-3 font-bold text-sm active:scale-95 transition-all ${gameState.readyPlayers.includes(roomUsername) ? 'bg-green-900/40 border-green-600 text-green-300' : 'bg-slate-800/50 border-blue-500/30 hover:border-blue-400'}`}
                    disabled={gameState.readyPlayers.includes(roomUsername)}
                  >
                    {gameState.readyPlayers.includes(roomUsername) ? '✅ READY' : 'READY'}
                  </button>
                  <button 
                    onClick={startGame} 
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg py-4 font-bold text-base active:scale-95 transition-all"
                    disabled={gameState.players.length < 4}
                  >
                    START GAME
                  </button>
                  <p className="text-xs text-blue-300 text-center font-semibold">
                    {gameState.readyPlayers.length}/{gameState.players.length} ready • Min. 4 players
                  </p>
                </div>
              )}

              {/* Night Skills */}
              {gameState.phase === 'night' && myRole && myRole !== 'villager' && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-blue-400 mb-3 flex items-center gap-2 tracking-wider uppercase">
                    <Zap className="w-4 h-4" />
                    USE SKILL
                  </h4>
                  <div className="space-y-2">
                    {gameState.players.filter(p => p.alive && p.name !== roomUsername).map((player, idx) => (
                      <button
                        key={idx}
                        onClick={() => useSkill(player.name)}
                        className="w-full bg-slate-800/50 border border-blue-500/30 hover:border-blue-400 disabled:border-slate-600 rounded-lg p-3 text-sm font-semibold active:scale-95 transition-all flex items-center justify-between"
                        disabled={gameState.actions[roomUsername]}
                      >
                        <span>{player.name}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                  {gameState.actions[roomUsername] && <p className="mt-3 text-xs text-green-400 text-center font-bold">✅ Used</p>}
                </div>
              )}

              {/* Voting */}
              {gameState.phase === 'voting' && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-blue-400 mb-3 flex items-center gap-2 tracking-wider uppercase">
                    <Target className="w-4 h-4" />
                    VOTE
                  </h4>
                  <div className="space-y-2">
                    {gameState.players.filter(p => p.alive && p.name !== roomUsername).map((player, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleVote(player.name)}
                        className="w-full bg-red-900/30 border border-red-600/50 hover:border-red-500 disabled:border-slate-600 rounded-lg p-3 text-sm font-semibold active:scale-95 transition-all flex items-center justify-between"
                        disabled={gameState.votes[roomUsername]}
                      >
                        <span>{player.name}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                  {gameState.votes[roomUsername] && <p className="mt-3 text-xs text-green-400 text-center font-bold">✅ Voted</p>}
                </div>
              )}

              {/* Menu Buttons */}
              <div className="space-y-3 border-t border-blue-500/30 pt-4">
                <button onClick={() => { setShowTutorial(true); setSidebarOpen(false); }} className="w-full bg-slate-800/50 border border-blue-500/30 hover:border-blue-400 rounded-lg py-3 font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Info className="w-4 h-4" />
                  TUTORIAL
                </button>
                <button onClick={leaveRoom} className="w-full bg-red-900/40 border border-red-600/50 hover:border-red-500 rounded-lg py-3 font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" />
                  LEAVE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center p-4" onClick={() => setShowTutorial(false)}>
          <div className="w-full sm:max-w-md bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-2xl font-black text-blue-300">HOW TO PLAY</h2>
              <button onClick={() => setShowTutorial(false)} className="p-2 hover:bg-slate-800/50 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3">
                <h3 className="text-red-300 font-bold mb-1 flex items-center gap-2">🐺 WEREWOLF</h3>
                <p className="text-blue-200/80">Bunuh warga malam hari. Menang jika sama dengan jumlah warga.</p>
              </div>

              <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-3">
                <h3 className="text-purple-300 font-bold mb-1 flex items-center gap-2">🔮 SEER</h3>
                <p className="text-blue-200/80">Lihat role pemain malam hari untuk bantu warga.</p>
              </div>

              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
                <h3 className="text-blue-300 font-bold mb-1 flex items-center gap-2">🛡️ GUARD</h3>
                <p className="text-blue-200/80">Lindungi pemain dari serangan werewolf.</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3">
                <h3 className="text-slate-300 font-bold mb-1">👤 VILLAGER</h3>
                <p className="text-blue-200/80">Voting untuk temukan werewolf di hari.</p>
              </div>
            </div>

            <button onClick={() => setShowTutorial(false)} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-sm active:scale-95 transition-all">
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'system' || msg.type === 'story' ? 'justify-center' : msg.user === roomUsername ? 'justify-end' : 'justify-start'}`}>
            {msg.type === 'system' ? (
              <div className="max-w-xs sm:max-w-md">
                {msg.image && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-blue-500/30 shadow-lg">
                    <img src={msg.image} alt="Game" className="w-full h-40 sm:h-48 object-cover" />
                  </div>
                )}
                <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg px-3 sm:px-4 py-2 sm:py-3 shadow-lg">
                  <p className="text-xs sm:text-sm font-semibold text-yellow-100 text-center leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ) : msg.type === 'story' ? (
              <div className="bg-slate-800/50 border border-blue-500/30 rounded-lg px-3 sm:px-4 py-2 sm:py-3 max-w-xs sm:max-w-md shadow-lg">
                <p className="text-xs sm:text-sm font-semibold text-blue-200 text-center italic leading-relaxed">{msg.text}</p>
              </div>
            ) : (
              <div className={`max-w-xs sm:max-w-sm rounded-lg shadow-lg ${msg.user === roomUsername ? 'bg-blue-600/70' : 'bg-slate-800/70'}`}>
                {msg.user !== roomUsername && (
                  <div className="flex items-center gap-2 px-3 sm:px-4 pt-2 pb-1">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {msg.user[0]}
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-blue-200 truncate">
                      {msg.user} {gameState.players.find(p => p.name === msg.user)?.isBot && '🤖'}
                    </span>
                  </div>
                )}
                <div className="px-3 sm:px-4 pb-2">
                  <p className="text-white text-xs sm:text-sm break-words leading-relaxed">{msg.text}</p>
                  <span className="text-[10px] sm:text-xs text-gray-400 mt-1 block text-right">
                    {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-slate-900/90 backdrop-blur-xl border-t border-blue-500/30 p-3 sm:p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Chat..."
            className="flex-1 px-4 py-2 sm:py-3 bg-slate-800/50 border border-blue-500/30 rounded-full text-white focus:outline-none focus:border-blue-400 font-semibold text-xs sm:text-sm placeholder-blue-400/50"
          />
          <button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 rounded-full active:scale-95 transition-all flex items-center justify-center">
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WerewolfChatGame;