import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Skull, Info, UserPlus, Clock, Copy, Check, LogOut, Zap, Target, X, ChevronRight, Wifi, WifiOff, RefreshCw } from 'lucide-react';

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
  const [inputBinId, setInputBinId] = useState('');
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
    protectedPlayers: [],
    day: 0,
    gameTimer: 90,
    isTimerRunning: false,
    suspicionLevels: {},
    botPersonalities: {},
    lastBotChat: {}
  });
  const [myRole, setMyRole] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [binId, setBinId] = useState('');
  const messagesEndRef = useRef(null);
  const timerInterval = useRef(null);
  const botChatTimers = useRef({});
  const googleButtonRef = useRef(null);
  const syncInterval = useRef(null);

  const JSONBIN_API_KEY = '$2a$10$PsVzgljojE5fq8qZRmpE4uzMr0K9LArqfmumGVSmNY.P8F2iTKrim';
  const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';
  const GOOGLE_CLIENT_ID = '779631712094-6t77ptt5366r218o80pmijmeelboj25g.apps.googleusercontent.com';

  const gameImages = {
    night: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=800',
    day: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
    voting: 'https://images.unsplash.com/photo-1529236183275-4fdcf2bc987e?w=800',
    death: 'https://images.unsplash.com/photo-1509803874385-db7c23652552?w=800',
    werewolfWin: 'https://images.unsplash.com/photo-1589802829985-817e51171b92?w=800',
    villageWin: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800'
  };

  const botPersonalityProfiles = {
    aggressive: { name: 'Agresif', chatPatterns: { accusation: ['Tunggu... %target%, kamu terlalu tenang!', 'Aku yakin %target% mencurigakan!', '%target% pasti werewolf!'], general: ['Situasi makin gawat...', 'Kita harus cepat!'] }, votingStrategy: 'targets_humans_if_werewolf', suspicionIncrease: 0.15 },
    analytical: { name: 'Analitis', chatPatterns: { accusation: ['Data menunjukkan %target% mencurigakan', 'Probabilitas %target% sebagai werewolf tinggi'], general: ['Kita perlu analisis...', 'Mari review data'] }, votingStrategy: 'most_suspected', suspicionIncrease: 0.10 },
    defensive: { name: 'Defensif', chatPatterns: { accusation: ['%target% acting sus...'], general: ['Situasi bikin stress...'] }, votingStrategy: 'follows_majority', suspicionIncrease: 0.08 },
    mysterious: { name: 'Misterius', chatPatterns: { accusation: ['...', '%target%... interesting'], general: ['...', 'Menarik...'] }, votingStrategy: 'follows_majority', suspicionIncrease: 0.12 },
    chaotic: { name: 'Kacau', chatPatterns: { accusation: ['Vote %target% aja! 🎲'], general: ['YOLO!', 'This is wild!'] }, votingStrategy: 'completely_random', suspicionIncrease: 0.05 }
  };

  const botNames = [
    { name: 'Raven', personality: 'aggressive' }, { name: 'Cipher', personality: 'analytical' }, { name: 'Nova', personality: 'mysterious' }, 
    { name: 'Blaze', personality: 'chaotic' }, { name: 'Echo', personality: 'defensive' }, { name: 'Shadow', personality: 'aggressive' }
  ];

  const storyMessages = {
    lobbyStart: "🎭 Desa Moonbrook, 1823\n\nKabut tebal menyelimuti desa. Auman serigala terdengar 3 malam berturut.\n\nSeseorang di sini... bukan manusia.",
    nightStart: (day) => `🌙 MALAM ${day}\n\nBulan merah darah. Pintu dikunci rapat. Di kegelapan, sesuatu bergerak...`,
    dayStart: (deaths) => deaths.length > 0 ? `☀️ PAGI\n\n*BANG BANG*\n\nTeriakan pecah! Tubuh ${deaths.join(', ')} ditemukan.\n\nJejak cakaran menuju desa...` : `☀️ PAGI\n\nTidak ada korban... Werewolf menunggu?`,
    votingStart: (day) => `🗳️ VOTING - HARI ${day}\n\nBalai desa. Tension memuncak.\n\n⏰ 90 detik untuk memutuskan.`,
    execution: (name, role, votes) => `⚰️ ${name} dieksekusi!\n\nMereka adalah: ${role.toUpperCase()}\n\n(${votes} votes)`,
    werewolfWin: () => `🐺 WEREWOLF MENANG!\n\nSerigala melolong kemenangan.\nDesa jatuh...`,
    villageWin: (name) => `✨ DESA SELAMAT!\n\nWerewolf ${name || 'terakhir'} tumbang!\nDesa terselamatkan!`
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const createBin = async (roomData) => {
    try {
      const response = await fetch(`${JSONBIN_BASE_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY, 'X-Bin-Name': `werewolf_${roomData.roomCode}` },
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
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
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
      const response = await fetch(`${JSONBIN_BASE_URL}/${binId}/latest`, { headers: { 'X-Master-Key': JSONBIN_API_KEY } });
      const data = await response.json();
      setIsConnected(true);
      return data.record;
    } catch (error) {
      console.error('Error getting bin:', error);
      setIsConnected(false);
      return null;
    }
  };

  const syncGameState = async (syncBinId, syncUsername) => {
    setIsReconnecting(true);
    const data = await getBinData(syncBinId);
    if (data) {
      let updatedPlayers = [...data.gameState.players];
      if (!updatedPlayers.find(p => p.name === syncUsername)) {
        updatedPlayers.push({ name: syncUsername, alive: true, isBot: false });
      }
      setGameState({ ...data.gameState, players: updatedPlayers });
      setMessages(data.messages || []);
      if (data.gameState?.roles && syncUsername) {
        const role = data.gameState.roles[syncUsername];
        if (role) setMyRole(role);
      }
      const reconnectMsg = { id: Date.now(), user: 'Sistem', text: `🔄 ${syncUsername} reconnected!`, timestamp: new Date().toISOString(), type: 'system' };
      setMessages(prev => [...prev, reconnectMsg]);
      await updateBin(syncBinId, { ...data, gameState: { ...data.gameState, players: updatedPlayers }, messages: [...data.messages, reconnectMsg] });
    }
    setIsReconnecting(false);
  };

  useEffect(() => {
    loadGoogleScript().then(() => {
      const savedGoogleUser = localStorage.getItem('werewolf_google_user');
      if (savedGoogleUser) {
        try {
          const user = JSON.parse(savedGoogleUser);
          setGoogleUser(user);
          setIsLoggedIn(true);
          const savedRoom = localStorage.getItem('werewolf_active_room');
          if (savedRoom) {
            try {
              const roomData = JSON.parse(savedRoom);
              setRoomCode(roomData.roomCode);
              setRoomUsername(roomData.username);
              setIsHost(roomData.isHost);
              setBinId(roomData.binId);
              setShowRoomModal(false);
              syncGameState(roomData.binId, roomData.username);
            } catch (e) {
              localStorage.removeItem('werewolf_active_room');
              setShowRoomModal(true);
            }
          } else {
            setShowRoomModal(true);
          }
        } catch (e) {
          localStorage.removeItem('werewolf_google_user');
        }
      }
      if (window.google) {
        window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleLogin });
      }
    });
  }, []);

  useEffect(() => {
    if (binId && roomCode && !isReconnecting) {
      syncInterval.current = setInterval(async () => {
        const data = await getBinData(binId);
        if (data) {
          if (JSON.stringify(gameState) !== JSON.stringify(data.gameState)) {
            setGameState(data.gameState);
            if (data.gameState?.roles && roomUsername) {
              const role = data.gameState.roles[roomUsername];
              if (role) setMyRole(role);
            }
          }
          if (data.messages.length > messages.length) {
            setMessages(data.messages);
          }
        }
      }, 3000);
    }
    return () => { if (syncInterval.current) clearInterval(syncInterval.current); };
  }, [binId, roomCode, isReconnecting]);

  useEffect(() => {
    const renderGoogleButton = () => {
      if (googleButtonRef.current && window.google && !isLoggedIn) {
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, { theme: "filled_blue", size: "large", width: Math.min(350, window.innerWidth - 80), text: "signin_with" });
      }
    };
    renderGoogleButton();
    const timer = setTimeout(renderGoogleButton, 500);
    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  const handleGoogleLogin = (response) => {
    const userObject = parseJwt(response.credential);
    const googleUserData = { email: userObject.email, name: userObject.name, picture: userObject.picture, sub: userObject.sub };
    setGoogleUser(googleUserData);
    setIsLoggedIn(true);
    setShowRoomModal(true);
    localStorage.setItem('werewolf_google_user', JSON.stringify(googleUserData));
  };

  const parseJwt = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  };

  const handleGoogleLogout = () => {
    if (confirm('Logout dari akun Google?')) {
      setGoogleUser(null);
      setIsLoggedIn(false);
      localStorage.removeItem('werewolf_google_user');
      localStorage.removeItem('werewolf_active_room');
      setRoomCode('');
      setIsHost(false);
      setBinId('');
      setGameState({ players: [], phase: 'lobby', roles: {}, votes: {}, actions: {}, deaths: [], protectedPlayers: [], day: 0, gameTimer: 90, isTimerRunning: false, suspicionLevels: {}, botPersonalities: {}, lastBotChat: {} });
      setMessages([]);
      setMyRole(null);
      setRoomUsername('');
      setShowRoomModal(false);
      if (window.google) window.google.accounts.id.disableAutoSelect();
    }
  };

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const generateBotChat = (botName, phase, currentGameState) => {
    const personality = currentGameState.botPersonalities[botName];
    const profile = botPersonalityProfiles[personality];
    if (!profile) return null;
    const alivePlayers = currentGameState.players.filter(p => p.alive && p.name !== botName);
    const lastChat = currentGameState.lastBotChat?.[botName] || 0;
    if (Date.now() - lastChat < 8000 || alivePlayers.length === 0) return null;
    let message = '';
    if (phase === 'day' && Math.random() > 0.5) {
      const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      const patterns = profile.chatPatterns.accusation;
      message = patterns[Math.floor(Math.random() * patterns.length)].replace('%target%', target.name);
    } else {
      const patterns = profile.chatPatterns.general;
      message = patterns[Math.floor(Math.random() * patterns.length)];
    }
    return message;
  };

  const scheduleBotChat = async (botName, phase, currentGameState, delay = 3000) => {
    if (botChatTimers.current[botName]) clearTimeout(botChatTimers.current[botName]);
    botChatTimers.current[botName] = setTimeout(async () => {
      const message = generateBotChat(botName, phase, currentGameState);
      if (message) {
        const newMsg = { id: Date.now() + Math.random(), user: botName, text: message, timestamp: new Date().toISOString(), type: 'chat', isBot: true };
        setMessages(prev => [...prev, newMsg]);
        const updatedState = { ...currentGameState, lastBotChat: { ...currentGameState.lastBotChat, [botName]: Date.now() } };
        if (binId) {
          const currentData = await getBinData(binId);
          if (currentData) await updateBin(binId, { ...currentData, gameState: updatedState, messages: [...currentData.messages, newMsg] });
        }
      }
    }, delay + Math.random() * 2000);
  };

  const smartBotVoting = (botName, currentGameState) => {
    const alivePlayers = currentGameState.players.filter(p => p.alive && p.name !== botName);
    if (alivePlayers.length === 0) return null;
    const personality = currentGameState.botPersonalities[botName];
    const profile = botPersonalityProfiles[personality];
    const suspicionData = currentGameState.suspicionLevels || {};
    let target;
    if (profile.votingStrategy === 'most_suspected') {
      const sorted = Object.entries(suspicionData).filter(([name]) => alivePlayers.find(p => p.name === name)).sort((a, b) => b[1] - a[1]);
      target = sorted.length > 0 ? alivePlayers.find(p => p.name === sorted[0][0]) : null;
    } else if (profile.votingStrategy === 'targets_humans_if_werewolf') {
      const humanPlayers = alivePlayers.filter(p => !p.isBot);
      target = humanPlayers.length > 0 ? humanPlayers[Math.floor(Math.random() * humanPlayers.length)] : null;
    } else if (profile.votingStrategy === 'follows_majority') {
      const existingVotes = Object.values(currentGameState.votes);
      if (existingVotes.length > 0) {
        const mostVoted = existingVotes.reduce((a, b, i, arr) => arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b);
        target = alivePlayers.find(p => p.name === mostVoted);
      }
    } else {
      target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    }
    if (!target && alivePlayers.length > 0) target = alivePlayers[0];
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
      } else if (role === 'seer' || role === 'guard') {
        target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
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
      if (!newSuspicion[player.name]) newSuspicion[player.name] = Math.random() * 0.3;
      if (currentGameState.votes[player.name]) newSuspicion[player.name] = Math.min(1, newSuspicion[player.name] + 0.15);
      newSuspicion[player.name] = Math.max(0, newSuspicion[player.name] + (Math.random() - 0.5) * 0.1);
    });
    return newSuspicion;
  };

  const resetGameAfterWin = async () => {
    const newGameState = { players: gameState.players.map(p => ({ ...p, alive: true })), phase: 'lobby', roles: {}, votes: {}, actions: {}, deaths: [], protectedPlayers: [], day: 0, gameTimer: 90, isTimerRunning: false, suspicionLevels: {}, botPersonalities: gameState.botPersonalities, lastBotChat: {} };
    setGameState(newGameState);
    setMyRole(null);
    const initialMsg = { id: Date.now(), user: 'Desa', text: storyMessages.lobbyStart, timestamp: new Date().toISOString(), type: 'system' };
    setMessages([initialMsg]);
    if (binId) await updateBin(binId, { gameState: newGameState, messages: [initialMsg], roomCode });
  };

  const addBot = async () => {
    const availableBots = botNames.filter(bot => !gameState.players.find(p => p.name === bot.name));
    if (availableBots.length === 0) return;
    const selectedBot = availableBots[Math.floor(Math.random() * availableBots.length)];
    const newPlayers = [...gameState.players, { name: selectedBot.name, alive: true, isBot: true }];
    const newBotPersonalities = { ...gameState.botPersonalities, [selectedBot.name]: selectedBot.personality };
    const newGameState = { ...gameState, players: newPlayers, botPersonalities: newBotPersonalities };
    const systemMsg = { id: Date.now(), user: 'Desa', text: `🤖 ${selectedBot.name} bergabung!`, timestamp: new Date().toISOString(), type: 'system' };
    setMessages(prev => [...prev, systemMsg]);
    setGameState(newGameState);
    if (binId) {
      const currentData = await getBinData(binId);
      if (currentData) await updateBin(binId, { ...currentData, gameState: newGameState, messages: [...currentData.messages, systemMsg] });
    }
  };

  const createRoom = async () => {
    if (!username.trim()) return;
    const code = generateRoomCode();
    setRoomCode(code);
    setRoomUsername(username);
    setIsHost(true);
    setShowRoomModal(false);
    const initialData = { roomCode: code, gameState: { players: [{ name: username, alive: true, isBot: false }], phase: 'lobby', roles: {}, votes: {}, actions: {}, deaths: [], protectedPlayers: [], day: 0, gameTimer: 90, isTimerRunning: false, suspicionLevels: {}, botPersonalities: {}, lastBotChat: {} }, messages: [{ id: Date.now(), user: 'Desa', text: storyMessages.lobbyStart, timestamp: new Date().toISOString(), type: 'system' }] };
    const newBinId = await createBin(initialData);
    if (newBinId) {
      setBinId(newBinId);
      setGameState(initialData.gameState);
      setMessages(initialData.messages);
      localStorage.setItem('werewolf_active_room', JSON.stringify({ roomCode: code, username: username, isHost: true, binId: newBinId }));
    }
    setUsername('');
  };

  const joinRoom = async () => {
    if (inputRoomCode.trim().length !== 6 || !username.trim() || !inputBinId.trim()) {
      alert('Masukkan Room Code, Bin ID, dan Username!');
      return;
    }
    const code = inputRoomCode.toUpperCase();
    setRoomCode(code);
    setRoomUsername(username);
    setIsHost(false);
    setShowRoomModal(false);
    setBinId(inputBinId);
    localStorage.setItem('werewolf_active_room', JSON.stringify({ roomCode: code, username: username, isHost: false, binId: inputBinId }));
    const currentData = await getBinData(inputBinId);
    if (currentData) {
      let updatedPlayers = [...currentData.gameState.players];
      if (!updatedPlayers.find(p => p.name === username)) {
        updatedPlayers.push({ name: username, alive: true, isBot: false });
      }
      const joinMsg = { id: Date.now(), user: 'Desa', text: `👤 ${username} bergabung ke room!`, timestamp: new Date().toISOString(), type: 'system' };
      await updateBin(inputBinId, { ...currentData, gameState: { ...currentData.gameState, players: updatedPlayers }, messages: [...currentData.messages, joinMsg] });
      setGameState({ ...currentData.gameState, players: updatedPlayers });
      setMessages([...currentData.messages, joinMsg]);
    }
    setUsername('');
    setInputRoomCode('');
    setInputBinId('');
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(`Room: ${roomCode}\nBin ID: ${binId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    if (confirm('Keluar dari room? (Kamu bisa join lagi dengan Room Code & Bin ID)')) {
      setShowRoomModal(true);
    }
  };

  const sendMessage = async () => {
    if (inputMessage.trim()) {
      const newMsg = { id: Date.now(), user: roomUsername, text: inputMessage, timestamp: new Date().toISOString(), type: 'chat' };
      setMessages(prev => [...prev, newMsg]);
      setInputMessage('');
      if (binId) {
        const currentData = await getBinData(binId);
        if (currentData) await updateBin(binId, { ...currentData, messages: [...currentData.messages, newMsg] });
      }
    }
  };

  const startGame = async () => {
    if (gameState.players.length < 4) return;
    const newPlayers = [...gameState.players];
    const playerRoles = {};
    const shuffled = [...newPlayers].sort(() => Math.random() - 0.5);
    shuffled.forEach((player, idx) => {
      if (idx === 0) playerRoles[player.name] = 'werewolf';
      else if (idx === 1) playerRoles[player.name] = 'seer';
      else if (idx === 2) playerRoles[player.name] = 'guard';
      else playerRoles[player.name] = 'villager';
    });
    let newGameState = { ...gameState, players: newPlayers, phase: 'night', roles: playerRoles, day: 1, actions: {}, votes: {}, gameTimer: 90, isTimerRunning: true, suspicionLevels: {}, lastBotChat: {} };
    for (const player of newPlayers.filter(p => p.isBot)) {
      newGameState = smartBotAction(player.name, 'night', newGameState);
    }
    if (playerRoles[roomUsername]) setMyRole(playerRoles[roomUsername]);
    const systemMsg = { id: Date.now(), user: 'Desa', text: storyMessages.nightStart(1), timestamp: new Date().toISOString(), type: 'system', image: gameImages.night };
    setMessages(prev => [...prev, systemMsg]);
    setGameState(newGameState);
    if (binId) {
      const currentData = await getBinData(binId);
      if (currentData) await updateBin(binId, { ...currentData, gameState: newGameState, messages: [...currentData.messages, systemMsg] });
    }
    setTimeout(() => {
      newPlayers.filter(p => p.isBot).forEach((bot, idx) => {
        scheduleBotChat(bot.name, 'night', newGameState, 3000 + idx * 2000);
      });
    }, 2000);
  };

  useEffect(() => {
    if (gameState.isTimerRunning && gameState.gameTimer > 0) {
      timerInterval.current = setTimeout(() => {
        setGameState(prev => ({ ...prev, gameTimer: prev.gameTimer - 1 }));
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
    if (binId) {
      const currentData = await getBinData(binId);
      if (currentData) await updateBin(binId, { ...currentData, gameState: newGameState });
    }
  };

  const handleVote = async (targetPlayer) => {
    const newVotes = { ...gameState.votes };
    newVotes[roomUsername] = targetPlayer;
    const newGameState = { ...gameState, votes: newVotes };
    setGameState(newGameState);
    if (binId) {
      const currentData = await getBinData(binId);
      if (currentData) await updateBin(binId, { ...currentData, gameState: newGameState });
    }
  };

  const nextPhase = async () => {
    let newGameState = { ...gameState };
    if (gameState.phase === 'night') {
      const deaths = [];
      const protectedPlayers = new Set();
      Object.entries(gameState.actions).forEach(([player, target]) => {
        const role = gameState.roles[player];
        if (role === 'guard') protectedPlayers.add(target);
      });
      Object.entries(gameState.actions).forEach(([player, target]) => {
        const role = gameState.roles[player];
        if (role === 'werewolf' && !protectedPlayers.has(target)) deaths.push(target);
      });
      newGameState.phase = 'day';
      newGameState.deaths = deaths;
      newGameState.protectedPlayers = Array.from(protectedPlayers);
      newGameState.actions = {};
      deaths.forEach(name => {
        const player = newGameState.players.find(p => p.name === name);
        if (player) player.alive = false;
      });
      const dayMsg = { id: Date.now(), user: 'Desa', text: storyMessages.dayStart(deaths), timestamp: new Date().toISOString(), type: 'system', image: deaths.length > 0 ? gameImages.death : gameImages.day };
      setMessages(prev => [...prev, dayMsg]);
      const winState = checkWinCondition(newGameState);
      if (winState) {
        const winMsg = { id: Date.now() + 1, user: 'Desa', text: winState, timestamp: new Date().toISOString(), type: 'system', image: winState.includes('WEREWOLF') ? gameImages.werewolfWin : gameImages.villageWin };
        setMessages(prev => [...prev, winMsg]);
        newGameState.phase = 'ended';
        newGameState.isTimerRunning = false;
        if (binId) {
          const currentData = await getBinData(binId);
          if (currentData) await updateBin(binId, { ...currentData, gameState: newGameState, messages: [...currentData.messages, dayMsg, winMsg] });
        }
        setTimeout(() => resetGameAfterWin(), 10000);
      } else {
        newGameState.gameTimer = 90;
        newGameState.suspicionLevels = updateSuspicionLevels(newGameState);
        if (binId) {
          const currentData = await getBinData(binId);
          if (currentData) await updateBin(binId, { ...currentData, gameState: newGameState, messages: [...currentData.messages, dayMsg] });
        }
        setTimeout(() => {
          newGameState.players.filter(p => p.isBot && p.alive).forEach((bot, idx) => {
            scheduleBotChat(bot.name, 'day', newGameState, 3000 + idx * 2000);
          });
        }, 3000);
      }
    } else if (gameState.phase === 'day') {
      newGameState.phase = 'voting';
      newGameState.votes = {};
      const votingMsg = { id: Date.now(), user: 'Desa', text: storyMessages.votingStart(gameState.day), timestamp: new Date().toISOString(), type: 'system', image: gameImages.voting };
      setMessages(prev => [...prev, votingMsg]);
      for (const bot of gameState.players.filter(p => p.isBot && p.alive)) {
        newGameState = smartBotAction(bot.name, 'voting', newGameState);
      }
      newGameState.gameTimer = 90;
      if (binId) {
        const currentData = await getBinData(binId);
        if (currentData) await updateBin(binId, { ...currentData, gameState: newGameState, messages: [...currentData.messages, votingMsg] });
      }
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
          if (player) {
            player.alive = false;
            executionMsg.push({ id: Date.now(), user: 'Desa', text: storyMessages.execution(executed, gameState.roles[executed], maxVotes), timestamp: new Date().toISOString(), type: 'system', image: gameImages.death });
          }
        }
      }
      if (executionMsg.length > 0) setMessages(prev => [...prev, ...executionMsg]);
      newGameState.phase = 'night';
      newGameState.day += 1;
      newGameState.votes = {};
      newGameState.actions = {};
      const winState = checkWinCondition(newGameState);
      if (winState) {
        const executed = Object.keys(voteCount).find(k => voteCount[k] === Math.max(...Object.values(voteCount)));
        const winMsg = { id: Date.now() + 2, user: 'Desa', text: winState.includes('WEREWOLF') ? storyMessages.werewolfWin() : storyMessages.villageWin(executed), timestamp: new Date().toISOString(), type: 'system', image: winState.includes('WEREWOLF') ? gameImages.werewolfWin : gameImages.villageWin };
        setMessages(prev => [...prev, winMsg]);
        newGameState.phase = 'ended';
        newGameState.isTimerRunning = false;
        if (binId) {
          const currentData = await getBinData(binId);
          if (currentData) await updateBin(binId, { ...currentData, gameState: newGameState, messages: [...currentData.messages, ...executionMsg, winMsg] });
        }
        setTimeout(() => resetGameAfterWin(), 10000);
      } else {
        for (const bot of newGameState.players.filter(p => p.isBot && p.alive)) {
          newGameState = smartBotAction(bot.name, 'night', newGameState);
        }
        newGameState.gameTimer = 90;
        const nightMsg = { id: Date.now() + 3, user: 'Desa', text: storyMessages.nightStart(newGameState.day), timestamp: new Date().toISOString(), type: 'system', image: gameImages.night };
        setMessages(prev => [...prev, nightMsg]);
        if (binId) {
          const currentData = await getBinData(binId);
          if (currentData) await updateBin(binId, { ...currentData, gameState: newGameState, messages: [...currentData.messages, ...executionMsg, nightMsg] });
        }
        setTimeout(() => {
          newGameState.players.filter(p => p.isBot && p.alive).forEach((bot, idx) => {
            scheduleBotChat(bot.name, 'night', newGameState, 3000 + idx * 2000);
          });
        }, 2000);
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
    if (werewolfCount === 0) return storyMessages.villageWin;
    else if (werewolfCount >= villageCount) return storyMessages.werewolfWin;
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

  const isPlayerAlive = gameState.players.find(p => p.name === roomUsername)?.alive !== false;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎭</div>
            <h1 className="text-4xl font-black mb-2 text-blue-300">WEREWOLF</h1>
            <p className="text-blue-400 text-sm font-semibold">Story-Driven Social Deduction</p>
          </div>
          <div className="space-y-4">
            <div ref={googleButtonRef} className="flex justify-center"></div>
            <p className="text-xs text-blue-300 text-center font-semibold">Login dengan Google untuk bermain</p>
          </div>
        </div>
      </div>
    );
  }

  if (showRoomModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={googleUser?.picture} alt="Profile" className="w-12 h-12 rounded-full border-2 border-blue-500" />
              <div className="text-left">
                <p className="text-sm font-bold text-blue-300">{googleUser?.name}</p>
                <p className="text-xs text-blue-400">{googleUser?.email}</p>
              </div>
            </div>
            <div className="text-5xl mb-3">🎮</div>
            <h2 className="text-2xl font-black text-blue-300 mb-1">ROOM</h2>
            <p className="text-xs text-blue-400 font-semibold">Buat atau Join Room</p>
          </div>
          <div className="space-y-3">
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && createRoom()} placeholder="Username..." className="w-full px-4 py-2.5 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white focus:outline-none focus:border-blue-400 font-semibold text-sm placeholder-blue-400/50" />
            <button onClick={createRoom} disabled={!username.trim()} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-base active:scale-95 transition-all">+ BUAT ROOM</button>
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-blue-500/30"></div></div>
              <div className="relative flex justify-center text-xs"><span className="bg-slate-900 px-2 text-blue-400">ATAU JOIN</span></div>
            </div>
            <div className="space-y-2">
              <input type="text" value={inputRoomCode} onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" maxLength={6} className="w-full px-4 py-2.5 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white text-center font-bold text-lg tracking-widest focus:outline-none focus:border-blue-400" />
              <input type="text" value={inputBinId} onChange={(e) => setInputBinId(e.target.value)} placeholder="BIN ID" className="w-full px-4 py-2.5 bg-slate-800/50 border border-blue-500/30 rounded-xl text-white text-center font-mono text-sm focus:outline-none focus:border-blue-400" />
              <button onClick={joinRoom} disabled={!username.trim() || inputRoomCode.length !== 6 || !inputBinId.trim()} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-base active:scale-95 transition-all">JOIN ROOM</button>
            </div>
            <button onClick={handleGoogleLogout} className="w-full mt-4 bg-red-900/40 border border-red-600/50 hover:border-red-500 text-white py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-all">Logout</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white overflow-hidden">
      <div className="flex-shrink-0 bg-slate-900/90 backdrop-blur-xl border-b border-blue-500/30 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={googleUser?.picture} alt="Profile" className="w-7 h-7 rounded-full border-2 border-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0"><h1 className="text-base font-black text-blue-300 truncate">🎭 {roomUsername}</h1></div>
          </div>
          <div className="flex items-center gap-1">
            {isReconnecting ? <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" /> : isConnected ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
            {roomCode && <button onClick={copyRoomCode} className="flex items-center gap-1 bg-slate-800/50 border border-blue-500/30 rounded-lg px-2 py-1 font-bold text-xs active:scale-95 transition-all"><span className="text-blue-300">{roomCode}</span>{copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}</button>}
            {gameState.isTimerRunning && <div className="flex items-center gap-1 bg-red-900/40 border border-red-600/50 rounded-lg px-2 py-1 font-bold text-xs"><Clock className="w-3 h-3" /><span>{gameState.gameTimer}s</span></div>}
            <button onClick={() => setShowPlayerList(!showPlayerList)} className="flex items-center gap-1 bg-slate-800/50 border border-blue-500/30 rounded-lg px-2 py-1 font-bold text-xs active:scale-95 transition-all"><Users className="w-4 h-4" /><span>{gameState.players.length}</span></button>
            <button onClick={() => setShowTutorial(true)} className="p-1.5 bg-slate-800/50 border border-blue-500/30 rounded-lg active:scale-95 transition-all"><Info className="w-4 h-4" /></button>
            <button onClick={leaveRoom} className="p-1.5 bg-red-900/40 border border-red-600/50 rounded-lg active:scale-95 transition-all"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
        {gameState.phase !== 'lobby' && gameState.phase !== 'ended' && <div className="mt-2 text-center"><div className="inline-block bg-slate-800/50 border border-blue-500/30 rounded-full px-3 py-1"><span className="text-xs font-black text-blue-300">{gameState.phase === 'night' && '🌙 NIGHT'}{gameState.phase === 'day' && '☀️ DAY'}{gameState.phase === 'voting' && '🗳️ VOTING'}{gameState.day > 0 && ` - DAY ${gameState.day}`}</span></div></div>}
      </div>

      {showPlayerList && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-end sm:items-center sm:justify-center p-4" onClick={() => setShowPlayerList(false)}><div className="w-full sm:max-w-sm bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 rounded-t-3xl sm:rounded-3xl p-4 max-h-[70vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between mb-3"><h3 className="text-lg font-black text-blue-300">PLAYERS ({gameState.players.length})</h3><button onClick={() => setShowPlayerList(false)} className="p-2 hover:bg-slate-800/50 rounded-lg transition-all"><X className="w-5 h-5" /></button></div><div className="space-y-2">{gameState.players.map((player, idx) => <div key={idx} className={`flex items-center justify-between bg-slate-800/50 border ${getRoleColor(gameState.roles[player.name])} rounded-lg p-3 text-sm`}><div className="flex items-center gap-2 min-w-0"><div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">{player.name[0]}</div><div className="min-w-0"><span className="font-semibold truncate block">{player.name} {player.isBot && '🤖'}</span></div></div>{!player.alive && <Skull className="w-5 h-5 text-red-500 flex-shrink-0" />}</div>)}</div></div></div>}

      {showTutorial && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center p-4" onClick={() => setShowTutorial(false)}><div className="w-full sm:max-w-md bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-black text-blue-300">HOW TO PLAY</h2><button onClick={() => setShowTutorial(false)} className="p-2 hover:bg-slate-800/50 rounded-lg transition-all"><X className="w-5 h-5" /></button></div><div className="space-y-3 text-sm"><div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3"><h3 className="text-red-300 font-bold mb-1">🐺 WEREWOLF</h3><p className="text-blue-200/80">Bunuh warga setiap malam. Menang jika jumlah werewolf ≥ warga.</p></div><div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-3"><h3 className="text-purple-300 font-bold mb-1">🔮 SEER</h3><p className="text-blue-200/80">Lihat role seseorang setiap malam.</p></div><div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3"><h3 className="text-blue-300 font-bold mb-1">🛡️ GUARD</h3><p className="text-blue-200/80">Lindungi 1 orang dari serangan werewolf.</p></div><div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3"><h3 className="text-slate-300 font-bold mb-1">👤 VILLAGER</h3><p className="text-blue-200/80">Diskusi dan vote untuk temukan werewolf.</p></div></div><button onClick={() => setShowTutorial(false)} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-sm active:scale-95 transition-all">GOT IT</button></div></div>}

      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollBehavior: 'smooth' }}>{messages.map((msg) => <div key={msg.id} className={`flex ${msg.type === 'system' || msg.type === 'story' ? 'justify-center' : msg.user === roomUsername ? 'justify-end' : 'justify-start'}`}>{msg.type === 'system' ? <div className="max-w-xs sm:max-w-md">{msg.image && <div className="mb-2 rounded-lg overflow-hidden border border-blue-500/30 shadow-lg"><img src={msg.image} alt="Game" className="w-full h-32 object-cover" /></div>}<div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg px-3 py-2 shadow-lg"><p className="text-xs font-semibold text-yellow-100 whitespace-pre-line leading-relaxed">{msg.text}</p></div></div> : msg.type === 'story' ? <div className="bg-slate-800/50 border border-blue-500/30 rounded-lg px-3 py-2 max-w-xs sm:max-w-md shadow-lg"><p className="text-xs font-semibold text-blue-200 text-center italic leading-relaxed">{msg.text}</p></div> : <div className={`max-w-xs sm:max-w-sm rounded-lg shadow-lg ${msg.user === roomUsername ? 'bg-blue-600/70' : 'bg-slate-800/70'}`}>{msg.user !== roomUsername && <div className="flex items-center gap-2 px-3 pt-2 pb-1"><div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">{msg.user[0]}</div><span className="font-bold text-xs text-blue-200 truncate">{msg.user} {msg.isBot && '🤖'}</span></div>}<div className="px-3 pb-2"><p className="text-white text-xs break-words leading-relaxed">{msg.text}</p><span className="text-[10px] text-gray-400 mt-1 block text-right">{new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div></div>}</div>)}<div ref={messagesEndRef} /></div>

      {gameState.phase === 'lobby' && isHost && <div className="flex-shrink-0 bg-slate-900/90 backdrop-blur-xl border-t border-blue-500/30 p-3"><div className="flex gap-2"><button onClick={addBot} className="flex-1 bg-slate-800/50 border border-blue-500/30 hover:border-blue-400 rounded-lg py-3 font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" />ADD BOT</button><button onClick={startGame} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg py-3 font-bold text-sm active:scale-95 transition-all" disabled={gameState.players.length < 4}>START GAME</button></div><p className="text-xs text-blue-300 text-center font-semibold mt-2">{gameState.players.length}/4+ players</p></div>}

      {gameState.phase === 'night' && myRole && myRole !== 'villager' && isPlayerAlive && !gameState.actions[roomUsername] && <div className="flex-shrink-0 bg-slate-900/90 backdrop-blur-xl border-t border-blue-500/30 p-3"><h4 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2 tracking-wider uppercase"><Zap className="w-4 h-4" />USE SKILL ({getRoleEmoji(myRole)} {myRole})</h4><div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">{gameState.players.filter(p => p.alive && p.name !== roomUsername).map((player, idx) => <button key={idx} onClick={() => useSkill(player.name)} className="bg-slate-800/50 border border-blue-500/30 hover:border-blue-400 rounded-lg p-2 text-xs font-semibold active:scale-95 transition-all flex items-center justify-between"><span className="truncate">{player.name}</span><ChevronRight className="w-3 h-3 flex-shrink-0" /></button>)}</div></div>}

      {gameState.phase === 'voting' && isPlayerAlive && !gameState.votes[roomUsername] && <div className="flex-shrink-0 bg-slate-900/90 backdrop-blur-xl border-t border-blue-500/30 p-3"><h4 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2 tracking-wider uppercase"><Target className="w-4 h-4" />VOTE TO EXECUTE</h4><div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">{gameState.players.filter(p => p.alive && p.name !== roomUsername).map((player, idx) => <button key={idx} onClick={() => handleVote(player.name)} className="bg-red-900/30 border border-red-600/50 hover:border-red-500 rounded-lg p-2 text-xs font-semibold active:scale-95 transition-all flex items-center justify-between"><span className="truncate">{player.name}</span><ChevronRight className="w-3 h-3 flex-shrink-0" /></button>)}</div></div>}

      {((gameState.phase === 'night' && gameState.actions[roomUsername]) || (gameState.phase === 'voting' && gameState.votes[roomUsername])) && isPlayerAlive && <div className="flex-shrink-0 bg-green-900/30 backdrop-blur-xl border-t border-green-600/50 p-3 text-center"><p className="text-sm font-bold text-green-300">✅ {gameState.phase === 'night' ? 'Skill Used' : 'Vote Submitted'}</p></div>}

      {!isPlayerAlive && gameState.phase !== 'lobby' && <div className="flex-shrink-0 bg-red-900/30 backdrop-blur-xl border-t border-red-600/50 p-3 text-center"><p className="text-sm font-bold text-red-300">💀 You are dead. Spectating...</p></div>}

      <div className="flex-shrink-0 bg-slate-900/90 backdrop-blur-xl border-t border-blue-500/30 p-3"><div className="flex gap-2"><input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Chat..." className="flex-1 px-4 py-2 bg-slate-800/50 border border-blue-500/30 rounded-full text-white focus:outline-none focus:border-blue-400 font-semibold text-xs placeholder-blue-400/50" /><button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-full active:scale-95 transition-all flex items-center justify-center"><Send className="w-4 h-4" /></button></div></div>
    </div>
  );
};

export default WerewolfChatGame;