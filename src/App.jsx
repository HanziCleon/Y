import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Skull, Eye, Shield, Info, UserPlus, Play, Clock, Copy, Check, LogOut, AlertCircle, Zap, Target, Menu, X, ChevronRight, Wifi, WifiOff } from 'lucide-react';

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
    botPersonalities: {},
    lastBotChat: {}
  });
  const [myRole, setMyRole] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    night: 'https://user-images.githubusercontent.com/72728486/235316834-f9f84ba0-8df3-4444-81d8-db5270995e6d.jpg',
    day: 'https://user-images.githubusercontent.com/72728486/235344562-4677d2ad-48ee-419d-883f-e0ca9ba1c7b8.jpg',
    voting: 'https://user-images.githubusercontent.com/72728486/235344861-acdba7d1-8fce-41b8-adf6-337c818cda2b.jpg',
    death: 'https://user-images.githubusercontent.com/72728486/235354619-6ad1cabd-216c-4c7c-b7c2-3a564836653a.jpg',
    werewolfWin: 'https://user-images.githubusercontent.com/72728486/235365156-cfab66ce-38b2-4bc7-90d7-7756fc320e06.jpg',
    villageWin: 'https://user-images.githubusercontent.com/72728486/235365148-35b8def7-c1a2-451d-a2f2-6b6a911b37db.jpg'
  };

  const botPersonalityProfiles = {
    aggressive: {
      name: 'Agresif',
      traits: ['Tegas', 'Vokal', 'Curiga'],
      chatPatterns: {
        accusation: [
          'Tunggu dulu... %target%, kamu terlalu tenang untuk situasi seperti ini.',
          'Aku sudah mengamati %target% dari tadi. Ada yang SANGAT mencurigakan!',
          '%target% berbicara terlalu banyak untuk mengalihkan perhatian. Klasik banget!',
          'Guys, fokus ke %target%! Aku yakin 90% dia werewolf.',
          'Lihat gerak-gerik %target%? Mata ku tidak bisa salah!',
          '%target% kenapa kamu menghindari pertanyaan tadi? JAWAB!',
          'Kalian buta apa?! %target% JELAS mencurigakan!',
          'Vote %target% SEKARANG sebelum terlambat!'
        ],
        defense: [
          'Aku udah jelasin berkali-kali, masih aja dituduh!',
          'Kalian salah besar! Aku justru mencoba menyelamatkan desa!',
          'Fine, tuduh aku. Tapi nanti jangan nyesal pas kalian kalah.',
          'Bukti apa yang kalian punya? OH WAIT, TIDAK ADA!'
        ],
        general: [
          'Situasi makin gawat...',
          'Kita harus bertindak cepat!',
          'Tidak ada waktu untuk ragu-ragu.',
          'Percaya padaku atau tidak, terserah. Tapi aku benar.'
        ],
        victory: [
          'SEEEE?! Aku kan bilang!',
          'Finally! Kalian harusnya dengerin aku dari tadi.',
          'Told you so.'
        ]
      },
      votingStrategy: 'targets_humans_if_werewolf',
      suspicionIncrease: 0.15,
      chatFrequency: 'high'
    },
    analytical: {
      name: 'Analitis',
      traits: ['Logis', 'Observatif', 'Tenang'],
      chatPatterns: {
        accusation: [
          'Jadi... setelah ku analisis pola voting kemarin, %target% paling anomali.',
          'Data menunjukkan %target% selalu vote orang yang akhirnya innocent. Coincidence? I think not.',
          'Mari kita breakdown: %target% berbicara 3x lebih banyak saat werewolf disebutkan. Red flag.',
          'Berdasarkan behavioral pattern, %target% menunjukkan defensive mechanism yang berlebihan.',
          'Probabilitas %target% sebagai werewolf: 78%. Cukup tinggi untuk dipertimbangkan.',
          'Perhatikan timeline: %target% selalu diam saat ada yang mati. Interesting.',
          'Logical conclusion: %target% adalah ancaman terbesar saat ini.'
        ],
        defense: [
          'Mari kita gunakan logika, bukan emosi.',
          'Aku bisa explain semua tindakanku dengan reasoning yang jelas.',
          'Statistically speaking, menuduhku adalah waste of vote.',
          'Data tidak mendukung tuduhan tersebut.'
        ],
        general: [
          'Kita perlu berpikir strategis di sini...',
          'Mari kita review apa yang sudah terjadi.',
          'Hmm, pola ini menarik untuk dicermati.',
          'Ada correlation yang perlu kita explore.'
        ],
        victory: [
          'Exactly as predicted.',
          'The data was clear all along.',
          'Logic prevails.'
        ]
      },
      votingStrategy: 'most_suspected',
      suspicionIncrease: 0.10,
      chatFrequency: 'medium'
    },
    defensive: {
      name: 'Defensif',
      traits: ['Waspada', 'Protektif', 'Reaktif'],
      chatPatterns: {
        accusation: [
          'Guys, ini bukan saatnya asal tuduh. %target% acting sus banget.',
          'Aku cuma mau bilang... %target% berperilaku aneh sejak day 1.',
          'Maaf %target%, tapi aku harus speak up. Kamu terlalu defensive.',
          'Aku ga mau menuduh sembarangan, tapi %target%... explain deh.',
          '%target%, tolong jelaskan kenapa kamu vote orang yang ternyata innocent?',
          'Bukan maksud aku menyerang, tapi %target% patut dicurigai.'
        ],
        defense: [
          'KENAPA SELALU AKU YANG DITUDUH?!',
          'Guys please, aku innocent! Kalian harus percaya!',
          'Ini keputusan yang salah besar! Aku bukan werewolf!',
          'Aku udah berusaha bantuin kalian semua, malah dituduh!',
          'Fine, vote aku. Tapi kalian akan menyesal!',
          'Why me?! Ada orang yang lebih sus daripada aku!',
          'Aku punya alibi yang jelas! Dengerin dulu!',
          'This is so unfair...'
        ],
        general: [
          'Situasi ini bikin stress banget...',
          'Aku mulai ga tau siapa yang bisa dipercaya.',
          'Everyone seems suspicious sekarang.',
          'Kita harus hati-hati memilih...'
        ],
        victory: [
          'Phew! Finally aman!',
          'Alhamdulillah selamat...',
          'Aku ga nyangka bisa survive.'
        ]
      },
      votingStrategy: 'follows_majority',
      suspicionIncrease: 0.08,
      chatFrequency: 'high'
    },
    mysterious: {
      name: 'Misterius',
      traits: ['Tenang', 'Observatif', 'Enigmatik'],
      chatPatterns: {
        accusation: [
          '...',
          '*menatap %target% dalam diam*',
          '%target%... interesting.',
          'Ada sesuatu tentang %target% yang... off.',
          '*mengangguk pelan* %target%.',
          'Hmm... %target%...',
          '*menulis sesuatu* ...%target%.',
          'I see... %target%.'
        ],
        defense: [
          '...',
          '*menghela napas*',
          'Percaya atau tidak, terserah kalian.',
          '*shrug*',
          'Kalian akan tahu sendiri nanti.',
          'Time will tell.'
        ],
        general: [
          '*mengamati dari kejauhan*',
          '...',
          'Menarik...',
          '*silence*',
          'Hmm.',
          '*memperhatikan sekeliling*',
          'Something is not right...',
          '*berbisik* Ada yang tidak beres.'
        ],
        victory: [
          '*small smile*',
          'Seperti yang kuduga.',
          '...'
        ]
      },
      votingStrategy: 'follows_majority',
      suspicionIncrease: 0.12,
      chatFrequency: 'low'
    },
    chaotic: {
      name: 'Kacau',
      traits: ['Unpredictable', 'Spontan', 'Bebas'],
      chatPatterns: {
        accusation: [
          'YOLO! Vote %target% aja deh! 🎲',
          'Gut feeling gue bilang %target%! Let\'s goooo!',
          '%target% giving me bad vibes tbh',
          'Eenie meenie miney... %target%!',
          'Random pick: %target%! May the odds be with us lol',
          'Chaos time! %target% kamu terpilih!',
          'Plot twist: %target% is sus! *dramatic music*',
          '%target% speedrun werewolf% any%'
        ],
        defense: [
          'LOL aku bukan werewolf guys 😂',
          'This is fine. *literally on fire*',
          'Bruh moment',
          'Gg wp if I die',
          'YEET me if you want idc',
          '*coffin dance music plays*'
        ],
        general: [
          'This game is WILD!',
          'Whoever dies, dies 🤷',
          'LET\'S GOOOOO!',
          'I\'m just here for the chaos',
          '*insert random meme*',
          'No thoughts, head empty',
          'Vibing in confusion',
          'What a time to be alive... or not'
        ],
        victory: [
          'YOOOO WE DID IT!',
          'EZ Clap',
          'That was sick!',
          'Poggers!'
        ]
      },
      votingStrategy: 'completely_random',
      suspicionIncrease: 0.05,
      chatFrequency: 'high'
    },
    manipulator: {
      name: 'Manipulatif',
      traits: ['Persuasif', 'Licik', 'Karismatik'],
      chatPatterns: {
        accusation: [
          'Guys, dengerin aku sebentar. %target% itu ancaman yang harus kita hadapi bersama.',
          'Aku ga mau nuduh sembarangan, tapi %target%... ada yang perlu dijelaskan.',
          'Kita semua di sini satu tim, right? Nah, %target% sepertinya main sendiri.',
          'Percaya deh sama aku, %target% berbahaya untuk kita semua.',
          'As your friend, aku harus bilang: %target% is the imposter here.',
          'Think about it... siapa yang paling diuntungkan kalau %target% survive? Exactly.',
          '%target%, aku appreciate kamu, tapi... sorry, this is for the greater good.',
          'Let me paint you a picture: %target% adalah missing piece dari puzzle ini.'
        ],
        defense: [
          'Woah woah, guys, let\'s not be hasty. Aku di pihak kalian kok!',
          'Seriously? Aku yang paling aktif bantuin kalian!',
          'Think about who\'s really benefiting from this accusation... not me.',
          'Aku literally vouching for everyone dan ini yang aku dapat?',
          'Come on, kalian kenal aku. Aku ga akan betray kalian.',
          'This is exactly what THEY want - us turning on each other!'
        ],
        general: [
          'Kita harus stick together sebagai team...',
          'Trust me, aku punya plan yang solid.',
          'Mari kita diskusikan ini dengan kepala dingin.',
          'Aku di sini untuk bantuin kalian semua.',
          'We\'re all in this together, right?',
          'Let\'s be smart about this.'
        ],
        victory: [
          'Told you to trust me! 😉',
          'Teamwork makes the dream work!',
          'Exactly according to plan.',
          'See? Following my lead works!'
        ]
      },
      votingStrategy: 'deflect_from_self',
      suspicionIncrease: 0.13,
      chatFrequency: 'medium'
    },
    strategic: {
      name: 'Strategis',
      traits: ['Perhitungan', 'Fokus', 'Metodis'],
      chatPatterns: {
        accusation: [
          'Secara strategis, eliminasi %target% adalah move terbaik untuk endgame kita.',
          '%target%, timing aksi kamu sempurna untuk werewolf. Just saying.',
          'Mari kita gunakan process of elimination: %target% paling masuk akal.',
          'Risk assessment: %target% adalah threat level tertinggi.',
          'Jika kita vote %target% sekarang, kita maximize chance of winning 2 turns ahead.',
          'Game theory 101: %target% harus pergi untuk optimal outcome.',
          '%target%, maaf, tapi ini keputusan strategis, nothing personal.'
        ],
        defense: [
          'Voting aku akan cost kalian the game. Think strategically.',
          'From game theory perspective, aku adalah asset, bukan liability.',
          'Analyze the situation: eliminasi aku = kerugian untuk village.',
          'Bad move, guys. Really bad move.'
        ],
        general: [
          'Kita perlu long-term strategy di sini.',
          'Let\'s think several moves ahead...',
          'Optimal play adalah...',
          'Scenario analysis: jika X maka Y.',
          'Resource management is key.'
        ],
        victory: [
          'Perfect execution.',
          'Strategy wins games.',
          'Calculated.',
          'Just as planned.'
        ]
      },
      votingStrategy: 'most_suspected',
      suspicionIncrease: 0.11,
      chatFrequency: 'medium'
    }
  };

  const botNames = [
    { name: 'Raven', personality: 'aggressive' },
    { name: 'Cipher', personality: 'analytical' },
    { name: 'Nova', personality: 'mysterious' },
    { name: 'Blaze', personality: 'chaotic' },
    { name: 'Echo', personality: 'defensive' },
    { name: 'Shade', personality: 'manipulator' },
    { name: 'Vex', personality: 'strategic' },
    { name: 'Mira', personality: 'analytical' },
    { name: 'Storm', personality: 'chaotic' },
    { name: 'Void', personality: 'mysterious' },
    { name: 'Luna', personality: 'defensive' },
    { name: 'Axel', personality: 'aggressive' }
  ];

  const storyMessages = {
    lobbyStart: "🎭 Selamat datang di Desa Moonbrook, tahun 1823.\n\nKabut tebal menyelimuti desa terpencil ini. Penduduk berbisik ketakutan - sudah 3 malam berturut-turut terdengar auman serigala yang tidak wajar.\n\nDan malam ini... seseorang di antara kalian bukanlah manusia biasa.",
    
    nightStart: (day) => {
      const variants = [
        `🌙 MALAM KE-${day}\n\nBulan purnama bersinar merah darah. Pintu-pintu dikunci rapat. Lilin-lilin dinyalakan di setiap jendela sebagai perlindungan.\n\nTapi apakah itu cukup? Di kegelapan, sesuatu... atau seseorang... sedang bergerak.`,
        `🌙 MALAM KE-${day}\n\nAngin dingin berhembus membawa aroma besi dan tanah basah. Jam gereja berdentang 12 kali.\n\nDi suatu tempat, dekat sekali, terdengar geraman pelan yang membuat bulu kuduk berdiri.`,
        `🌙 MALAM KE-${day}\n\nKegelapan malam ini terasa lebih pekat dari biasanya. Bahkan cahaya bulan tampak ketakutan.\n\nHewan-hewan di hutan terdiam. Silence before the storm...`,
        `🌙 MALAM KE-${day}\n\nSalju mulai turun, menutupi jejak-jejak yang tidak ingin dilihat siapapun.\n\nDi balik jendela yang berembun, mata-mata waspada mengawasi kegelapan dengan penuh ketakutan.`
      ];
      return variants[day % variants.length];
    },
    
    dayStart: (deaths, day, protectedPlayers) => {
      if (deaths.length > 0) {
        const deathDescriptions = [
          `☀️ PAGI HARI ${day}\n\n*BANG BANG BANG*\n\nKetukan pintu membangunkan desa. Teriakan histeris pecah.\n\nTubuh ${deaths.join(' dan ')} ditemukan di tepi hutan. Luka cakaran di sekujur tubuh. Darah masih segar.\n\nJejak kaki besar mengarah kembali ke dalam desa...`,
          
          `☀️ PAGI HARI ${day}\n\nMatahari terbit dengan suram. Burung-burung gagak berkumpul di atas rumah ${deaths.join(' dan ')}.\n\nKetika pintu didobrak... pemandangan mengerikan menyambut. Furniture hancur, tanda perlawanan yang sia-sia.\n\nKini desa kehilangan harapan lagi.`,
          
          `☀️ PAGI HARI ${day}\n\nLonceng gereja berbunyi suram. Pendeta dengan tangan gemetar mengumumkan:\n\n"${deaths.join(' dan ')} telah... meninggal."\n\nWarga berkerumun. Ada yang menangis. Ada yang marah. Semua ketakutan.\n\nWerewolf masih di antara kita.`
        ];
        return deathDescriptions[day % deathDescriptions.length];
      }
      
      if (protectedPlayers.length > 0) {
        return `☀️ PAGI HARI ${day}\n\nKeajaiban!\n\nSuara teriakan di malam hari ternyata... tidak ada korban. ${protectedPlayers[0]} ditemukan selamat, meskipun pintunya penuh cakaran.\n\nSeseorang... atau sesuatu... melindungi mereka.\n\nTapi pertanyaan besar tetap: Siapa werewolf-nya?`;
      }
      
      return `☀️ PAGI HARI ${day}\n\nPagi yang... aneh.\n\nTidak ada teriakan. Tidak ada mayat. Malam yang tenang?\n\nAtau... werewolf sedang merencanakan sesuatu yang lebih besar?\n\nWarga berkumpul dengan tatapan saling curiga.`;
    },
    
    votingStart: (day) => {
      const variants = [
        `🗳️ VOTING TIME - HARI ${day}\n\nBELFRY DESA, SORE HARI\n\nSeluruh warga berkumpul. Tension memuncak. Tuduhan berterbangan.\n\nLilin-lilin menerangi wajah-wajah yang penuh curiga dan ketakutan.\n\n"KITA HARUS MEMUTUSKAN SEKARANG! SEBELUM MALAM TIBA LAGI!"\n\n⏰ 90 detik untuk memilih... hidup atau mati seseorang.`,
        
        `🗳️ VOTING TIME - HARI ${day}\n\nBALAI DESA\n\nMeja kayu tua berderit saat semua duduk membentuk lingkaran.\n\nPendeta membuka rapat: "Kita kehilangan terlalu banyak orang. Werewolf HARUS dihentikan hari ini."\n\nSemua mata saling memandang dengan curiga.\n\n⏰ Waktu: 90 detik. Pilihan: life or death.`,
        
        `🗳️ VOTING TIME - HARI ${day}\n\nDI BAWAH POHON OAK TUA\n\nTempat dimana desa selalu membuat keputusan penting. Dan kali ini... keputusan hidup mati.\n\n"SIAPA YANG AKAN KITA EKSEKUSI?!"\n\nSuara-suara bertumpuk. Emosi memuncak.\n\n⏰ 90 detik sebelum keputusan final.`
      ];
      return variants[day % variants.length];
    },
    
    execution: (name, role, votesReceived) => {
      const roleReveal = {
        werewolf: `⚰️ EKSEKUSI\n\n${name} ditarik paksa ke tengah lapangan.\n\nTali diikatkan. Mata berbinar penuh amarah.\n\nDan ketika bulan muncul dari balik awan... TRANSFORMASI DIMULAI!\n\nBulu hitam tumbuh. Taring keluar. Mata menyala merah.\n\n"${name} adalah... WEREWOLF!"\n\n🎉 Desa bersorak! Tapi... apakah sudah aman? (${votesReceived} votes)`,
        
        seer: `⚰️ EKSEKUSI\n\n${name} berjalan tenang ke tiang eksekusi.\n\n"Tunggu! Aku bisa melihat! Aku SEER! Aku tahu siapa werewolf-nya!"\n\nTapi terlambat. Tali sudah dikencangkan.\n\nSaat jiwa meninggalkan tubuh, kristal di sakunya bersinar... lalu redup.\n\nDesa kehilangan mata-mata terbaiknya. (${votesReceived} votes)`,
        
        guard: `⚰️ EKSEKUSI\n\n${name} tidak melawan saat ditangkap.\n\n"Aku... hanya ingin melindungi kalian semua..."\n\nPecut dan perisai jatuh dari tangan. Simbol keberanian desa.\n\nExecution selesai. Desa kehilangan pelindung terbaiknya.\n\nSiapa yang akan menjaga malam ini? (${votesReceived} votes)`,
        
        villager: `⚰️ EKSEKUSI\n\n${name} menangis. "AKU INNOCENT! KALIAN SALAH!"\n\nTapi mayoritas sudah memutuskan. Demokrasi yang kejam.\n\nSaat jiwa melayang, tidak ada transformasi. Tidak ada taring.\n\nHanya... warga desa biasa.\n\nKalian... membunuh innocent. (${votesReceived} votes)`
      };
      
      return roleReveal[role] || `⚰️ ${name} telah dieksekusi. (${votesReceived} votes)`;
    },
    
    werewolfWin: (survivors) => {
      return `🐺 GAME OVER - WEREWOLF VICTORY!\n\n━━━━━━━━━━━━━━━━━━━━\n\nMATEM TERAKHIR\n\nHanya tersisa: ${survivors.join(', ')}\n\nDi ruangan yang gelap, auman kemenangan bergema. Werewolf melepas topeng manusianya.\n\n"Kalian terlambat menyadarinya..."\n\nDesa Moonbrook jatuh. Kegelapan menyelimuti selamanya.\n\nLegenda mengatakan auman serigala masih terdengar hingga hari ini...\n\n━━━━━━━━━━━━━━━━━━━━`;
    },
    
    villageWin: (lastWerewolf) => {
      return `✨ VICTORY - DESA SELAMAT!\n\n━━━━━━━━━━━━━━━━━━━━\n\nFAJAR KEMENANGAN\n\nWerewolf terakhir (${lastWerewolf}) tumbang!\n\nSaat tubuh tak bernyawa tergeletak, perlahan transformasi terjadi... kembali ke wujud manusia.\n\n"Akhirnya... berakhir..."\n\nLonceng gereja berbunyi 7 kali. Simbolis pembersihan.\n\nWarga merayakan, tapi trauma akan terus tersisa.\n\nDesa Moonbrook... selamat. Untuk kali ini.\n\n━━━━━━━━━━━━━━━━━━━━`;
    }
  };

  const storyEvents = [
    "🌫️ Kabut tebal tiba-tiba merayap dari hutan, menutupi jalan setapak...",
    "🦇 Kelelawar-kelelawar berkerumun di menara gereja. Pertanda buruk?",
    "🌙 Bulan berubah warna menjadi merah darah selama 13 detik.",
    "👻 Pintu tua Mansion Blackwood terbuka sendiri. Derit mengerikan terdengar...",
    "🔥 Api unggun di town square tiba-tiba berubah hijau, lalu biru.",
    "💀 Seseorang menemukan tulang-tulang aneh di tepi sungai.",
    "🐺 Jejak kaki serigala raksasa ditemukan di depan beberapa rumah.",
    "👁️ Warga merasa diawasi dari dalam hutan gelap.",
    "🌑 Kegelapan semakin pekat meskipun masih jam 7 malam.",
    "⛓️ Rantai gereja yang konon sacred... PATAH dengan bunyi keras!",
    "🕯️ Semua lilin di gereja padam bersamaan tanpa sebab.",
    "🪦 Kuburan lama di ujung desa... ada yang tergali dari dalam?!",
    "🦉 Burung hantu berbunyi 13 kali. Village elder gemetar ketakutan.",
    "❄️ Salju tiba-tiba turun meski musim panas. Unnatural...",
    "🌲 Pohon oak tua di town square mengeluarkan getah merah. Blood?",
    "📜 Ancient scroll ditemukan: 'Beware the full moon, for they walk among you'",
    "⚡ Petir menyambar pohon, membentuk symbol aneh yang menyerupai wolf head.",
    "🎭 Topeng-topeng di teater tua... semuanya berubah arah menatap ke pintu.",
    "🔔 Lonceng berbunyi sendiri tepat tengah malam. 12 kali.",
    "🌹 Bunga mawar di taman pastor semuanya layu dalam sekejap."
  ];

  const reactiveMessages = {
    onDeath: (victimName, role) => {
      const reactions = {
        aggressive: `Damn it, ${victimName}! Aku baru mau tanya beberapa hal!`,
        analytical: `${victimName}'s death creates significant change in probability matrix...`,
        defensive: `Oh no... ${victimName}... I'm so sorry...`,
        mysterious: `*menatap mayat ${victimName}* ...`,
        chaotic: `F in the chat for ${victimName} 😔`,
        manipulator: `We lost a good one... ${victimName} didn't deserve this.`,
        strategic: `${victimName}'s elimination changes the game state significantly.`
      };
      return reactions;
    },
    
    onExecution: (executedName, wasWerewolf) => {
      const reactions = {
        aggressive: wasWerewolf ? `YESSS! Aku kan bilang ${executedName} itu werewolf!` : `Shit... ${executedName} innocent? Damn.`,
        analytical: wasWerewolf ? `Probability calculations were correct. ${executedName} confirmed hostile.` : `Error in analysis. ${executedName} was not the target.`,
        defensive: wasWerewolf ? `Alhamdulillah! We got the werewolf!` : `NO! We killed innocent! This is bad...`,
        mysterious: wasWerewolf ? `*nods slowly*` : `...`,
        chaotic: wasWerewolf ? `LETS GOOO! 🎉` : `Oops... my bad guys lol`,
        manipulator: wasWerewolf ? `See? Trust the process, guys.` : `Unfortunate... but we learn from mistakes.`,
        strategic: wasWerewolf ? `Optimal outcome achieved.` : `Sub-optimal. Recalculating strategy.`
      };
      return reactions;
    },
    
    onAccused: (accuserName) => {
      const reactions = {
        aggressive: `${accuserName}, WHAT?! Kamu yang harusnya dicurigai!`,
        analytical: `${accuserName}, your accusation lacks empirical foundation.`,
        defensive: `Why ${accuserName}?! Aku ga ngapa-ngapain!`,
        mysterious: `*stares at ${accuserName}*`,
        chaotic: `Bruh ${accuserName}, not cool man`,
        manipulator: `${accuserName}, seriously? After all I've done for this team?`,
        strategic: `${accuserName}'s accusation is strategically unsound.`
      };
      return reactions;
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const syncGameState = async (syncBinId, syncUsername) => {
    setIsReconnecting(true);
    const data = await getBinData(syncBinId);
    if (data) {
      setGameState(data.gameState || gameState);
      setMessages(data.messages || []);
      
      if (data.gameState?.roles && syncUsername) {
        const role = data.gameState.roles[syncUsername];
        if (role) setMyRole(role);
      }
      
      const reconnectMsg = {
        id: Date.now(),
        user: 'Sistem',
        text: `🔄 ${syncUsername} reconnected!`,
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      setMessages(prev => [...prev, reconnectMsg]);
      
      await updateBin(syncBinId, {
        ...data,
        messages: [...data.messages, reconnectMsg]
      });
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
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleLogin
        });
      }
    });
  }, []);

  useEffect(() => {
    if (binId && roomCode && !isReconnecting) {
      syncInterval.current = setInterval(async () => {
        const data = await getBinData(binId);
        if (data) {
          const currentStateStr = JSON.stringify(gameState);
          const newStateStr = JSON.stringify(data.gameState);
          
          if (currentStateStr !== newStateStr) {
            setGameState(data.gameState);
          }
          if (data.messages.length > messages.length) {
            setMessages(data.messages);
          }
          
          if (data.gameState?.roles && roomUsername) {
            const role = data.gameState.roles[roomUsername];
            if (role && role !== myRole) setMyRole(role);
          }
        }
      }, 3000);
    }

    return () => {
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
      }
    };
  }, [binId, roomCode, isReconnecting]);

  useEffect(() => {
    const renderGoogleButton = () => {
      if (googleButtonRef.current && window.google && !isLoggedIn) {
        googleButtonRef.current.innerHTML = '';
        
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          { 
            theme: "filled_blue", 
            size: "large",
            width: Math.min(350, window.innerWidth - 80),
            text: "signin_with"
          }
        );
      }
    };

    renderGoogleButton();
    const timer = setTimeout(renderGoogleButton, 500);
    
    return () => clearTimeout(timer);
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
      localStorage.removeItem('werewolf_active_room');
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
        botPersonalities: {},
        lastBotChat: {}
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

  const generateBotChat = (botName, phase, currentGameState, context = 'general') => {
    const personality = currentGameState.botPersonalities[botName];
    const profile = botPersonalityProfiles[personality];
    if (!profile) return null;

    const alivePlayers = currentGameState.players.filter(p => p.alive && p.name !== botName);
    const role = currentGameState.roles[botName];
    const lastChat = currentGameState.lastBotChat?.[botName] || 0;
    
    // Prevent spam
    if (Date.now() - lastChat < 5000) return null;

    let message = '';
    let category = context;

    if (phase === 'day') {
      // More varied responses
      if (Math.random() > 0.4 && alivePlayers.length > 0) {
        category = 'accusation';
        const suspicionData = currentGameState.suspicionLevels || {};
        const suspiciousPlayers = Object.entries(suspicionData)
          .filter(([name]) => alivePlayers.find(p => p.name === name))
          .sort((a, b) => b[1] - a[1]);
        
        const target = suspiciousPlayers.length > 0 && Math.random() > 0.3
          ? alivePlayers.find(p => p.name === suspiciousPlayers[0][0])
          : alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        
        if (target) {
          const patterns = profile.chatPatterns[category];
          message = patterns[Math.floor(Math.random() * patterns.length)].replace('%target%', target.name);
        }
      } else {
        category = 'general';
        const patterns = profile.chatPatterns[category];
        message = patterns[Math.floor(Math.random() * patterns.length)];
      }
    } else if (phase === 'voting') {
      if (Math.random() > 0.5) {
        category = 'general';
        const patterns = profile.chatPatterns[category];
        message = patterns[Math.floor(Math.random() * patterns.length)];
      }
    } else if (phase === 'night') {
      category = 'general';
      const nightPhrases = [
        '😰 Aku dengar sesuatu di luar...',
        '🕯️ Semoga aku selamat malam ini...',
        '😶 Ada yang aneh malam ini...',
        '🌙 Malam yang panjang...',
        '😔 Aku berharap akan selamat',
        '*mengunci pintu rapat-rapat*',
        '*melihat keluar jendela dengan was-was*',
        'Stay safe everyone...',
        'Siapa yang akan jadi korban malam ini...'
      ];
      message = nightPhrases[Math.floor(Math.random() * nightPhrases.length)];
    }

    return message;
  };

  const scheduleBotChat = async (botName, phase, currentGameState, delay = 2000) => {
    if (botChatTimers.current[botName]) {
      clearTimeout(botChatTimers.current[botName]);
    }

    const personality = currentGameState.botPersonalities[botName];
    const profile = botPersonalityProfiles[personality];
    
    // Adjust frequency based on personality
    const frequencyMultiplier = {
      high: 1,
      medium: 1.5,
      low: 2.5
    };
    
    const adjustedDelay = delay * (frequencyMultiplier[profile?.chatFrequency] || 1.5);

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
        
        // Update last chat time
        const updatedState = {
          ...currentGameState,
          lastBotChat: {
            ...currentGameState.lastBotChat,
            [botName]: Date.now()
          }
        };
        
        if (binId) {
          const currentData = await getBinData(binId);
          if (currentData) {
            await updateBin(binId, { 
              ...currentData, 
              gameState: updatedState,
              messages: [...currentData.messages, newMsg] 
            });
          }
        }
      }
    }, adjustedDelay + Math.random() * 3000);
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
      const role = currentGameState.roles[botName];
      if (role === 'werewolf') {
        const humanPlayers = alivePlayers.filter(p => !p.isBot);
        target = humanPlayers.length > 0 ? humanPlayers[Math.floor(Math.random() * humanPlayers.length)] : null;
      } else {
        const sorted = Object.entries(suspicionData)
          .filter(([name]) => alivePlayers.find(p => p.name === name))
          .sort((a, b) => b[1] - a[1]);
        target = sorted.length > 0 ? alivePlayers.find(p => p.name === sorted[0][0]) : null;
      }
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
        target = humanPlayers.length > 0 
          ? humanPlayers[Math.floor(Math.random() * humanPlayers.length)] 
          : alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      } else if (role === 'seer') {
        const unknownPlayers = alivePlayers.filter(p => 
          !currentGameState.actions[`seer_${botName}_checked_${p.name}`]
        );
        target = unknownPlayers.length > 0 
          ? unknownPlayers[Math.floor(Math.random() * unknownPlayers.length)] 
          : alivePlayers[0];
      } else if (role === 'guard') {
        const humanPlayers = alivePlayers.filter(p => !p.isBot);
        target = humanPlayers.length > 0 
          ? humanPlayers[Math.floor(Math.random() * humanPlayers.length)] 
          : alivePlayers[0];
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
      botPersonalities: gameState.botPersonalities,
      lastBotChat: {}
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
    
    const profile = botPersonalityProfiles[selectedBot.personality];
    const traits = profile.traits.join(', ');
    
    const systemMsg = {
      id: Date.now(),
      user: 'Desa',
      text: `🤖 ${selectedBot.name} masuk ke desa...\n\nKepribadian: ${profile.name} (${traits})`,
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
        botPersonalities: {},
        lastBotChat: {}
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
      
      localStorage.setItem('werewolf_active_room', JSON.stringify({
        roomCode: code,
        username: username,
        isHost: true,
        binId: newBinId
      }));
    }
    setUsername('');
  };

  const joinRoom = async () => {
    if (inputRoomCode.trim().length !== 6 || !username.trim()) {
      return;
    }
    
    const code = inputRoomCode.toUpperCase();
    const userBinId = prompt('Masukkan Bin ID dari host:');
    if (!userBinId) return;
    
    setRoomCode(code);
    setRoomUsername(username);
    setIsHost(false);
    setShowRoomModal(false);
    setBinId(userBinId);
    
    localStorage.setItem('werewolf_active_room', JSON.stringify({
      roomCode: code,
      username: username,
      isHost: false,
      binId: userBinId
    }));
    
    setUsername('');
    syncGameState(userBinId, username);
  };

  const copyRoomCode = () => {
    const textToCopy = `Room: ${roomCode}\nBin ID: ${binId}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    if (confirm('Keluar dari room?')) {
      localStorage.removeItem('werewolf_active_room');
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
        botPersonalities: {},
        lastBotChat: {}
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
      text: `✅ ${roomUsername} siap! (${newReady.length}/${gameState.players.length})`,
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
      suspicionLevels: {},
      lastBotChat: {}
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
      text: storyMessages.nightStart(1),
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
        scheduleBotChat(bot.name, 'night', newGameState, 2000 + idx * 1000);
      });
    }, 2000);
    
    setTimeout(() => injectStoryEvent(newGameState), 8000);
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
        text: storyMessages.dayStart(deaths, gameState.day, Array.from(protectedPlayers)),
        timestamp: new Date().toISOString(),
        type: 'system',
        image: deaths.length > 0 ? gameImages.death : gameImages.day
      };
      
      setMessages(prev => [...prev, dayMsg]);

      // Bot reactions to deaths
      if (deaths.length > 0) {
        setTimeout(async () => {
          const aliveBots = newGameState.players.filter(p => p.isBot && p.alive);
          for (let i = 0; i < Math.min(2, aliveBots.length); i++) {
            const bot = aliveBots[i];
            const personality = newGameState.botPersonalities[bot.name];
            const reactions = reactiveMessages.onDeath(deaths[0]);
            const reaction = reactions[personality];
            
            if (reaction) {
              const reactionMsg = {
                id: Date.now() + i,
                user: bot.name,
                text: reaction,
                timestamp: new Date().toISOString(),
                type: 'chat',
                isBot: true
              };
              
              setMessages(prev => [...prev, reactionMsg]);
              
              if (binId) {
                const currentData = await getBinData(binId);
                if (currentData) {
                  await updateBin(binId, {
                    ...currentData,
                    messages: [...currentData.messages, reactionMsg]
                  });
                }
              }
              
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          }
        }, 2000);
      }

      const winState = checkWinCondition(newGameState);
      if (winState) {
        const winMsg = {
          id: Date.now() + 1,
          user: 'Desa',
          text: winState,
          timestamp: new Date().toISOString(),
          type: 'system',
          image: winState.includes('WEREWOLF') ? gameImages.werewolfWin : gameImages.villageWin
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
        }, 10000);
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
            scheduleBotChat(bot.name, 'day', newGameState, 2000 + idx * 1500);
          });
        }, 3000);
        
        setTimeout(() => injectStoryEvent(newGameState), 10000);
      }
      
    } else if (gameState.phase === 'day') {
      newGameState.phase = 'voting';
      newGameState.votes = {};
      
      const votingMsg = {
        id: Date.now(),
        user: 'Desa',
        text: storyMessages.votingStart(gameState.day),
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
          scheduleBotChat(bot.name, 'voting', newGameState, 2000 + idx * 1000);
        });
      }, 2000);
      
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
            const wasWerewolf = gameState.roles[executed] === 'werewolf';
            
            executionMsg.push({
              id: Date.now(),
              user: 'Desa',
              text: storyMessages.execution(executed, gameState.roles[executed], maxVotes),
              timestamp: new Date().toISOString(),
              type: 'system',
              image: gameImages.death
            });
            
            // Bot reactions to execution
            setTimeout(async () => {
              const aliveBots = newGameState.players.filter(p => p.isBot && p.alive);
              for (let i = 0; i < Math.min(2, aliveBots.length); i++) {
                const bot = aliveBots[i];
                const personality = newGameState.botPersonalities[bot.name];
                const reactions = reactiveMessages.onExecution(executed, wasWerewolf);
                const reaction = reactions[personality];
                
                if (reaction) {
                  const reactionMsg = {
                    id: Date.now() + i + 100,
                    user: bot.name,
                    text: reaction,
                    timestamp: new Date().toISOString(),
                    type: 'chat',
                    isBot: true
                  };
                  
                  setMessages(prev => [...prev, reactionMsg]);
                  
                  if (binId) {
                    const currentData = await getBinData(binId);
                    if (currentData) {
                      await updateBin(binId, {
                        ...currentData,
                        messages: [...currentData.messages, reactionMsg]
                      });
                    }
                  }
                  
                  await new Promise(resolve => setTimeout(resolve, 1500));
                }
              }
            }, 3000);
          }
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
        const executed = Object.keys(voteCount).find(k => voteCount[k] === Math.max(...Object.values(voteCount)));
        const winMsg = {
          id: Date.now() + 2,
          user: 'Desa',
          text: winState.includes('WEREWOLF') 
            ? storyMessages.werewolfWin(newGameState.players.filter(p => p.alive).map(p => p.name))
            : storyMessages.villageWin(executed),
          timestamp: new Date().toISOString(),
          type: 'system',
          image: winState.includes('WEREWOLF') ? gameImages.werewolfWin : gameImages.villageWin
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
        }, 10000);
      } else {
        for (const bot of newGameState.players.filter(p => p.isBot && p.alive)) {
          newGameState = smartBotAction(bot.name, 'night', newGameState);
        }
        newGameState.gameTimer = 90;
        
        const nightMsg = {
          id: Date.now() + 3,
          user: 'Desa',
          text: storyMessages.nightStart(newGameState.day),
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
            scheduleBotChat(bot.name, 'night', newGameState, 2000 + idx * 1000);
          });
        }, 2000);
        
        setTimeout(() => injectStoryEvent(newGameState), 8000);
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
    const colors = { 
      werewolf: 'bg-red-900/40 border-red-600', 
      seer: 'bg-purple-900/40 border-purple-600', 
      guard: 'bg-blue-900/40 border-blue-600', 
      villager: 'bg-gray-700/40 border-gray-600' 
    };
    return colors[role] || 'bg-gray-700/40 border-gray-600';
  };

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
            {isReconnecting ? (
              <div className="flex items-center gap-1 bg-yellow-900/40 border border-yellow-600/50 rounded-lg px-2 sm:px-3 py-1 sm:py-2 animate-pulse">
                <WifiOff className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-300 text-xs font-bold hidden sm:inline">Reconnecting...</span>
              </div>
            ) : isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            {roomCode && (
              <button onClick={copyRoomCode} className="flex items-center gap-1 bg-slate-800/50 border border-blue-500/30 rounded-lg px-2 sm:px-3 py-1 sm:py-2 font-bold text-xs active:scale-95 transition-all">
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
                    <div className="min-w-0">
                      <span className="font-semibold truncate block">{player.name} {player.isBot && '🤖'}</span>
                      {player.isBot && gameState.botPersonalities[player.name] && (
                        <span className="text-xs text-blue-400">{botPersonalityProfiles[gameState.botPersonalities[player.name]]?.name}</span>
                      )}
                    </div>
                  </div>
                  {!player.alive && <Skull className="w-5 h-5 text-red-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

              {myRole && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-blue-400 mb-3 tracking-wider uppercase">YOUR ROLE</h4>
                  <div className={`${getRoleColor(myRole)} border-2 rounded-xl p-4 text-center`}>
                    <div className="text-5xl mb-2">{getRoleEmoji(myRole)}</div>
                    <div className="text-lg font-black text-blue-300 uppercase">{myRole}</div>
                  </div>
                </div>
              )}

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
                <p className="text-blue-200/80">Bunuh warga setiap malam. Menang jika jumlah werewolf ≥ warga.</p>
              </div>

              <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-3">
                <h3 className="text-purple-300 font-bold mb-1 flex items-center gap-2">🔮 SEER</h3>
                <p className="text-blue-200/80">Lihat role seseorang setiap malam. Bantu warga temukan werewolf!</p>
              </div>

              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
                <h3 className="text-blue-300 font-bold mb-1 flex items-center gap-2">🛡️ GUARD</h3>
                <p className="text-blue-200/80">Lindungi 1 orang setiap malam dari serangan werewolf.</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3">
                <h3 className="text-slate-300 font-bold mb-1">👤 VILLAGER</h3>
                <p className="text-blue-200/80">Diskusi dan vote untuk temukan werewolf di siang hari.</p>
              </div>
            </div>

            <button onClick={() => setShowTutorial(false)} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-sm active:scale-95 transition-all">
              GOT IT
            </button>
          </div>
        </div>
      )}

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
                  <p className="text-xs sm:text-sm font-semibold text-yellow-100 whitespace-pre-line leading-relaxed">{msg.text}</p>
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
                      {msg.user} {msg.isBot && '🤖'}
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