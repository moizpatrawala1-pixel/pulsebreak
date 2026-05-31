(() => {
  "use strict";

  // ═══════════════════════════════════════════════════════════════════════════
  // §1  CONSTANTS & STORAGE
  // ═══════════════════════════════════════════════════════════════════════════

  const STORAGE_KEY     = "pulsebreak.save.v2";
  const OLD_STORAGE_KEY = "pulsebreak.save.v1";
  const AD_UNITS        = { rewarded: "REPLACE_WITH_ADMOB_REWARDED_ID" };

  // ═══════════════════════════════════════════════════════════════════════════
  // §2  CANVAS & PERFORMANCE TIER
  // ═══════════════════════════════════════════════════════════════════════════

  const canvas = document.getElementById("gameCanvas");
  const ctx    = canvas.getContext("2d", { alpha: false });

  const PERF = (() => {
    const mem   = navigator.deviceMemory       || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const isLowEnd   = mem <= 2 || cores <= 2;
    const isMidRange = !isLowEnd && (mem <= 4 || cores <= 4);
    return {
      shadowBlur:   !isLowEnd,
      maxParticles: isLowEnd ? 60  : isMidRange ? 110 : 160,
      maxSparks:    isLowEnd ? 24  : isMidRange ? 44  : 70,
      maxWakes:     isLowEnd ? 6   : isMidRange ? 12  : 20,
      burstScale:   isLowEnd ? 0.5 : isMidRange ? 0.75 : 1.0,
      dprCap:       isLowEnd ? 1   : 2,
      isLowEnd,
    };
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // §3  COLOUR PALETTE
  // ═══════════════════════════════════════════════════════════════════════════

  const C = {
    ghost:     "#E8EDF5",
    danger:    "#E8344A",
    reward:    "#FF8C42",
    void:      "#0A0B12",
    structure: "#1A2340",
    wake:      "#C8F0FF",
    boost:     "#FF5500",
    perfect:   "#A0FFB4",
    spine:     "#B026FF",
    muted:     "#8896B0",
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // §4  DOM ELEMENT CACHE
  // ═══════════════════════════════════════════════════════════════════════════

  const els = {
    hud:             document.getElementById("hud"),
    menu:            document.getElementById("menuScreen"),
    pause:           document.getElementById("pauseScreen"),
    gameOver:        document.getElementById("gameOverScreen"),
    stage:           document.getElementById("stageText"),
    score:           document.getElementById("scoreText"),
    best:            document.getElementById("bestText"),
    level:           document.getElementById("levelText"),
    xp:              document.getElementById("xpText"),
    menuBest:        document.getElementById("menuBest"),
    coins:           document.getElementById("coinText"),
    cores:           document.getElementById("coreText"),
    runs:            document.getElementById("runText"),
    zoneGrid:        document.getElementById("zoneGrid"),
    skinGrid:        document.getElementById("skinGrid"),
    trailGrid:       document.getElementById("trailGrid"),
    boostGrid:       document.getElementById("boostGrid"),
    extraCosmetics:  document.getElementById("extraCosmetics"),
    missionList:     document.getElementById("missionList"),
    dailyPanel:      document.getElementById("dailyPanel"),
    levelPanel:      document.getElementById("levelPanel"),
    achievementList: document.getElementById("achievementList"),
    socialPanel:     document.getElementById("socialPanel"),
    challengeInput:  document.getElementById("challengeInput"),
    finalScore:      document.getElementById("finalScore"),
    earnedCoins:     document.getElementById("earnedCoins"),
    finalShards:     document.getElementById("finalShards"),
    finalCombo:      document.getElementById("finalCombo"),
    finalStage:      document.getElementById("finalStage"),
    finalXp:         document.getElementById("finalXp"),
    finalMoment:     document.getElementById("finalMoment"),
    runMode:         document.getElementById("runModeText"),
    revive:          document.getElementById("reviveBtn"),
    doubleReward:    document.getElementById("doubleRewardBtn"),
    share:           document.getElementById("shareBtn"),
    boost:           document.getElementById("boostBtn"),
    boostRingFill:   document.getElementById("boostRingFill"),
    toast:           document.getElementById("toast"),
    adModal:         document.getElementById("adModal"),
    adMeter:         document.getElementById("adMeterFill"),
    adDone:          document.getElementById("adDoneBtn"),
    lucky:           document.getElementById("luckyBtn"),
    doubleLast:      document.getElementById("doubleBtn"),
    sound:           document.getElementById("soundBtn"),
    haptics:         document.getElementById("hapticsBtn"),
    scoreStrong:     document.getElementById("scoreText"),
  };

  const RING_CIRC = 2 * Math.PI * 44;

  // ═══════════════════════════════════════════════════════════════════════════
  // §5  GAME DATA — ZONES, STAGES, SKINS, ETC.
  // ═══════════════════════════════════════════════════════════════════════════

  const RARITIES = {
    Common:    { color: C.ghost,   coin: [150, 600],     fragment: 0  },
    Rare:      { color: C.perfect, coin: [800, 2000],    fragment: 0  },
    Epic:      { color: C.spine,   coin: [3000, 7500],   fragment: 10 },
    Legendary: { color: C.reward,  coin: [12000, 18000], fragment: 35 },
    Mythic:    { color: "#ffffff", coin: [0, 0],         fragment: 80 }
  };

  const ZONES = [
    { id:"neon_city",        name:"Neon City",        color:C.wake,    unlockLevel:1,
      mechanic:"Dodge and thread the needle.",
      introMsg:null },
    { id:"quantum_core",     name:"Quantum Core",     color:C.perfect, unlockLevel:8,
      mechanic:"Energy drains here — near misses refill it.",
      introMsg:"Energy drains here — near misses refill it" },
    { id:"void_network",     name:"Void Network",     color:C.muted,   unlockLevel:16,
      mechanic:"Every lane switch locks for 0.6s — commit.",
      introMsg:"Every lane switch locks for 0.6s — commit" },
    { id:"glitch_dimension", name:"Glitch Dimension", color:C.spine,   unlockLevel:26,
      mechanic:"One obstacle is always fake — read the color.",
      introMsg:"One obstacle is always fake — read the color" },
    { id:"singularity",      name:"Singularity",      color:C.boost,   unlockLevel:38,
      mechanic:"Gravity pulls you to center — fight it for energy.",
      introMsg:"Gravity pulls you to center — fight it for energy" },
    { id:"pulse_nexus",      name:"Pulse Nexus",      color:C.ghost,   unlockLevel:55,
      mechanic:"Near misses cool the heat — let it build, surge it.",
      introMsg:"Near misses cool the heat — let it build, surge it" },
  ];

  // Stage durations & speedMuls are redesigned:
  // Stages 1-6: 18-22s, speedMul 1.0-1.12 (boss reachable in ~90s)
  // Stage 7 (boss): 35s, speedMul 1.16
  const STAGES = [
    ["Calm Introduction",    "intro",     18, 1.00],
    ["Speed Lift",           "speed",     19, 1.04],
    ["Split Paths",          "split",     20, 1.07],
    ["Signal Drift",         "drift",     20, 1.09],
    ["Gatebreaker",          "mini",      21, 1.10],
    ["First Chaos",          "chaos",     22, 1.12],
    ["Boss: Metro Firewall", "boss",      35, 1.16],
    ["Aftershock",           "speed",     28, 1.22],
    ["Hazard Mix",           "mix",       30, 1.28],
    ["Elite Signal",         "elite",     32, 1.34],
    ["Blind Corners",        "drift",     32, 1.40],
    ["Overcharge",           "overcharge",32, 1.46],
    ["Compression",          "compress",  32, 1.52],
    ["Boss: Circuit Tyrant", "boss",      38, 1.58],
    ["Neon Rain",            "rain",      34, 1.64],
    ["Mirror Split",         "mirror",    34, 1.70],
    ["Elite Convoy",         "elite",     36, 1.76],
    ["Glitch Surge",         "chaos",     34, 1.82],
    ["Velocity Gate",        "speed",     36, 1.88],
    ["Mini Boss: Null Lock", "mini",      38, 1.94],
    ["Boss: Void Sentinel",  "boss",      44, 2.00],
    ["Shard Fever",          "fever",     36, 2.06],
    ["Collapse Grid",        "collapse",  40, 2.14],
    ["Chaos Stack",          "chaos",     44, 2.22],
    ["Boss: Pulsebreaker",   "boss",      58, 2.32],
  ].map((r, i) => ({ number:i+1, name:r[0], kind:r[1], duration:r[2], speedMul:r[3] }));

  // ─── Pattern library ────────────────────────────────────────────────────────
  // Each pattern is a 4-beat sequence. "gap" = 1.2s spawn pause. "shard_line" =
  // 4 shards in a column. All other entries map to obstacle type strings.
  const PATTERN_LIBRARY = {
    opener:         ["bulkhead", "gap",      "bulkhead", "gap"],
    near_chain:     ["gate",     "gate",     "gate",     "gap"],
    pressure:       ["bulkhead", "splice",   "bulkhead", "convoy"],
    relief:         ["gap",      "gap",      "shard_line","gap"],
    convoy_rush:    ["convoy",   "gap",      "convoy",   "gap"],
    drift_set:      ["drift",    "gap",      "drift",    "gate"],
    boss_approach:  ["bulkhead", "bulkhead", "gate",     "bulkhead"],
    mirror_set:     ["mirror",   "gap",      "mirror",   "gate"],
    phantom_run:    ["phantom",  "gate",     "phantom",  "gap"],
    pulse_chain:    ["pulse",    "gap",      "pulse",    "gate"],
    echo_set:       ["echoes",   "gate",     "echoes",   "gap"],
    shard_shower:   ["shard_line","gap",     "shard_line","bulkhead"],
    fever:          ["bulkhead", "splice",   "convoy",   "gate"],
    elite:          ["gate",     "mirror",   "pulse",    "bulkhead"],
    chaos:          ["splice",   "drift",    "pulse",    "convoy"],
  };

  // Stage kind → pattern set
  const STAGE_PATTERNS = {
    intro:      ["opener","relief","opener"],
    speed:      ["near_chain","pressure","relief"],
    split:      ["near_chain","drift_set","relief"],
    drift:      ["drift_set","near_chain","pressure"],
    mini:       ["pressure","near_chain","boss_approach"],
    chaos:      ["chaos","pressure","near_chain"],
    boss:       ["boss_approach","boss_approach","pressure"],
    mix:        ["near_chain","drift_set","pressure"],
    elite:      ["elite","pressure","near_chain"],
    overcharge: ["fever","pressure","chaos"],
    compress:   ["pressure","boss_approach","near_chain"],
    rain:       ["phantom_run","echo_set","near_chain"],
    mirror:     ["mirror_set","near_chain","pressure"],
    fever:      ["fever","shard_shower","near_chain"],
    collapse:   ["chaos","boss_approach","pressure"],
  };

  const LOGIN_REWARDS = [
    "250 coins","50 XP","1 core","300 coins","Common skin ticket","2 lucky tokens","5 rare fragments",
    "350 coins","80 XP","2 cores","5 trail fragments","450 coins","3 lucky tokens","Rare skin ticket",
    "600 coins","120 XP","3 cores","5 boost fragments","700 coins","5 epic fragments","5 theme fragments",
    "850 coins","180 XP","5 cores","5 sound fragments","1000 coins","10 epic fragments","3 legendary fragments",
    "8 cores","Legendary quest"
  ];

  const SKILL_NODES = [
    ["lane_snap","Lane Snap","Reflex","movement",5,250,0,"+3% lane response","ghost"],
    ["near_window","Near-Miss Window","Reflex","near",5,300,0,"+4px near-miss grace","ghost"],
    ["calm_start","Calm Start","Reflex","startShield",3,450,1,"+0.5s start guard","ghost"],
    ["lucky_quality","Lucky Quality","Discovery","lucky",4,1500,6,"Better spin floor","ghost"],
    ["rare_spawn","Rare Spawn Chance","Discovery","rare",6,900,3,"+2% rare spawns","ghost"],
    ["blueprint","Blueprint Magnet","Discovery","blueprint",5,1200,4,"+3% blueprint odds","ghost"],
    ["boost_duration","Boost Duration","Pulse","boostDuration",6,500,1,"+0.12s boost","breaker"],
    ["boost_recharge","Boost Recharge","Pulse","boostRecharge",6,500,1,"+4% Pulse gain","breaker"],
    ["boost_score","Boost Break Score","Pulse","boostScore",5,650,2,"+6% break score","breaker"],
    ["failsafe","Failsafe Shield","Survival","shield",5,1000,4,"Rank 5 grants shield","breaker"],
    ["extra_life","Extra Life","Survival","extraLife",1,3000,18,"One earned revive","breaker"],
    ["boss_guard","Boss Guard","Survival","bossGuard",4,1300,5,"Boss hit guard","breaker"],
    ["combo_cap","Combo Cap","Score","comboCap",5,700,2,"+3 max combo","surgeon"],
    ["perfect_stage","Perfect Stage","Score","perfectScore",5,500,1,"+7% perfect reward","surgeon"],
    ["boss_score","Boss Multiplier","Score","bossScore",4,900,3,"+8% boss score","surgeon"],
    ["coin_mult","Coin Multiplier","Economy","coinMult",5,600,1,"+5% run coins","surgeon"],
    ["shard_value","Shard Value","Economy","shardValue",5,650,2,"+3% shard value","surgeon"],
    ["mission_bonus","Mission Bonus","Economy","missionBonus",4,800,3,"+6% mission coins","surgeon"],
  ].map(r => ({ id:r[0],name:r[1],branch:r[2],bonus:r[3],ranks:r[4],baseCoins:r[5],baseCores:r[6],copy:r[7],archetype:r[8] }));

  const MISSION_BANK = [
    ["score_500","Score 500","score",500,80],
    ["score_1500","Score 1,500","score",1500,130],
    ["score_5000","Score 5,000","score",5000,250],
    ["stage_5","Reach Stage 5","stageReached",5,140],
    ["stage_10","Reach Stage 10","stageReached",10,260],
    ["stage_15","Reach Stage 15","stageReached",15,420],
    ["boss_1","Defeat 1 boss","bossesDefeated",1,300],
    ["shards_20","Collect 20 shards","shards",20,110],
    ["shards_75","Collect 75 shards","shards",75,240],
    ["shards_150","Collect 150 shards","shards",150,390],
    ["rare_3","Collect 3 rare shards","rareShards",3,260],
    ["combo_5","Reach 5x combo","maxCombo",5,100],
    ["combo_10","Reach 10x combo","maxCombo",10,180],
    ["combo_20","Reach 20x combo","maxCombo",20,360],
    ["near_15","Trigger 15 near misses","nearMisses",15,160],
    ["near_50","Trigger 50 near misses","nearMisses",50,320],
    ["boost_3","Use Boost 3 times","boosts",3,140],
    ["boost_10","Use Boost 10 times","boosts",10,300],
    ["break_25","Break 25 hazards","hazardsBroken",25,240],
    ["perfect_2","Perfect clear 2 stages","perfectStages",2,260],
    ["meters_900","Drift 900m","meters",900,160],
    ["meters_2500","Drift 2,500m","meters",2500,330],
    ["ghost_1","Beat a ghost","ghostWins",1,260],
    ["share_1","Share an end screen","shares",1,180],
    ["daily_best","Beat your Daily score","dailyBest",1,300],
  ].map(r => ({ id:r[0],label:r[1],metric:r[2],target:r[3],reward:r[4] }));

  const WEEKLY_BANK = [
    ["weekly_score","Earn 30,000 score","score",30000,1200,8],
    ["weekly_shards","Collect 600 shards","shards",600,1000,8],
    ["weekly_boss","Defeat 5 bosses","bossesDefeated",5,1400,12],
    ["weekly_near","Trigger 300 near misses","nearMisses",300,1200,10],
    ["weekly_stage","Reach Stage 20 twice","stage20Runs",2,1500,14],
    ["weekly_ghost","Beat 3 ghosts","ghostWins",3,1300,10],
  ].map(r => ({ id:r[0],label:r[1],metric:r[2],target:r[3],xp:r[4],cores:r[5] }));

  const SKIN_NAMES = [
    "Volt Runner","Carbon Basic","Blue Static","Cherry Byte","Lime Wire","Amber Dot","Steel Flash","Pink Relay","Ice Chip","Street Glow",
    "Blackout Lite","White Noise","Signal Green","Arcade Red","Sky Packet","Hazard Yellow","Mint Sync","Violet Ping","Graphite","Sunrise",
    "Nightline","Glass Blue","Coral Rush","Circuit Sand","Flatline","Pulse Rookie","Metro","Data Drop","Prism Low","Starter Gold",
    "Crimson Trace","Ocean Split","Neon Taxi","After Hours","Cyber Jade","Radiant Coil","Sapphire Drive","Honey Grid","Radioactive","Ultraviolet",
    "Solar Drift","Neon Graffiti","Plasma Wire","Synthwave","Pixel Melt","Retro CRT","Chrome Spark","Toxic Mint","Amber Circuit","Holo Edge",
    "Street Racer","Deep Freeze","Hot Swap","Warning Tape","Arcade Champion","Quantum Blade","Void Marker","Pulse Ronin","Nexus Crown","Glitch Royal",
    "Laser Bloom","Overclocked","Data Phantom","Prism Break","Ghostline","Core White","Signal Zero","Redshift","Blue Hour","Neon Crown",
    "Fractal","Circuit Glass","Pulse Idol","Memory Chip","Rift Gold","Singularity","Nova King","Metro Firewall","Circuit Tyrant","Void Sentinel",
    "Pulsebreaker","Calendar Gold","Weekly Prime","Clean Slate","Chrome Crown","Glitch Monarch","Quantum Saint","Void Crown","Nexus Prime","Season Finale",
    "First Ascendant","Eternal Pulse","Omega Circuit","Mythic Prism","Zero Point","Nexus Eternal","Final Signal","Crown Of Static","Calendar Eternal","True Pulsebreak"
  ];

  const COLOR_SET = [C.wake,C.danger,C.perfect,C.reward,C.spine,C.boost,C.ghost,"#7dd3fc","#fb7185","#c4b5fd"];

  const SKINS = SKIN_NAMES.map((name, i) => {
    const n = i + 1;
    const rarity = n <= 30 ? "Common" : n <= 55 ? "Rare" : n <= 75 ? "Epic" : n <= 90 ? "Legendary" : "Mythic";
    const range  = RARITIES[rarity].coin;
    const bands  = { Common:29, Rare:24, Epic:19, Legendary:14 };
    const step   = range[1] ? (range[1]-range[0])/Math.max(1, bands[rarity]||1) : 0;
    const offsets= { Common:i, Rare:i-30, Epic:i-55, Legendary:i-75, Mythic:i-90 };
    const offset = offsets[rarity] || 0;
    return {
      id: `skin_${String(n).padStart(3,"0")}`, name, rarity,
      color:  COLOR_SET[i % COLOR_SET.length],
      accent: COLOR_SET[(i+3) % COLOR_SET.length],
      cost:   Math.round(range[0]+step*offset),
      fragments: RARITIES[rarity].fragment + (rarity==="Mythic" ? offset*6 : 0),
      unlockLevel: rarity==="Common"?1:rarity==="Rare"?6:rarity==="Epic"?18:rarity==="Legendary"?35:80,
    };
  });

  const TRAILS        = makeCosmetics("trail",    ["Thin Line","Spark Dust","Data Thread","Ripple","Neon Ribbon","Scanline","Coin Burst","Shard Wake","Prism Trail","Glitch Tear","Gravity Arc","Overdrive Flame","Boss Aura","Nexus Path","Perfect Clear Trail","Ascension Wake","Eternal Pulse Trail"]);
  const BOOST_EFFECTS = makeCosmetics("boost_fx", ["Flash Ring","Shockwave","Split Beam","Pixel Break","Shard Nova","Gravity Snap","Firewall Burst","Whiteout","Ascension Break"]);
  const MENU_THEMES   = makeCosmetics("theme",    ["Neon City Rooftop","Quantum Reactor","Void Console","Glitch Arcade","Singularity Chamber","Pulse Nexus Gate","Seasonal Event Hub"]);
  const SOUND_PACKS   = makeCosmetics("sound",    ["Classic Pulse","Synthwave","Minimal Click","Glitch Pop","Quantum Bass","Boss Heavy","Calm Focus","Prestige Noise"]);
  const ACHIEVEMENTS  = buildAchievements();

  const MODIFIERS = [
    { id:"slipstream",     tag:"BUFF",  name:"Slipstream",     desc:"3s after each near miss, all energy gain ×2.",           type:"buff"  },
    { id:"afterburner",    tag:"BUFF",  name:"Afterburner",    desc:"Boost duration 5.0s instead of 3.6s.",                  type:"buff"  },
    { id:"momentum",       tag:"BUFF",  name:"Momentum",       desc:"Combo decay stops during Boost.",                        type:"buff"  },
    { id:"thin_ice",       tag:"BUFF",  name:"Thin Ice",       desc:"Near-miss window +10px. Any hit ends run immediately.", type:"buff"  },
    { id:"overclock",      tag:"BUFF",  name:"Overclock",      desc:"Every 10th near miss gives a free 1s Boost.",           type:"buff"  },
    { id:"signal_decay",   tag:"CURSE", name:"Signal Decay",   desc:"Energy decays 6%/s. Near misses are your lifeline.",    type:"curse" },
    { id:"compression",    tag:"CURSE", name:"Compression",    desc:"Track width 80%. Near-miss windows physically smaller.",type:"curse" },
    { id:"tremor",         tag:"CURSE", name:"Tremor",         desc:"Position drifts ±3px on 0.4s sine. Counteract it.",     type:"curse" },
    { id:"blind_approach", tag:"CURSE", name:"Blind Approach", desc:"Obstacle warning time −40%. Pattern memory wins.",      type:"curse" },
    { id:"leaky_shield",   tag:"CURSE", name:"Leaky Shield",   desc:"Failsafe skill does not activate this run.",            type:"curse" },
    { id:"ghost_run",      tag:"SHIFT", name:"Ghost Run",      desc:"No energy from near misses. Near miss = combo × 80 score.", type:"shift" },
    { id:"mirror_world",   tag:"SHIFT", name:"Mirror World",   desc:"Lane order reversed. Lane 0 is now lane 4.",            type:"shift" },
    { id:"pacifist",       tag:"SHIFT", name:"Pacifist",       desc:"Boost disabled. At 100% energy, near-miss window +6px.",type:"shift" },
    { id:"precision",      tag:"SHIFT", name:"Precision",      desc:"Only near misses ≤8px count. Others are clean passes.", type:"shift" },
    { id:"cascade",        tag:"SHIFT", name:"Cascade",        desc:"Each stage cleared spawns a 15s bonus shard stage.",    type:"shift" },
    { id:"double_threat",  tag:"SHIFT", name:"Double Threat",  desc:"Speed +15%. Score from all sources ×1.8.",              type:"shift" },
  ];

  const SPAWN_WEIGHTS = {
    neon_city:        { bulkhead:40, splice:15, convoy:15, gate:15, drift:10, pulse:5 },
    quantum_core:     { bulkhead:30, splice:20, convoy:15, gate:20, drift:10, pulse:5 },
    void_network:     { bulkhead:25, splice:15, convoy:10, gate:20, drift:10, pulse:10, phantom:10 },
    glitch_dimension: { bulkhead:20, splice:15, convoy:10, gate:15, drift:10, pulse:5, echoes:25 },
    singularity:      { bulkhead:25, splice:15, convoy:10, gate:15, drift:10, pulse:5, gravity_well:20 },
    pulse_nexus:      { bulkhead:20, splice:20, convoy:15, gate:20, drift:10, pulse:10, mirror:5 },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // §6  DEFAULT SAVE & LOAD
  // ═══════════════════════════════════════════════════════════════════════════

  const DEFAULT_SAVE = {
    version:2, best:0, coins:0, xp:0, level:1, cores:0, fragments:0,
    streakTokens:0, ascensionMarks:0, runs:0,
    selectedZone:"neon_city", selectedSkin:"skin_001", selectedTrail:"trail_001",
    selectedBoost:"boost_fx_001", selectedTheme:"theme_001", selectedSound:"sound_001",
    unlocked:{
      skins:{"skin_001":true}, trails:{"trail_001":true},
      boosts:{"boost_fx_001":true}, themes:{"theme_001":true}, sounds:{"sound_001":true}
    },
    skills:{}, achievements:{}, sound:true, haptics:true,
    missionDay:"", missions:[], weeklyKey:"", weekly:[],
    loginDay:1, loginStreak:0, lastLogin:"", dailyClaimed:"",
    adDay:"", adCounts:{}, lastRun:null, ghosts:{}, challenge:null,
    archive:[],
    circuit:{ points:0, resetDate:"", milestones:[5000,12000,22000,35000] },
    season:{ level:0, xp:0, hasSeason:false },
    stageDeathCounts:{},
    nearMissTutorialShown:false,
    starterPackShown:false,
    zoneIntroShown:{},
    stats:{
      runs:0, totalScore:0, totalShards:0, totalNearMisses:0, totalBoosts:0,
      hazardsBroken:0, bossesDefeated:0, stagesCleared:0, perfectStages:0,
      coinsEarned:0, skinsUnlocked:1, cosmeticsUnlocked:5, dailyMissions:0,
      weeklyChallenges:0, shares:0, ghostWins:0, highestStage:1,
      ascensions:0, viralMoments:0, stage20Runs:0,
      adsWatched:0, loginClaims:0, rareShards:0, bestCombo:1, bestNearMisses:0,
      bestPerfectStages:0, noReviveScore:0, noReviveStage:0, dailyBestScore:0,
      lowPulse25:0, reviveBoss:0, ghostsSaved:0, challengeWins:0,
      trailsUnlocked:0, boostsUnlocked:0, soundsUnlocked:0,
    }
  };

  const save = loadSave();

  // ═══════════════════════════════════════════════════════════════════════════
  // §7  GAME STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const state = {
    screen:"boot", mode:"classic", lanes:5, dpr:1,
    w:0, h:0, trackX:0, trackW:0, laneW:0,
    playerY:0, playerX:0, targetLane:2, pointerId:null,
    swipeStartX:null, swipeStartLane:null,
    score:0, displayedScore:0, speed:330, time:0,
    meters:0, energy:0, combo:1, comboTimer:0,
    overdrive:0, invincible:0, reviveUsed:false,
    earnedExtraLife:false, shieldAvailable:false, runEnded:false,
    spawnTimer:0, stageIndex:1, stageTimer:0, stageHits:0,
    recordTimer:0, inputGhost:[], ghostReplay:null,
    obstacles:[], shards:[], particles:[], sparks:[], messages:[],
    wakes:[], fragments:[], boostCinema:0, stageBeam:0, bossReveal:0, bossRevealName:"",
    glitchTears:[], shake:0, rng:Math.random, seed:0,
    nearMissStreak:0,
    clutchActive:false, clutchTimer:0,
    activeModifier:null, tremorPhase:0, slipstreamTimer:0, nearMissCountMod:0,
    commitLock:0, glitchFlashTimer:0, glitchFlashActive:false,
    heat:0, heatSurge:0, gravityPull:0,
    bossPhase:0, bossPhaseTimer:0, bossWeakpointActive:false, bossStaggerTimer:0,
    bossDefeatPhase:0, bossDefeatTimer:0, bossWeakpointCount:0, bossNearMissCount:0,
    patternBeat:0, spawnDensityMul:1.0, trackMaterialise:1.0,
    currentPatternName:"opener", currentPattern:[], patternStep:0,
    onboarding:false, onboardingPhase:0, onboardingTimer:0,
    comboDecayRate:1.6,
    teachShownThisRun:false,
    clutchScale:1.0,           // lerps to 1.08 during Clutch
    clutchScaleTarget:1.0,
    run: freshRunStats(),
    // Onboarding near-miss force flag
    onboardingForcedNearMiss:false,
    // Boss reveal cinematic in stage 6
    bossRevealCinematicPending:false,
  };

  const menuGhost = { x:0, lane:2, time:0, active:false };
  let audioCtx   = null;
  let lastFrame  = performance.now();
  let toastTimer = 0;
  let selectedModifierCard = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // §8  BOOT SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  function initBootScreen() {
    const bootEl     = document.getElementById("bootScreen");
    const bootCanvas = document.getElementById("bootTrackCanvas");
    if (!bootCanvas) { finishBoot(); return; }

    const btx    = bootCanvas.getContext("2d");
    const bw     = bootCanvas.width;
    const bh     = bootCanvas.height;
    const bLanes = 5;
    const bLaneW = bw / bLanes;
    const bSpeed = 260;
    let bTime = 0, bRunning = true;
    let bPlayerX    = bw / 2;
    let bTargetLane = 2;
    let bObstacles  = [];
    let bSpawnTimer = 0.6;

    function bLaneCenter(l) { return bLaneW * (l + 0.5); }

    function bLoop() {
      if (!bRunning) return;
      const dt = 0.016;
      bTime += dt;

      const tl = clamp(Math.round(2 + Math.sin(bTime * 0.6) * 1.6), 0, 4);
      bTargetLane = tl;
      bPlayerX += (bLaneCenter(bTargetLane) - bPlayerX) * 0.08;

      bSpawnTimer -= dt;
      if (bSpawnTimer <= 0) {
        const gap = Math.floor(Math.random() * bLanes);
        const lanes = [];
        for (let i = 0; i < bLanes; i++) if (i !== gap) lanes.push(i);
        bObstacles.push({ lanes, y: -20, gap });
        bSpawnTimer = 0.7 + Math.random() * 0.3;
      }
      bObstacles.forEach(ob => { ob.y += bSpeed * dt; });
      bObstacles = bObstacles.filter(ob => ob.y < bh + 40);

      btx.fillStyle = "#080910";
      btx.fillRect(0, 0, bw, bh);

      // Lane lines
      btx.strokeStyle = "rgba(255,255,255,0.08)";
      btx.lineWidth = 1;
      btx.setLineDash([6, 12]);
      btx.lineDashOffset = -(bTime * bSpeed * 0.05);
      for (let i = 1; i < bLanes; i++) {
        const lx = i * bLaneW;
        btx.beginPath(); btx.moveTo(lx, 0); btx.lineTo(lx, bh); btx.stroke();
      }
      btx.setLineDash([]);

      // Obstacles
      for (const ob of bObstacles) {
        for (const lane of ob.lanes) {
          const ox = lane * bLaneW + 4, ow = bLaneW - 8;
          btx.fillStyle = "#E8344A";
          btx.beginPath();
          if (btx.roundRect) btx.roundRect(ox, ob.y - 12, ow, 20, 4);
          else btx.rect(ox, ob.y - 12, ow, 20);
          btx.fill();
          btx.fillStyle = "#FF8C42";
          btx.globalAlpha = 0.7;
          btx.fillRect(ox + 3, ob.y - 12, ow - 6, 3);
          btx.globalAlpha = 1;
        }
      }

      // Wake strokes when player passes near an obstacle
      const playerLane = Math.round((bPlayerX - bLaneW / 2) / bLaneW);
      for (const ob of bObstacles) {
        const adj = ob.lanes.filter(l => Math.abs(l - playerLane) === 1);
        if (adj.length && Math.abs(ob.y - bh * 0.75) < 28) {
          const side = adj[0] > playerLane ? 1 : -1;
          const wg = btx.createLinearGradient(bPlayerX, bh * 0.75, bPlayerX + side * 30, bh * 0.75 - 50);
          wg.addColorStop(0, "rgba(200,240,255,0.8)");
          wg.addColorStop(1, "rgba(200,240,255,0)");
          btx.strokeStyle = wg;
          btx.lineWidth = 14;
          btx.lineCap = "round";
          btx.beginPath();
          btx.moveTo(bPlayerX, bh * 0.75);
          btx.quadraticCurveTo(bPlayerX + side * 20, bh * 0.75 - 25, bPlayerX + side * 28, bh * 0.75 - 50);
          btx.stroke();
        }
      }

      // Player
      if (!PERF.isLowEnd) { btx.shadowColor = "#C8F0FF"; btx.shadowBlur = 12; }
      btx.fillStyle = "#C8F0FF";
      btx.beginPath();
      const py = bh * 0.75;
      btx.moveTo(bPlayerX, py - 16);
      btx.bezierCurveTo(bPlayerX+9, py-6, bPlayerX+7, py+6, bPlayerX, py+14);
      btx.bezierCurveTo(bPlayerX-7, py+6, bPlayerX-9, py-6, bPlayerX, py-16);
      btx.fill();
      btx.shadowBlur = 0;

      requestAnimationFrame(bLoop);
    }
    requestAnimationFrame(bLoop);

    function dismissBoot() {
      bRunning = false;
      bootEl.classList.add("done");
      setTimeout(finishBoot, 450);
      bootEl.removeEventListener("click", dismissBoot);
      window.removeEventListener("keydown", dismissBoot);
    }
    bootEl.addEventListener("click", dismissBoot);
    window.addEventListener("keydown", dismissBoot);
    setTimeout(() => { if (bRunning) dismissBoot(); }, 4000);
  }

  function finishBoot() {
    state.screen = "menu";
    document.getElementById("bootScreen").style.display = "none";
    document.getElementById("menuScreen").classList.add("active");
    updateMenu();
    menuGhost.active = true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §9  NEAR-MISS TEACH OVERLAY
  // ═══════════════════════════════════════════════════════════════════════════

  let teachFreezeTimer  = 0;
  let teachFreezePending = false;

  function triggerNearMissTeach() {
    if (save.nearMissTutorialShown)    return;
    if (state.teachShownThisRun)       return;
    state.teachShownThisRun = true;
    save.nearMissTutorialShown = true;

    teachFreezePending = true;
    teachFreezeTimer   = 0.45;

    const el = document.getElementById("nearMissTeach");
    el.classList.add("visible");
    setTimeout(() => el.classList.remove("visible"), 1800);

    vibrate([20, 30, 20]);
    playSound("shard");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §10  PERSONAL BEST FLASH & MOMENT
  // ═══════════════════════════════════════════════════════════════════════════

  function firePbFlash() {
    const el = document.getElementById("pbFlash");
    el.classList.remove("fire");
    void el.offsetWidth;
    el.classList.add("fire");
    setTimeout(() => el.classList.remove("fire"), 750);
  }

  // §11  LEADERBOARD MINI
  function buildLeaderboard() {
    const zone      = currentZone();
    const zoneLabel = document.getElementById("leaderboardZoneLabel");
    if (zoneLabel) zoneLabel.textContent = zone.name;

    const seed = hashString(`lb-${dayKey()}-${save.selectedZone}`);
    const rng  = mulberry32(seed);
    const RIVAL_NAMES = ["SynthRacer","NullByte","GhostLane","VoidKing","PulseAce","NeonGhost","SignalX","BreakRun","CircuitK","ZeroNode"];

    const playerBest = save.best || 0;
    const rivals = RIVAL_NAMES.slice(0, 4).map(name => ({
      name,
      score: Math.floor(Math.max(500, playerBest * (0.7 + rng() * 0.6) + rng() * 2000)),
      isYou: false,
    }));
    const allEntries = [...rivals, { name:"YOU", score:playerBest, isYou:true }];
    allEntries.sort((a, b) => b.score - a.score);

    const container = document.getElementById("leaderboardRows");
    if (!container) return;
    container.replaceChildren();
    const rankLabels = ["gold","silver","bronze","",""];
    allEntries.slice(0,5).forEach((entry, i) => {
      const row = document.createElement("div");
      row.className = "leaderboard-row";
      const rc = rankLabels[i] ? ` ${rankLabels[i]}` : "";
      row.innerHTML = `<span class="leaderboard-rank${rc}">${i+1}</span><span class="leaderboard-name${entry.isYou?" you":""}">${entry.name}</span><span class="leaderboard-score">${format(entry.score)}</span>`;
      container.append(row);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §12  STARTER PACK MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  function maybeShowStarterPack() {
    if (save.starterPackShown) return;
    if (save.runs > 1)         return;
    save.starterPackShown = true;
    persist();
    setTimeout(() => {
      const modal = document.getElementById("starterPackModal");
      modal.classList.add("active");
      modal.setAttribute("aria-hidden","false");
    }, 2400);
  }

  function dismissStarterPack() {
    const modal = document.getElementById("starterPackModal");
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden","true");
  }

  // IAP stub — no fake purchase simulation
  function openIAP(productId, coins, price) {
    console.log(`[IAP] Attempt: productId=${productId}, coins=${coins}, price=${price}`);
    toast("In-app purchases coming soon — stay tuned");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §13  SHARE CARD
  // ═══════════════════════════════════════════════════════════════════════════

  function shareRun() {
    if (!save.lastRun) return toast("No run to share");
    renderShareCard(save.lastRun);
    document.getElementById("shareCardModal").classList.add("active");
    document.getElementById("shareCardModal").setAttribute("aria-hidden","false");
    save.stats.shares += 1;
    updateAchievements();
    persist();
  }

  function renderShareCard(run) {
    const sc = document.getElementById("shareCardCanvas");
    if (!sc) return;
    const c = sc.getContext("2d");
    const W = sc.width, H = sc.height;
    const zone = ZONES.find(z => z.id === (run.zone || save.selectedZone)) || ZONES[0];

    c.fillStyle = "#080910";
    c.fillRect(0,0,W,H);

    const grad = c.createLinearGradient(0,0,W,H);
    grad.addColorStop(0, zone.color + "22");
    grad.addColorStop(1, "#080910");
    c.fillStyle = grad;
    c.fillRect(0,0,W,H);

    c.fillStyle = zone.color;
    c.fillRect(0,0,4,H);

    c.fillStyle = "#EDF0F7";
    c.font = "700 96px 'Space Grotesk', sans-serif";
    c.textAlign = "left"; c.textBaseline = "top";
    c.fillText(format(run.score), 40, 48);

    c.fillStyle = zone.color;
    c.font = "700 13px 'DM Mono', monospace";
    c.textAlign = "right";
    c.fillText("PULSEBREAK", W-32, 32);
    c.fillStyle = "#7A8AA8";
    c.font = "400 11px 'DM Mono', monospace";
    c.fillText("Signal Ghost", W-32, 50);

    c.fillStyle = zone.color + "22";
    c.beginPath(); if (c.roundRect) c.roundRect(40, 160, 140, 28, 14); else c.rect(40,160,140,28); c.fill();
    c.fillStyle = zone.color;
    c.font = "700 11px 'DM Mono', monospace";
    c.textAlign = "left";
    c.fillText(zone.name.toUpperCase(), 56, 179);

    const stats = [
      ["STAGE",     String(run.stageReached || 1)],
      ["STREAK",    run.nearMisses >= 20 ? "UNTOUCHABLE" : run.nearMisses >= 10 ? "GHOST LINE" : run.nearMisses >= 5 ? "RAZOR" : String(run.nearMisses || 0)],
      ["COMBO",     `${run.maxCombo || 1}×`],
      ["HIGHLIGHT", run.highlight || "Clean Run"],
    ];
    c.textBaseline = "top";
    stats.forEach(([label, value], i) => {
      const col = i % 2 === 0 ? 40  : 420;
      const row = i < 2       ? 220 : 300;
      c.fillStyle = "#7A8AA8"; c.font = "700 10px 'DM Mono', monospace"; c.textAlign = "left";
      c.fillText(label, col, row);
      c.fillStyle = "#EDF0F7"; c.font = "700 22px 'Space Grotesk', sans-serif";
      c.fillText(value, col, row+16);
    });

    if (run.modifier && run.modifier !== "none") {
      const mod = MODIFIERS.find(m => m.id === run.modifier);
      if (mod) {
        c.fillStyle = "rgba(255,140,66,0.15)";
        c.beginPath(); if (c.roundRect) c.roundRect(40,370,200,22,11); else c.rect(40,370,200,22); c.fill();
        c.fillStyle = "#FF8C42"; c.font = "700 10px 'DM Mono', monospace"; c.textAlign = "left";
        c.fillText(`MODIFIER: ${mod.name.toUpperCase()}`, 56, 385);
      }
    }

    const code = makeChallengeCode();
    c.fillStyle = "#3A4A6A"; c.font = "400 10px 'DM Mono', monospace"; c.textAlign = "right";
    c.fillText(code, W-32, H-20);

    const wg = c.createLinearGradient(W-280, 80, W-60, 200);
    wg.addColorStop(0, zone.color+"00"); wg.addColorStop(0.5, zone.color+"44"); wg.addColorStop(1, zone.color+"00");
    c.strokeStyle = wg; c.lineWidth = 28; c.lineCap = "round";
    c.beginPath(); c.moveTo(W-280,80); c.quadraticCurveTo(W-160,140,W-60,200); c.stroke();
  }

  async function downloadShareCard() {
    const sc = document.getElementById("shareCardCanvas");
    if (!sc) return;
    const blob = await new Promise(res => sc.toBlob(res, "image/png"));
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "pulsebreak-run.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function nativeShareCard() {
    const sc = document.getElementById("shareCardCanvas");
    if (!sc) return;
    const blob = await new Promise(res => sc.toBlob(res, "image/png"));
    const file = new File([blob], "pulsebreak-run.png", { type:"image/png" });
    const shareData = {
      title: "Pulsebreak",
      text:  `${format(save.lastRun?.score||0)} · ${save.lastRun?.highlight||"Clean Run"} · Thread the needle.`,
      files: [file],
    };
    if (navigator.canShare && navigator.canShare(shareData)) {
      try { await navigator.share(shareData); return; } catch {}
    }
    copyText(makeChallengeCode(), "Challenge code copied");
  }

  function dismissShareCard() {
    document.getElementById("shareCardModal").classList.remove("active");
    document.getElementById("shareCardModal").setAttribute("aria-hidden","true");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §14  IAP – COIN BUNDLES & SEASON PASS (all stubbed)
  // ═══════════════════════════════════════════════════════════════════════════

  function initCoinBundles() {
    document.querySelectorAll(".coin-bundle").forEach(el => {
      el.addEventListener("click", () => {
        const coins = parseInt(el.dataset.coins || "0");
        const price = el.dataset.price || "?";
        openIAP(`coins_${coins}`, coins, `₹${price}`);
      });
    });
  }

  function initSeasonPassBanner() {
    const banner = document.getElementById("seasonPassBanner");
    if (banner) banner.addEventListener("click", () => openIAP("season_pass", 0, "₹299"));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §15  MODIFIER SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  function showModifierScreen() {
    selectedModifierCard = null;
    document.getElementById("modifierConfirmBtn").disabled = true;
    document.getElementById("modifierScreen").classList.add("active");
    drawModifierCards();
  }

  // Daily modifier: seeded by date + zone
  function getDailyModifier() {
    const seed = hashString(`daily-mod-${dayKey()}-${save.selectedZone}`);
    const rng  = mulberry32(seed);
    return MODIFIERS[Math.floor(rng() * MODIFIERS.length)];
  }

  function drawModifierCards() {
    const cards = document.getElementById("modifierCards");
    cards.replaceChildren();
    const rng    = mulberry32(Math.floor(Math.random() * 2**32));
    const pick   = arr => arr[Math.floor(rng() * arr.length)];
    const buffs  = MODIFIERS.filter(m => m.type==="buff");
    const curses = MODIFIERS.filter(m => m.type==="curse");
    const shifts = MODIFIERS.filter(m => m.type==="shift");
    const chosen = [pick(buffs), pick(curses), pick(shifts)];

    chosen.forEach((mod, idx) => {
      const card = document.createElement("div");
      card.className = `modifier-card ${mod.type}`;
      card.tabIndex = 0;
      card.innerHTML = `
        <div class="modifier-type-tag">${mod.tag}</div>
        <div class="modifier-name">${mod.name}</div>
        <div class="modifier-desc">${mod.desc}</div>
        <div class="modifier-footer">
          <button class="modifier-reroll" type="button">Reroll (20 ◆)</button>
        </div>`;
      card.addEventListener("click", () => {
        document.querySelectorAll(".modifier-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        selectedModifierCard = mod;
        document.getElementById("modifierConfirmBtn").disabled = false;
      });
      card.querySelector(".modifier-reroll").addEventListener("click", e => {
        e.stopPropagation();
        if (save.cores < 20) {
          if (canWatchAd("mission")) {
            showPreviewAd("Reroll modifier").then(ok => { if (ok) { countAd("mission"); replaceModifierCard(card, idx, mod.type, chosen); } });
          } else toast("Need 20 cores to reroll");
          return;
        }
        save.cores -= 20; persist();
        replaceModifierCard(card, idx, mod.type, chosen);
      });
      cards.append(card);
    });
  }

  function replaceModifierCard(cardEl, idx, type, chosen) {
    const pool   = MODIFIERS.filter(m => m.type===type && !chosen.some((c,ci) => ci!==idx && c.id===m.id));
    const rng    = mulberry32(Math.floor(Math.random() * 2**32));
    const newMod = pool[Math.floor(rng() * pool.length)];
    chosen[idx]  = newMod;
    cardEl.querySelector(".modifier-name").textContent     = newMod.name;
    cardEl.querySelector(".modifier-desc").textContent     = newMod.desc;
    cardEl.querySelector(".modifier-type-tag").textContent = newMod.tag;
    cardEl.className = `modifier-card ${newMod.type}`;
    cardEl.classList.remove("selected");
    if (selectedModifierCard === chosen[idx]) selectedModifierCard = null;
    document.getElementById("modifierConfirmBtn").disabled = true;
    cardEl.onclick = () => {
      document.querySelectorAll(".modifier-card").forEach(c => c.classList.remove("selected"));
      cardEl.classList.add("selected");
      selectedModifierCard = newMod;
      document.getElementById("modifierConfirmBtn").disabled = false;
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §16  DATA HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  function makeCosmetics(prefix, names) {
    return names.map((name, i) => ({
      id: `${prefix}_${String(i+1).padStart(3,"0")}`, name,
      rarity: i<4?"Common":i<8?"Rare":i<12?"Epic":i<15?"Legendary":"Mythic",
      color:  COLOR_SET[i % COLOR_SET.length],
      cost:   i<4?250+i*120:i<8?1000+i*160:i<12?3600+i*320:i<15?12000+i*500:0,
      fragments:  i<8?0:i<12?10:i<15?35:80,
      unlockLevel:i<4?1:i<8?8:i<12?22:i<15?45:80,
    }));
  }

  function buildAchievements() {
    const rows = [
      ["First Pulse","Complete 1 run","runs",1],["Back Again","Complete 5 runs","runs",5],
      ["Habit Spark","Complete 25 runs","runs",25],["Runner's Rhythm","Complete 100 runs","runs",100],
      ["Endless Intent","Complete 250 runs","runs",250],["One More Run","Complete 500 runs","runs",500],
      ["True Circuit","Complete 1,000 runs","runs",1000],
      ["First Clear","Clear Stage 5","highestStage",5],["Into The Deep","Clear Stage 15","highestStage",15],["Past The Break","Clear Stage 25","highestStage",25],
      ["Triple Digits","Score 1,000","best",1000],["Neon Sharp","Score 5,000","best",5000],
      ["Signal Climber","Score 10,000","best",10000],["Pulse Artist","Score 25,000","best",25000],
      ["Grid Legend","Score 50,000","best",50000],["Six-Figure Signal","Score 100,000","best",100000],
      ["Million Pulse","Lifetime score 1,000,000","totalScore",1000000],
      ["Ten Million Signal","Lifetime score 10,000,000","totalScore",10000000],
      ["Unbroken Score","Score 10,000 without revive","noReviveScore",10000],
      ["Daily Crown","Score 25,000 in Daily Run","dailyBestScore",25000],
      ["Stage Walker","Clear 10 total stages","stagesCleared",10],
      ["Stage Rider","Clear 100 total stages","stagesCleared",100],
      ["Stage Architect","Clear 500 total stages","stagesCleared",500],
      ["Stage Eternal","Clear 2,000 total stages","stagesCleared",2000],
      ["Perfect Entry","Perfect clear 1 stage","perfectStages",1],
      ["Perfect Stack","Perfect clear 3 stages","perfectStages",3],
      ["No Error Run","Perfect clear 7 stages","bestPerfectStages",7],
      ["Boss Gate","Reach a boss","bossesDefeated",1],
      ["Boss Breaker","Defeat 10 bosses","bossesDefeated",10],
      ["Boss Archivist","Defeat 100 bosses","bossesDefeated",100],
      ["First Shard","Collect 1 shard","totalShards",1],["Pocket Glow","Collect 100 shards","totalShards",100],
      ["Shard Route","Collect 500 shards","totalShards",500],["Shard Surge","Collect 2,500 shards","totalShards",2500],
      ["Shard Storm","Collect 10,000 shards","totalShards",10000],
      ["Rare Catch","Collect 1 rare shard","rareShards",1],["Rare Route","Collect 25 rare shards","rareShards",25],["Rare Magnet","Collect 250 rare shards","rareShards",250],
      ["Coin Flow","Earn 10,000 coins","coinsEarned",10000],["Coin Engine","Earn 100,000 coins","coinsEarned",100000],
      ["First Combo","Reach 5x combo","bestCombo",5],["Clean Chain","Reach 10x combo","bestCombo",10],
      ["Pulse Chain","Reach 20x combo","bestCombo",20],["Combo Architect","Reach 30x combo","bestCombo",30],
      ["Impossible Thread","Reach 40x combo","bestCombo",40],
      ["Near Miss","Trigger 1 near miss","totalNearMisses",1],["Risk Taker","Trigger 50 near misses","totalNearMisses",50],
      ["Close Call Pro","Trigger 500 near misses","totalNearMisses",500],["Edge Reader","Trigger 2,000 near misses","totalNearMisses",2000],
      ["Clutch Signature","Trigger 10 near misses in one run","bestNearMisses",10],
      ["First Boost","Use Boost once","totalBoosts",1],["Boost Habit","Use Boost 50 times","totalBoosts",50],
      ["Boost Breaker","Destroy 100 hazards with Boost","hazardsBroken",100],
      ["Overdrive Line","Destroy 1,000 hazards with Boost","hazardsBroken",1000],
      ["Late Save","Trigger a clutch moment","viralMoments",1],
      ["Revived Run","Use rewarded revive once","adsWatched",1],
      ["No Revive Needed","Reach Stage 20 without revive","noReviveStage",20],
      ["Neon Native","Play Neon City","zone_neon_city",1],
      ["Quantum Key","Unlock Quantum Core","level",8],["Void Key","Unlock Void Network","level",16],
      ["Glitch Key","Unlock Glitch Dimension","level",26],["Singularity Key","Unlock Singularity","level",38],
      ["Nexus Key","Unlock Pulse Nexus","level",55],
      ["Daily Spark","Complete 1 Daily Mission","dailyMissions",1],
      ["Daily Routine","Complete 10 Daily Missions","dailyMissions",10],
      ["Daily Machine","Complete 50 Daily Missions","dailyMissions",50],
      ["Calendar Start","Claim 3 login rewards","loginClaims",3],
      ["Streak Seven","Reach 7-day streak","loginStreak",7],
      ["Streak Thirty","Reach 30-day streak","loginStreak",30],
      ["Weekly Winner","Complete 1 Weekly Challenge","weeklyChallenges",1],
      ["First Skin","Unlock 1 skin","skinsUnlocked",1],
      ["Style Grid","Unlock 15 skins","skinsUnlocked",15],
      ["Collector","Unlock 35 skins","skinsUnlocked",35],
      ["Ghost Made","Save first ghost replay","ghostsSaved",1],
      ["Ghost Beat","Beat your ghost","ghostWins",1],
      ["Share The Break","Share 10 end screens","shares",10],
      ["Level 50","Reach Account Level 50","level",50],
      ["Level 100","Reach Account Level 100","level",100],
      ["First Ascension","Ascend once","ascensions",1],
    ];
    const tiers = ["Bronze","Bronze","Silver","Gold","Platinum","Mythic"];
    return rows.map((row, i) => ({
      id:     `ach_${String(i+1).padStart(3,"0")}`,
      name:   row[0], copy:row[1], metric:row[2], target:row[3],
      tier:   tiers[Math.min(tiers.length-1, Math.floor(i/14))],
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §17  SAVE / LOAD / PERSIST
  // ═══════════════════════════════════════════════════════════════════════════

  function loadSave() {
    let parsed = {};
    try { parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY) || "{}"); }
    catch { parsed = {}; }
    const merged = mergeSave(DEFAULT_SAVE, parsed);
    if (parsed.selectedSkin==="volt" || parsed.unlocked?.volt) {
      merged.selectedSkin = "skin_001"; merged.unlocked.skins.skin_001 = true;
    }
    normalizeSave(merged);
    return merged;
  }

  function mergeSave(base, patch) {
    const out = Array.isArray(base) ? [...base] : {...base};
    Object.keys(patch || {}).forEach(k => {
      if (patch[k] && typeof patch[k]==="object" && !Array.isArray(patch[k]) && base[k] && typeof base[k]==="object" && !Array.isArray(base[k]))
        out[k] = mergeSave(base[k], patch[k]);
      else out[k] = patch[k];
    });
    return out;
  }

  function normalizeSave(data) {
    data.level = levelFromXp(data.xp);
    data.runs  = data.stats.runs || data.runs || 0;
    data.stats.runs = data.runs;
    data.stats.skinsUnlocked  = Object.keys(data.unlocked.skins  || {}).length;
    data.stats.trailsUnlocked = Object.keys(data.unlocked.trails || {}).length;
    data.stats.boostsUnlocked = Object.keys(data.unlocked.boosts || {}).length;
    data.stats.soundsUnlocked = Object.keys(data.unlocked.sounds || {}).length;
    data.stats.cosmeticsUnlocked = data.stats.skinsUnlocked + data.stats.trailsUnlocked + data.stats.boostsUnlocked + Object.keys(data.unlocked.themes || {}).length + data.stats.soundsUnlocked;
    if (!data.zoneIntroShown) data.zoneIntroShown = {};
  }

  function persist() { normalizeSave(save); localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); updateMenu(); }

  function freshRunStats() {
    return {
      score:0, shards:0, rareShards:0, boosts:0, nearMisses:0,
      hazardsBroken:0, maxCombo:1, meters:0, stageReached:1,
      stagesCleared:0, perfectStages:0, bossesDefeated:0, shieldHits:0,
      viralMoments:0, earnedCoins:0, xpEarned:0, coresEarned:0,
      fragmentsEarned:0, doubled:false, highlight:"Clean Run",
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §18  UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  function dayKey(offset=0)  { const d=new Date(Date.now()+offset*86400000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  function weekKey()         { const d=new Date(),s=new Date(d.getFullYear(),0,1); return `${d.getFullYear()}-W${String(Math.ceil((((d-s)/86400000)+s.getDay()+1)/7)).padStart(2,"0")}`; }
  function xpForLevel(l)     { return Math.round(80 + Math.pow(l,1.42)*42); }
  function xpAtLevel(l)      { let t=0; for (let i=1;i<l;i++) t+=xpForLevel(i); return t; }
  function levelFromXp(xp)   { let l=1,r=xp; while (l<100 && r>=xpForLevel(l)) { r-=xpForLevel(l); l++; } return l; }
  function addXp(amt)        { const before=save.level; save.xp+=Math.max(0,Math.floor(amt)); save.level=levelFromXp(save.xp); if(save.level>before){toast(`Level ${save.level}`);awardLevelMilestones(before+1,save.level);} }
  function awardLevelMilestones(from,to) { for(let l=from;l<=to;l++){if(l%5===0)save.cores+=1+Math.floor(l/20);if(l===10)unlockCosmetic("skins","skin_031");if(l===25)save.fragments+=10;if(l===50)save.fragments+=25;if(l===100)save.ascensionMarks+=1;} }
  function hashString(v)     { let h=2166136261; for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619);} return h>>>0; }
  function mulberry32(seed)  { return function rng(){let t=seed+=0x6d2b79f5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}; }
  function clamp(v,mn,mx)    { return Math.max(mn, Math.min(mx, v)); }
  function format(v)         { return Math.floor(v).toLocaleString(); }
  function selectedSkin()    { return SKINS.find(s => s.id===save.selectedSkin) || SKINS[0]; }
  function currentZone()     { return ZONES.find(z => z.id===save.selectedZone) || ZONES[0]; }
  function rarityTier(skin)  {
    const r = skin?.rarity || "Common";
    return { Common:0, Rare:1, Epic:2, Legendary:3, Mythic:4 }[r] || 0;
  }

  function currentStage() {
    const idx   = (state.stageIndex-1) % STAGES.length;
    const loops = Math.floor((state.stageIndex-1) / STAGES.length);
    const base  = STAGES[idx];
    return { ...base, number:state.stageIndex, speedMul:base.speedMul+loops*0.38, duration:base.duration+loops*5 };
  }

  function skillRank(id)  { return save.skills[id] || 0; }
  function bonus(kind)    { return SKILL_NODES.filter(n=>n.bonus===kind).reduce((s,n)=>s+skillRank(n.id),0); }

  function energyGainMul() {
    let mul = 1;
    if (state.slipstreamTimer > 0)          mul *= 2;
    if (state.nearMissStreak >= 3 && state.nearMissStreak < 10) mul *= 1.5;
    if (state.clutchActive)                 mul *= 3;
    if (save.selectedZone==="singularity" && state.gravityPull!==0) {
      const inputDir = state.targetLane - laneFromX(state.playerX);
      const gravDir  = state.gravityPull > 0 ? 1 : -1;
      if (inputDir!==0 && Math.sign(inputDir)!==Math.sign(gravDir)) mul *= 1.5;
    }
    if (save.selectedZone==="glitch_dimension" && state.glitchFlashActive) mul *= 2;
    return mul;
  }
  function energyGain(base)  { return base * (1+bonus("boostRecharge")*0.04) * energyGainMul(); }
  function maxComboCap()     { return 20 + bonus("comboCap")*3 + save.ascensionMarks; }
  function coinMultiplier()  { return 1 + bonus("coinMult")*0.05 + save.ascensionMarks*0.01; }
  function scoreMultiplier() {
    let m = 1 + bonus("perfectScore")*0.015 + save.ascensionMarks*0.005;
    if (state.nearMissStreak >= 5 && state.nearMissStreak < 10) m *= 1.5;
    if (state.clutchActive)          m *= 2.5;
    if (state.bossStaggerTimer > 0)  m *= 4;
    if (state.activeModifier==="double_threat") m *= 1.8;
    return m;
  }
  function isZoneUnlocked(zone) { return save.level >= zone.unlockLevel; }
  function nearMissWindow() {
    let w = 22;
    const stage = currentStage();
    if (stage.speedMul >= 2.32) w = 16;
    if (save.selectedZone==="void_network") w = 18;
    w += bonus("near") * 4;
    if (state.nearMissStreak >= 5) w += 4;
    if (state.activeModifier==="thin_ice")  w += 10;
    if (state.activeModifier==="pacifist" && state.energy>=100) w += 6;
    if (state.activeModifier==="compression") w -= 4;
    return w;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §19  LIVE SYSTEMS – MISSIONS, WEEKLY, ADS
  // ═══════════════════════════════════════════════════════════════════════════

  function ensureLiveSystems()        { ensureLoginState(); ensureDailyMissions(); ensureWeeklyChallenges(); ensureAdDay(); }
  function ensureLoginState()         { const today=dayKey(); if(save.lastLogin===today)return; save.loginStreak=save.lastLogin===dayKey(-1)?save.loginStreak+1:1; save.lastLogin=today; save.dailyClaimed=""; }
  function ensureDailyMissions()      {
    const key=dayKey(), slots=save.level>=20?4:3;
    if (save.missionDay===key && Array.isArray(save.missions) && save.missions.length===slots) return;
    const rng  = mulberry32(hashString(`missions-${key}`));
    const pool = [...MISSION_BANK].sort(()=>rng()-0.5);
    save.missionDay=key;
    save.missions=pool.slice(0,slots).map(m=>({...m,progress:0,done:false,paid:false}));
  }
  function ensureWeeklyChallenges()   {
    const key=weekKey();
    if (save.weeklyKey===key && Array.isArray(save.weekly) && save.weekly.length===3) return;
    const rng  = mulberry32(hashString(`weekly-${key}`));
    const pool = [...WEEKLY_BANK].sort(()=>rng()-0.5);
    save.weeklyKey=key; save.weekly=pool.slice(0,3).map(c=>({...c,progress:0,done:false,paid:false}));
  }
  function ensureAdDay()              { const today=dayKey(); if(save.adDay===today)return; save.adDay=today; save.adCounts={total:0,revive:0,double:0,spin:0,mission:0}; }
  function canWatchAd(placement)      { ensureAdDay(); const caps={total:20,revive:8,double:5,spin:2,mission:3}; return(save.adCounts.total||0)<caps.total&&(save.adCounts[placement]||0)<(caps[placement]||5); }
  function countAd(placement)         { ensureAdDay(); save.adCounts.total=(save.adCounts.total||0)+1; save.adCounts[placement]=(save.adCounts[placement]||0)+1; save.stats.adsWatched=(save.stats.adsWatched||0)+1; }
  function ensureCircuitReset()       { const now=Date.now(); if(!save.circuit.resetDate){save.circuit.resetDate=new Date().toISOString();return;} if(now-new Date(save.circuit.resetDate).getTime()>28*86400000){save.circuit.points=0;save.circuit.resetDate=new Date().toISOString();} }

  // ═══════════════════════════════════════════════════════════════════════════
  // §20  LAYOUT / RESIZE
  // ═══════════════════════════════════════════════════════════════════════════

  function resize() {
    state.dpr = Math.min(PERF.dprCap, window.devicePixelRatio || 1);
    state.w   = Math.max(320, window.innerWidth);
    state.h   = Math.max(520, window.innerHeight);
    canvas.width  = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    canvas.style.width  = `${state.w}px`;
    canvas.style.height = `${state.h}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    let trackW = Math.min(state.w * (state.w < 680 ? 0.9 : 0.54), 520);
    if (state.activeModifier==="compression") trackW *= 0.8;
    state.trackW  = trackW;
    state.trackX  = (state.w - state.trackW) / 2;
    state.laneW   = state.trackW / state.lanes;
    state.playerY = Math.min(state.h * 0.78, state.h - 122);
    state.playerX = laneCenter(state.targetLane);
    menuGhost.x   = laneCenter(2);
  }

  function laneCenter(lane) {
    if (state.activeModifier==="mirror_world") lane = 4 - lane;
    return state.trackX + state.laneW * (lane + 0.5);
  }
  function laneFromX(x) {
    let lane = clamp(Math.floor((x - state.trackX) / state.laneW), 0, state.lanes-1);
    if (state.activeModifier==="mirror_world") lane = 4 - lane;
    return lane;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §21  SCREEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  function setScreen(screen) {
    state.screen = screen;
    els.menu.classList.toggle("active",    screen==="menu");
    els.pause.classList.toggle("active",   screen==="pause");
    els.gameOver.classList.toggle("active",screen==="gameover");
    els.hud.classList.toggle("visible",    screen==="playing");
    els.boost.classList.toggle("visible",  screen==="playing");
    if (screen==="menu") { updateMenu(); menuGhost.active=true; }
    else menuGhost.active = false;
    if (screen!=="playing") {
      document.getElementById("app").classList.remove("clutch-active");
      document.getElementById("bossHud").classList.remove("visible");
    }
    if (screen==="menu" || screen==="gameover") {
      setTimeout(() => {
        document.getElementById("streakDisplay").classList.remove("visible");
        document.getElementById("comboDisplay").classList.remove("visible");
      }, 1500);
    }
  }

  function switchTab(name) {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.toggle("active", b.dataset.tab===name));
    document.querySelectorAll(".tab-page").forEach(p  => p.classList.toggle("active",  p.id===`tab${name[0].toUpperCase()}${name.slice(1)}`));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §22  MENU RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  function updateMenu() {
    if (state.screen==="boot") return;
    ensureLiveSystems(); ensureCircuitReset();
    const baseXp = xpAtLevel(save.level), next = xpForLevel(save.level);
    els.level.textContent   = format(save.level);
    els.xp.textContent      = `${format(save.xp-baseXp)}/${format(next)}`;
    els.menuBest.textContent = format(save.best);
    els.best.textContent    = format(save.best);
    els.coins.textContent   = format(save.coins);
    els.cores.textContent   = format(save.cores);
    els.runs.textContent    = format(save.runs);
    els.sound.textContent   = save.sound   ? "Sound On"   : "Sound Off";
    els.haptics.textContent = save.haptics ? "Haptics On" : "Haptics Off";
    els.sound.classList.toggle("on",   save.sound);
    els.haptics.classList.toggle("on", save.haptics);

    // Gap-to-best below best score
    const gapEl = document.getElementById("menuBest");
    if (gapEl && save.best > 0) {
      const gap = save.best - (save.lastRun?.score || 0);
      let gapHtml = format(save.best);
      if (gap > 0 && save.runs > 0) {
        const pct = (save.lastRun?.score || 0) / save.best;
        const cls = pct >= 0.9 ? " close" : "";
        gapHtml += `<span class="gap-to-best${cls}" style="display:block">Gap: −${format(gap)}</span>`;
      }
      gapEl.innerHTML = gapHtml;
    }

    // Update daily run button label with today's modifier
    const dailyBtn = document.getElementById("dailyBtn");
    if (dailyBtn) {
      const dailyMod = getDailyModifier();
      dailyBtn.textContent = `Daily Run — ${dailyMod.name}`;
    }

    buildLeaderboard();
    renderZones(); renderMissions(); renderDailyPanel(); renderLevelPanel();
    renderSkillTree(); renderAchievements(); renderCosmetics(); renderSocial();
    renderArchive(); renderCircuit(); renderSeasonTrack();
  }

  function renderZones() {
    els.zoneGrid.replaceChildren();
    ZONES.forEach(zone => {
      const unlocked = isZoneUnlocked(zone);
      const button   = document.createElement("button");
      button.type    = "button";
      button.className = `zone-button${save.selectedZone===zone.id?" selected":""}${unlocked?"":" locked"}`;
      button.style.setProperty("--skin", zone.color);
      const best = save.ghosts[zone.id]?.stage || 0;
      button.innerHTML = `<span class="zone-dot" aria-hidden="true"></span><span><span class="skin-name">${zone.name}</span><span class="skin-cost">${unlocked?`${zone.mechanic} · best stage ${best}`:`Unlock level ${zone.unlockLevel}`}</span></span>`;
      button.addEventListener("click", () => {
        if (!unlocked) return toast(`Reach Level ${zone.unlockLevel}`);
        save.selectedZone = zone.id; persist(); toast(zone.name); buildLeaderboard();
      });
      els.zoneGrid.append(button);
    });
  }

  function renderMissions() {
    els.missionList.replaceChildren();
    save.missions.forEach(m => {
      const item = document.createElement("div");
      item.className = `mission-item${m.done?" done":""}`;
      const progress = Math.min(m.target, Math.floor(m.progress||0));
      item.innerHTML = `<span class="mission-copy">${m.label} <span class="muted">${format(progress)}/${format(m.target)}</span></span><span class="mission-reward">${m.paid?"Paid":`+${m.reward}`}</span>`;
      els.missionList.append(item);
    });
  }

  function renderDailyPanel() {
    const day = ((save.loginDay-1) % LOGIN_REWARDS.length)+1;
    const claimed = save.dailyClaimed===dayKey();
    els.dailyPanel.innerHTML = `<div><span class="system-name">Day ${day} · Streak ${save.loginStreak}</span><span class="system-copy">${LOGIN_REWARDS[day-1]} · Weekly ${save.weeklyKey}</span></div><button id="claimDailyBtn" class="toggle-button${claimed?"":" on"}" type="button">${claimed?"Claimed":"Claim"}</button>`;
    document.getElementById("claimDailyBtn").addEventListener("click", claimDailyReward);
  }

  function renderLevelPanel() {
    const milestones = [[2,"Daily Missions"],[3,"Rewarded Revive"],[5,"Skill Tree"],[8,"Quantum Core"],[15,"Weekly Challenges"],[16,"Void Network"],[20,"Fourth Mission Slot"],[26,"Glitch Dimension"],[38,"Singularity"],[45,"Season Track"],[55,"Pulse Nexus"],[100,"Ascension"]];
    els.levelPanel.replaceChildren();
    milestones.forEach(([level,reward]) => {
      const item = document.createElement("div");
      item.className = `system-item${save.level>=level?" done":""}`;
      item.innerHTML = `<span><span class="system-name">Level ${level}</span><span class="system-copy">${reward}</span></span><span class="system-pill">${save.level>=level?"Open":"Locked"}</span>`;
      els.levelPanel.append(item);
    });
    save.weekly.forEach(c => {
      const item = document.createElement("div");
      item.className = `system-item${c.done?" done":""}`;
      item.innerHTML = `<span><span class="system-name">${c.label}</span><span class="system-copy">${format(c.progress||0)}/${format(c.target)} · +${c.xp} XP · +${c.cores} cores</span></span><span class="system-pill">${c.paid?"Paid":c.done?"Done":"Weekly"}</span>`;
      els.levelPanel.append(item);
    });
  }

  function renderSkillTree() {
    for (const arch of ["ghost","breaker","surgeon"]) {
      const container = document.getElementById(`skillTree${arch[0].toUpperCase()}${arch.slice(1)}`);
      if (!container) continue;
      container.replaceChildren();
      SKILL_NODES.filter(n => n.archetype===arch).forEach(node => {
        const rank = skillRank(node.id), cost = skillCost(node, rank+1);
        const capped = rank >= node.ranks, locked = save.level < unlockLevelForSkill(node);
        const button = document.createElement("button");
        button.type = "button";
        button.className = `skill-button${capped?" selected":""}${locked?" locked":""}`;
        button.innerHTML = `<span><span class="skin-name">${node.name} ${rank}/${node.ranks}</span><span class="skin-cost">${locked?`Level ${unlockLevelForSkill(node)}`:capped?"Maxed":`${format(cost.coins)} coins · ${format(cost.cores)} cores · ${node.copy}`}</span></span>`;
        button.addEventListener("click", () => buySkill(node));
        container.append(button);
      });
    }
  }
  function branchColor(branch) { return {Reflex:C.wake,Pulse:C.reward,Score:C.danger,Economy:C.perfect,Survival:C.ghost,Discovery:C.spine}[branch]||C.wake; }
  function unlockLevelForSkill(node) { return {Reflex:5,Pulse:8,Score:12,Economy:16,Survival:24,Discovery:32}[node.branch]||5; }
  function skillCost(node, nextRank) { return { coins:Math.round(node.baseCoins*Math.pow(nextRank,1.45)), cores:Math.round(node.baseCores*Math.pow(nextRank,1.35)) }; }
  function buySkill(node) {
    const rank = skillRank(node.id);
    if (save.level < unlockLevelForSkill(node)) return toast(`Unlocks at Level ${unlockLevelForSkill(node)}`);
    if (rank >= node.ranks) return toast("Already maxed");
    const cost = skillCost(node, rank+1);
    if (save.coins < cost.coins || save.cores < cost.cores) return toast("Need more coins or cores");
    save.coins -= cost.coins; save.cores -= cost.cores; save.skills[node.id] = rank+1;
    toast(`${node.name} upgraded`); playSound("buy"); persist();
  }

  function renderAchievements() {
    els.achievementList.replaceChildren();
    ACHIEVEMENTS.forEach(ach => {
      const progress = achievementProgress(ach), done = Boolean(save.achievements[ach.id]);
      const item = document.createElement("div");
      item.className = `system-item${done?" done":progress>=ach.target?" claimable":""}`;
      item.innerHTML = `<span><span class="system-name">${ach.name}</span><span class="system-copy">${ach.copy} · ${format(Math.min(progress,ach.target))}/${format(ach.target)}</span></span><span class="system-pill">${ach.tier}</span>`;
      els.achievementList.append(item);
    });
  }

  function renderCosmetics() {
    renderCosmeticGrid(els.skinGrid,  SKINS,        "skins",  "selectedSkin");
    renderCosmeticGrid(els.trailGrid, TRAILS,       "trails", "selectedTrail");
    renderCosmeticGrid(els.boostGrid, BOOST_EFFECTS,"boosts", "selectedBoost");
    els.extraCosmetics.replaceChildren();
    [...MENU_THEMES.map(c=>[c,"themes","selectedTheme"]), ...SOUND_PACKS.map(c=>[c,"sounds","selectedSound"])].forEach(([item,bucket,selectedKey]) => {
      const unlocked = Boolean(save.unlocked[bucket]?.[item.id]);
      const row      = document.createElement("button");
      row.type = "button";
      row.className = `system-item${save[selectedKey]===item.id?" done":""}`;
      row.innerHTML = `<span><span class="system-name">${item.name}</span><span class="system-copy">${item.rarity} · ${unlocked?"Owned":priceText(item)}</span></span><span class="system-pill">${unlocked?"Equip":"Buy"}</span>`;
      row.addEventListener("click", () => handleCosmetic(item, bucket, selectedKey));
      els.extraCosmetics.append(row);
    });
  }
  function renderCosmeticGrid(container, items, bucket, selectedKey) {
    container.replaceChildren();
    items.forEach(item => {
      const unlocked = Boolean(save.unlocked[bucket]?.[item.id]);
      const button   = document.createElement("button");
      button.type    = "button";
      button.className = `skin-button${save[selectedKey]===item.id?" selected":""}${save.level<item.unlockLevel?" locked":""}`;
      button.style.setProperty("--skin", item.color || RARITIES[item.rarity]?.color || C.ghost);
      button.innerHTML = `<span class="skin-dot" aria-hidden="true"></span><span><span class="skin-name">${item.name}</span><span class="skin-cost">${item.rarity} · ${unlocked?"Owned":save.level<item.unlockLevel?`Level ${item.unlockLevel}`:priceText(item)}</span></span>`;
      button.addEventListener("click", () => handleCosmetic(item, bucket, selectedKey));
      container.append(button);
    });
  }
  function priceText(item) { if(item.rarity==="Mythic")return`${item.fragments} fragments`; return`${format(item.cost)} coins${item.fragments?` · ${item.fragments} fragments`:""}`; }
  function handleCosmetic(item, bucket, selectedKey) {
    if (save.unlocked[bucket]?.[item.id]) { save[selectedKey]=item.id; playSound("select"); toast(`${item.name} equipped`); persist(); return; }
    if (save.level < item.unlockLevel) return toast(`Unlocks at Level ${item.unlockLevel}`);
    if (save.coins < item.cost || save.fragments < item.fragments) return toast("Need more coins or fragments");
    save.coins -= item.cost; save.fragments -= item.fragments;
    unlockCosmetic(bucket, item.id); save[selectedKey] = item.id;
    playSound("buy"); toast(`${item.name} unlocked`); persist();
  }
  function unlockCosmetic(bucket, id) { if (!save.unlocked[bucket]) return; save.unlocked[bucket][id]=true; normalizeSave(save); }

  function renderSocial() {
    els.socialPanel.replaceChildren();
    const zone = currentZone(), ghost = save.ghosts[zone.id], code = makeChallengeCode();
    [
      ["Best Ghost",    ghost?`${format(ghost.score)} · Stage ${ghost.stage}`:"No ghost saved yet"],
      ["Friend Code",  code],
      ["Offline Social","Paste a code to race the same seed and score target"],
      ["Last Highlight",save.lastRun?.highlight||"No run yet"],
    ].forEach(([name,copy]) => {
      const item = document.createElement("div");
      item.className = "system-item";
      item.innerHTML = `<span><span class="system-name">${name}</span><span class="system-copy">${copy}</span></span><span class="system-pill">${name==="Friend Code"?"Copy":"Info"}</span>`;
      if (name==="Friend Code") item.addEventListener("click", () => copyText(code,"Challenge code copied"));
      els.socialPanel.append(item);
    });
  }

  function renderArchive() {
    const panel   = document.getElementById("archivePanel");
    panel.replaceChildren();
    const entries = save.archive || [];
    if (!entries.length) {
      panel.innerHTML = `<div class="archive-entry"><span class="archive-run-score" style="color:var(--muted)">No runs yet</span></div>`;
      return;
    }
    const isNew = e => Date.now() - e.timestamp < 5000;
    entries.forEach((entry, i) => {
      const div = document.createElement("div");
      div.className = `archive-entry${i<3?" top-three":""}${isNew(entry)?" new":""}`;
      div.innerHTML = `<span class="archive-rank${i===0?" gold":""}">${i+1}</span><div class="archive-run-info"><span class="archive-run-score">${format(entry.score)}</span><span class="archive-run-meta">${ZONES.find(z=>z.id===entry.zone)?.name||entry.zone} · Stage ${entry.stage} · ${new Date(entry.timestamp).toLocaleDateString()}</span><span class="archive-run-highlight">${entry.highlight}${entry.modifier!=="none"?` · ${entry.modifier}`:""}</span></div>`;
      panel.append(div);
    });
  }

  function renderCircuit() {
    const { points, milestones } = save.circuit;
    const maxPoints = milestones[milestones.length-1];
    document.getElementById("circuitPoints").textContent = `${format(points)} SP`;
    document.getElementById("circuitFill").style.width   = `${Math.min(100,(points/maxPoints)*100)}%`;
    const mc = document.getElementById("circuitMilestones");
    mc.replaceChildren();
    milestones.forEach(m => {
      const span = document.createElement("span");
      span.className = `circuit-milestone${points>=m?" reached":""}`;
      span.textContent = format(m);
      mc.append(span);
    });
  }

  function renderSeasonTrack() {
    const track = document.getElementById("seasonTrack");
    track.replaceChildren();
    const milestoneNodes = [5,10,15,20,25,30];
    const rewards = {1:"500 coins",5:"Rare skin",10:"5 Cores",15:"Epic skin",20:"Boost FX",25:"Legendary skin",30:"Mythic skin"};
    for (let i=1; i<=30; i++) {
      const isMilestone = milestoneNodes.includes(i);
      const unlocked    = save.season.level >= i;
      const claimed     = save.season.level > i;
      if (i>1) {
        const conn = document.createElement("div");
        conn.className = `season-connector${claimed?" filled":""}`;
        track.append(conn);
      }
      const node = document.createElement("div");
      node.className = `season-node${isMilestone?" milestone":""}${unlocked?" unlocked":""}${claimed?" claimed":""}`;
      node.innerHTML = `<div class="season-node-pip">${isMilestone?"★":i}</div><span class="season-node-label">${rewards[i]||""}</span>`;
      track.append(node);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §23  ECONOMY & DAILY SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════

  function claimDailyReward() {
    if (save.dailyClaimed===dayKey()) return toast("Already claimed");
    const day = ((save.loginDay-1) % LOGIN_REWARDS.length)+1;
    grantRewardText(LOGIN_REWARDS[day-1]);
    save.dailyClaimed = dayKey(); save.loginDay += 1;
    save.stats.loginClaims = (save.stats.loginClaims||0)+1;
    save.streakTokens += save.loginStreak>=7?2:1;
    toast(`Claimed ${LOGIN_REWARDS[day-1]}`); playSound("buy"); persist();
  }
  function grantRewardText(reward) {
    if (reward.includes("coins"))    save.coins    += parseInt(reward,10)||250;
    if (reward.includes("XP"))       addXp(parseInt(reward,10)||50);
    if (reward.includes("core"))     save.cores    += parseInt(reward,10)||1;
    if (reward.includes("fragment")) save.fragments+= parseInt(reward,10)||5;
    if (reward.includes("skin ticket")) unlockRandomSkin(reward.includes("Rare")?"Rare":"Common");
  }
  function unlockRandomSkin(rarity) {
    const locked = SKINS.filter(s => s.rarity===rarity && !save.unlocked.skins[s.id]);
    if (!locked.length) { save.fragments += rarity==="Rare"?8:3; return; }
    unlockCosmetic("skins", locked[Math.floor(Math.random()*locked.length)].id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §24  RUN START / END
  // ═══════════════════════════════════════════════════════════════════════════

  function startRun(mode="classic") {
    ensureAudio();
    state.mode = mode;
    state.targetLane = 2; state.playerX = laneCenter(2);
    state.score = 0; state.displayedScore = 0; state.speed = 330;
    state.time  = 0; state.meters = 0; state.energy = 0;
    state.combo = 1; state.comboTimer = 0; state.overdrive = 0;
    state.invincible = 1.2 + bonus("startShield")*0.5;
    state.reviveUsed = false;
    state.earnedExtraLife  = skillRank("extra_life") > 0;
    state.shieldAvailable  = (skillRank("failsafe") >= 5) && (state.activeModifier !== "leaky_shield");
    state.runEnded = false; state.spawnTimer = 0.8;
    state.stageIndex = 1; state.stageTimer = 0; state.stageHits = 0;
    state.recordTimer = 0; state.inputGhost = [];
    state.obstacles=[]; state.shards=[]; state.particles=[]; state.sparks=[];
    state.messages=[]; state.wakes=[]; state.fragments=[];
    state.boostCinema=0; state.stageBeam=0; state.bossReveal=0; state.bossRevealName="";
    state.glitchTears=[]; state.shake=0;
    state.swipeStartX=null; state.swipeStartLane=null;
    state.nearMissStreak=0;
    state.clutchActive=false; state.clutchTimer=0;
    state.clutchScale=1.0; state.clutchScaleTarget=1.0;
    state.commitLock=0; state.glitchFlashTimer=0; state.glitchFlashActive=false;
    state.heat=0; state.heatSurge=0; state.gravityPull=0;
    state.bossPhase=0; state.bossPhaseTimer=0; state.bossWeakpointActive=false;
    state.bossStaggerTimer=0; state.bossDefeatPhase=0; state.bossDefeatTimer=0;
    state.bossWeakpointCount=0; state.bossNearMissCount=0;
    state.patternBeat=0; state.spawnDensityMul=1.0; state.tremorPhase=0;
    state.slipstreamTimer=0; state.nearMissCountMod=0;
    state.trackMaterialise=1.0;
    state.run = freshRunStats();
    state.comboDecayRate = 1.6;
    state.teachShownThisRun = false;
    state.onboardingForcedNearMiss = false;
    state.bossRevealCinematicPending = false;

    // Initialise pattern system
    pickNewPattern();

    document.getElementById("nearMissTeach").classList.remove("visible");

    if (mode==="daily") {
      state.seed = hashString(`daily-${dayKey()}-${save.selectedZone}`);
      // Daily run gets the seeded daily modifier automatically
      state.activeModifier = getDailyModifier().id;
      addMessage(`${getDailyModifier().name} active`, state.w/2, state.h*0.32, C.reward);
    } else if (mode==="ghost" && save.ghosts[save.selectedZone]) {
      state.seed = save.ghosts[save.selectedZone].seed;
      state.ghostReplay = save.ghosts[save.selectedZone];
    } else if (mode==="challenge" && save.challenge) {
      state.seed = save.challenge.seed;
      state.ghostReplay = null;
    } else {
      state.seed = Math.floor(Math.random() * 2**32);
      state.ghostReplay = null;
    }
    state.rng = mulberry32(state.seed);

    // Onboarding: first run ever
    state.onboarding = (save.runs === 0);
    state.onboardingPhase = 0; state.onboardingTimer = 0;

    const deathKey = `${save.selectedZone}_${state.stageIndex}`;
    state.spawnDensityMul = (save.stageDeathCounts[deathKey]||0) >= 3 ? 0.92 : 1.0;

    setScreen("playing");
    addMessage("Stage 1", state.w/2, state.h*0.25, currentZone().color);

    // Zone intro message on first visit
    const zoneId = save.selectedZone;
    const zoneData = currentZone();
    if (zoneData.introMsg && !save.zoneIntroShown[zoneId]) {
      save.zoneIntroShown[zoneId] = true;
      setTimeout(() => addMessage(zoneData.introMsg, state.w/2, state.h*0.38, zoneData.color), 800);
    }

    updateHud(); playSound("start"); vibrate(20);
  }

  function pauseGame()  { if (state.screen!=="playing") return; setScreen("pause"); playSound("select"); }
  function resumeGame() { if (state.screen!=="pause")   return; lastFrame=performance.now(); setScreen("playing"); playSound("start"); }

  function endRun() {
    if (state.runEnded) return;
    state.runEnded = true;
    if (state.clutchActive) {
      state.clutchActive = false;
      document.getElementById("app").classList.remove("clutch-active");
    }
    document.getElementById("nearMissTeach").classList.remove("visible");
    spawnDeathFragments();
    const deathKey = `${save.selectedZone}_${state.stageIndex}`;
    save.stageDeathCounts[deathKey] = (save.stageDeathCounts[deathKey]||0) + 1;
    setTimeout(() => {
      finalizeRunRewards(); applyRunToSave(); updateAchievements(); saveGhostIfBest();
      earnCircuitPoints(); earnSeasonXp();
      persist(); renderResults(); runResultSequence(); setScreen("gameover");
      showModifierChallengeBanner(); maybeShowStarterPack();
    }, 1800);
    playSound("crash"); vibrate([40,40,80]);
  }

  function spawnDeathFragments() {
    const skin = selectedSkin();
    const tier = rarityTier(skin);
    state.fragments = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 120;
      const frag = {
        x:state.playerX, y:state.playerY,
        vx:Math.cos(a)*s, vy:Math.sin(a)*s - 80,
        rot:a, rotV:(Math.random()-0.5)*8,
        life:0.9+Math.random()*0.3, maxLife:0,
        color:skin.color, scale:0.32+Math.random()*0.28,
        tier,
      };
      frag.maxLife = frag.life;
      state.fragments.push(frag);

      // Legendary/Mythic: secondary micro-fragments
      if (tier >= 3) {
        for (let j = 0; j < 3; j++) {
          const a2 = Math.random() * Math.PI * 2;
          const sf = { x:state.playerX, y:state.playerY, vx:Math.cos(a2)*100, vy:Math.sin(a2)*100-40,
            rot:a2, rotV:(Math.random()-0.5)*14, life:0.5, maxLife:0.5, color:skin.accent, scale:0.15, tier:0 };
          state.fragments.push(sf);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §25  REWARDS & SAVE APPLICATION
  // ═══════════════════════════════════════════════════════════════════════════

  function finalizeRunRewards() {
    const finalScore = Math.floor(state.score);
    state.run.score = finalScore; state.run.meters = Math.floor(state.meters);
    state.run.stageReached = state.stageIndex;
    const stageCoins = state.run.stagesCleared * 18;
    const baseCoins  = Math.floor(finalScore/120) + state.run.shards + stageCoins + state.run.bossesDefeated*75;
    state.run.earnedCoins = Math.max(1, Math.floor(baseCoins * coinMultiplier()));
    state.run.xpEarned    = Math.floor(20 + finalScore/500*8 + state.run.stagesCleared*18 + state.run.bossesDefeated*120 + state.run.perfectStages*35);
    state.run.coresEarned = state.run.bossesDefeated + Math.floor(state.run.stagesCleared/10);
    state.run.fragmentsEarned = Math.floor(state.run.rareShards/3) + Math.floor(state.run.bossesDefeated/2) + bonus("blueprint");
    state.run.highlight = pickHighlight();
  }

  function applyRunToSave() {
    const oldDailyBest = save.stats.dailyBestScore || 0;
    if (state.mode==="daily" && state.run.score > oldDailyBest) state.run.dailyBest = 1;
    save.runs += 1; save.stats.runs = save.runs;
    save.coins    += state.run.earnedCoins;
    save.cores    += state.run.coresEarned;
    save.fragments+= state.run.fragmentsEarned;
    addXp(state.run.xpEarned);
    if (state.run.score > save.best) save.best = state.run.score;
    save.stats.totalScore     += state.run.score;
    save.stats.totalShards    += state.run.shards;
    save.stats.totalNearMisses+= state.run.nearMisses;
    save.stats.totalBoosts    += state.run.boosts;
    save.stats.hazardsBroken  += state.run.hazardsBroken;
    save.stats.bossesDefeated += state.run.bossesDefeated;
    save.stats.stagesCleared  += state.run.stagesCleared;
    save.stats.perfectStages  += state.run.perfectStages;
    save.stats.coinsEarned    += state.run.earnedCoins;
    save.stats.highestStage    = Math.max(save.stats.highestStage, state.run.stageReached);
    save.stats.bestCombo       = Math.max(save.stats.bestCombo||1, state.run.maxCombo);
    save.stats.bestNearMisses  = Math.max(save.stats.bestNearMisses||0, state.run.nearMisses);
    save.stats.bestPerfectStages = Math.max(save.stats.bestPerfectStages||0, state.run.perfectStages);
    save.stats.rareShards      = (save.stats.rareShards||0) + state.run.rareShards;
    save.stats.viralMoments   += state.run.viralMoments;
    if (!state.reviveUsed) {
      save.stats.noReviveScore = Math.max(save.stats.noReviveScore||0, state.run.score);
      save.stats.noReviveStage = Math.max(save.stats.noReviveStage||0, state.run.stageReached);
    }
    if (state.mode==="daily") save.stats.dailyBestScore = Math.max(oldDailyBest, state.run.score);
    if (state.run.stageReached >= 20) save.stats.stage20Runs += 1;
    save.stats[`zone_${save.selectedZone}`] = 1;
    if (state.run.stageReached >= 25) save.stats[`master_${save.selectedZone}`] = 1;
    save.lastRun = { ...state.run, zone:save.selectedZone, mode:state.mode, seed:state.seed, modifier:state.activeModifier||"none" };
    progressMissions(save.missions); progressWeeklies();
    if (state.mode==="ghost" && save.ghosts[save.selectedZone] && state.run.score > save.ghosts[save.selectedZone].score) save.stats.ghostWins += 1;
    if (state.mode==="challenge" && save.challenge && state.run.score >= save.challenge.score) { save.stats.challengeWins=(save.stats.challengeWins||0)+1; toast("Challenge beaten"); }

    save.archive = save.archive || [];
    save.archive.push({ score:state.run.score, stage:state.run.stageReached, zone:save.selectedZone,
      streak:state.nearMissStreak, highlight:state.run.highlight, modifier:state.activeModifier||"none", timestamp:Date.now() });
    save.archive.sort((a,b) => b.score - a.score);
    save.archive = save.archive.slice(0,10);
    state.activeModifier = null;
  }

  function progressMissions(missions) {
    let completed = 0;
    missions.forEach(m => {
      if (m.paid) return;
      const amount = ["score","maxCombo","stageReached"].includes(m.metric)
        ? Math.max(m.progress||0, state.run[m.metric]||0)
        : (m.progress||0) + (state.run[m.metric]||0);
      m.progress = amount;
      if (!m.done && amount >= m.target) {
        m.done = true; m.paid = true;
        save.coins += Math.floor(m.reward * (1+bonus("missionBonus")*0.06));
        save.stats.dailyMissions += 1; completed++;
      }
    });
    if (completed) toast(`${completed} mission${completed>1?"s":""} cashed`);
  }
  function progressWeeklies() {
    save.weekly.forEach(c => {
      if (c.paid) return;
      const add = c.metric==="stage20Runs" ? (state.run.stageReached>=20?1:0) : (state.run[c.metric]||0);
      c.progress = (c.progress||0) + add;
      if (!c.done && c.progress >= c.target) { c.done=true; c.paid=true; addXp(c.xp); save.cores+=c.cores; save.stats.weeklyChallenges+=1; }
    });
  }
  function updateAchievements() {
    let unlocked = 0;
    ACHIEVEMENTS.forEach(ach => {
      if (save.achievements[ach.id]) return;
      if (achievementProgress(ach) >= ach.target) { save.achievements[ach.id]=true; grantAchievementReward(ach); unlocked++; }
    });
    if (unlocked) toast(`${unlocked} achievement${unlocked>1?"s":""}`);
  }
  function achievementProgress(ach) {
    if (ach.metric==="best")          return save.best;
    if (ach.metric==="level")         return save.level;
    if (ach.metric==="loginStreak")   return save.loginStreak;
    if (ach.metric==="fullFit")       return (save.selectedSkin && save.selectedTrail && save.selectedBoost && save.selectedTheme && save.selectedSound) ? 1 : 0;
    return save.stats[ach.metric] || 0;
  }
  function grantAchievementReward(ach) {
    const table = { Bronze:[50,150,0,0], Silver:[150,500,1,0], Gold:[400,900,3,2], Platinum:[900,1500,6,8], Mythic:[1500,0,10,20] };
    const [xp,coins,cores,fragments] = table[ach.tier] || [50,150,0,0];
    addXp(xp); save.coins+=coins; save.cores+=cores; save.fragments+=fragments;
  }
  function saveGhostIfBest() {
    const z = save.selectedZone, prev = save.ghosts[z];
    if (!prev || state.run.score > prev.score) {
      save.ghosts[z] = { score:state.run.score, stage:state.run.stageReached, seed:state.seed, lanes:state.inputGhost.slice(0,900), created:Date.now() };
      save.stats.ghostsSaved = Math.max(save.stats.ghostsSaved||0, Object.keys(save.ghosts).length);
    }
  }
  function pickHighlight() {
    if (state.run.stageReached >= 25 && state.energy < 5) { save.stats.lowPulse25=1; return "Final Spark"; }
    if (state.run.maxCombo >= 30)                          return "Combo Architect";
    if (state.run.viralMoments > 0)                        return "Clutch Save";
    if (state.run.bossesDefeated > 0 && state.reviveUsed) { save.stats.reviveBoss=1; return "Second Chance Boss"; }
    if (state.run.nearMisses >= 10)                        return "Near Miss Reel";
    if (state.run.boosts >= 3)                             return "Boost Chain";
    return "Clean Run";
  }
  function earnCircuitPoints() {
    let sp = 0;
    if (state.run.score > save.best)       sp += 500;
    if (state.run.viralMoments > 0)        sp += 80 * Math.max(1, state.run.viralMoments);
    if (state.run.stageReached >= 15)      sp += 120;
    sp += state.run.bossesDefeated * 200;
    save.circuit.points += sp;
  }
  function earnSeasonXp() {
    const sxp = Math.floor(state.run.xpEarned * 0.3);
    save.season.xp += sxp;
    while (save.season.xp >= 50 && save.season.level < 30) { save.season.xp -= 50; save.season.level += 1; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §26  RESULT SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  function showModifierChallengeBanner() {
    const bannerResult = document.getElementById("modifierChallengeBannerResult");
    if (bannerResult) bannerResult.classList.add("show");
    const bannerMenu = document.getElementById("modifierChallengeBanner");
    if (bannerMenu) bannerMenu.classList.add("show");
  }

  function renderResults() {
    els.runMode.textContent   = state.mode==="daily" ? "Daily run" : state.mode==="ghost" ? "Ghost run" : state.mode==="challenge" ? "Challenge run" : currentZone().name;
    els.earnedCoins.textContent = format(state.run.earnedCoins);
    els.finalShards.textContent = format(state.run.shards);
    els.finalCombo.textContent  = `${state.run.maxCombo}x`;
    els.finalStage.textContent  = format(state.run.stageReached);
    els.finalXp.textContent     = format(state.run.xpEarned);
    els.finalMoment.textContent = state.run.highlight;
    els.revive.disabled      = state.reviveUsed || state.run.score < 80 || !canWatchAd("revive");
    els.doubleReward.disabled= state.run.doubled || !canWatchAd("double");
  }

  function runResultSequence() {
    document.getElementById("personalBestFlag").classList.remove("show");
    document.getElementById("soClose").classList.remove("show","critical");
    document.getElementById("resultStreakHighlight").textContent = "";
    document.querySelectorAll("#resultGrid > *").forEach(c => c.classList.remove("revealed"));
    document.getElementById("restartBtn").classList.remove("result-runback-cta");

    const isNewBest = state.run.score >= save.best;
    const baseDelay = isNewBest ? 1600 : 0;

    // PB moment freeze: show score + "NEW BEST" for 1600ms before rest of sequence
    if (isNewBest) {
      els.finalScore.textContent = format(state.run.score);
      document.getElementById("personalBestFlag").classList.add("show");
      firePbFlash();
      playPbChord();
      vibrate([50,30,100]);
    }

    const sequence = [
      [0 + baseDelay,    () => { els.finalScore.textContent = format(state.run.score); }],
      [200 + baseDelay,  () => {
        if (isNewBest) {
          document.getElementById("personalBestFlag").classList.add("show");
          firePbFlash();
        }
      }],
      [400 + baseDelay,  () => {
        const gap  = save.best - state.run.score;
        const pct  = save.best > 0 ? state.run.score / save.best : 0;
        const scEl = document.getElementById("soClose");
        if (!isNewBest) {
          if (pct >= 0.97) {
            scEl.textContent = `SO CLOSE — ${format(gap)} points away`;
            scEl.classList.add("show","critical");
          } else if (pct >= 0.92) {
            scEl.textContent = `${format(gap)} points from your best`;
            scEl.classList.add("show");
          }
          // Archive gap
          const nextAbove = (save.archive||[]).find(e => e.score > state.run.score);
          if (nextAbove) {
            const archiveGap = nextAbove.score - state.run.score;
            if (archiveGap / nextAbove.score < 0.1 && !scEl.classList.contains("show")) {
              scEl.textContent = `${format(archiveGap)} points to next rank`;
              scEl.classList.add("show");
            }
          }
        }
      }],
      [600 + baseDelay,  () => {
        const el = document.getElementById("resultStreakHighlight");
        if (state.nearMissStreak >= 3) el.textContent = `Best streak: ${state.nearMissStreak} — ${getStreakLabel(state.nearMissStreak)}`;
      }],
      [800 + baseDelay,  () => spawnCoinAnimation(state.run.earnedCoins)],
      [1000 + baseDelay, () => revealResultGrid()],
      [2200 + baseDelay, () => document.getElementById("restartBtn").classList.add("result-runback-cta")],
    ];
    sequence.forEach(([delay, fn]) => setTimeout(fn, delay));
  }

  function spawnCoinAnimation(count) {
    const stage = document.getElementById("coinsStage");
    stage.replaceChildren();
    const visible = Math.min(count, 12);
    for (let i = 0; i < visible; i++) {
      setTimeout(() => {
        const coin = document.createElement("span");
        coin.className  = "coin-fly";
        coin.textContent= "◆";
        coin.style.left = `${10 + Math.random()*80}%`;
        stage.append(coin);
      }, i * 60);
    }
  }

  function revealResultGrid() {
    document.querySelectorAll("#resultGrid > *").forEach((child,i) => setTimeout(() => child.classList.add("revealed"), i*200));
  }

  function getStreakLabel(s) {
    if (s >= 20) return "UNTOUCHABLE";
    if (s >= 10) return "GHOST LINE";
    if (s >= 5)  return "RAZOR";
    if (s >= 3)  return "THREADING";
    return "STREAK";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §27  REVIVE / DOUBLE REWARD / LUCKY SPIN
  // ═══════════════════════════════════════════════════════════════════════════

  async function reviveRun() {
    if (state.screen!=="gameover" || state.reviveUsed || !canWatchAd("revive")) return;
    els.revive.disabled = true;
    const rewarded = await AdBridge.showRewarded("revive");
    if (!rewarded) return;
    countAd("revive");
    state.reviveUsed = true; state.runEnded = false;
    state.invincible = 2.6; state.overdrive = 1.4;
    state.energy = Math.max(state.energy, 55);
    state.fragments = [];
    state.obstacles = state.obstacles.filter(ob => ob.y < state.playerY - 160);
    burst(state.playerX, state.playerY, C.ghost, 34, 8);
    setScreen("playing"); playSound("boost"); vibrate(45); persist();
  }

  async function doubleRunReward() {
    if (!save.lastRun || save.lastRun.doubled || !canWatchAd("double")) return toast("No double available");
    const rewarded = await AdBridge.showRewarded("double rewards");
    if (!rewarded) return;
    countAd("double"); save.coins += save.lastRun.earnedCoins;
    addXp(save.lastRun.xpEarned); save.lastRun.doubled = true; state.run.doubled = true;
    els.doubleReward.disabled = true; toast("Rewards doubled"); persist();
  }

  async function luckySpin() {
    if (!canWatchAd("spin")) return toast("Daily spin cap reached");
    const rewarded = await AdBridge.showRewarded("lucky spin");
    if (!rewarded) return;
    countAd("spin");
    const rank = bonus("lucky"), roll = Math.random();
    if (roll < 0.36-rank*0.03)    { const amt=400+rank*100; save.coins+=amt; toast(`Lucky Spin: ${amt} coins`); }
    else if (roll < 0.7)          { const cores=2+Math.floor(rank/2); save.cores+=cores; toast(`Lucky Spin: ${cores} cores`); }
    else if (roll < 0.93)         { const frags=5+rank*2; save.fragments+=frags; toast(`Lucky Spin: ${frags} fragments`); }
    else                          { unlockRandomSkin(rank>=3?"Epic":"Rare"); toast("Lucky Spin: skin unlocked"); }
    playSound("buy"); persist();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §28  BOOST
  // ═══════════════════════════════════════════════════════════════════════════

  function triggerBoost() {
    if (state.screen!=="playing" || state.energy < 100) return;
    if (state.activeModifier==="pacifist") return;
    const dur = state.activeModifier==="afterburner" ? 5.0 : 3.6 + bonus("boostDuration")*0.12;
    state.energy = 0; state.overdrive = dur;
    state.combo   = Math.max(state.combo, 3);
    state.run.boosts += 1;
    state.run.maxCombo = Math.max(state.run.maxCombo, Math.floor(state.combo));
    state.shake = 8; state.boostCinema = 2.0;
    burst(state.playerX, state.playerY, C.boost, 52, 12);
    addMessage("Boost", state.playerX, state.playerY-60, C.boost);
    playSound("boost"); vibrate(35);
    updateBoostRing();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §29  PATTERN SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  function pickNewPattern() {
    const stage   = currentStage();
    const kind    = stage.kind || "intro";
    const options = STAGE_PATTERNS[kind] || STAGE_PATTERNS.intro;
    const idx     = Math.floor(state.rng() * options.length);
    state.currentPatternName = options[idx];
    state.currentPattern     = PATTERN_LIBRARY[state.currentPatternName] || PATTERN_LIBRARY.opener;
    state.patternStep        = 0;
  }

  function nextPatternEntry() {
    if (state.currentPattern.length === 0) pickNewPattern();
    const entry = state.currentPattern[state.patternStep];
    state.patternStep++;
    if (state.patternStep >= state.currentPattern.length) pickNewPattern();
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §30  OBSTACLE SPAWNING
  // ═══════════════════════════════════════════════════════════════════════════

  function spawnPattern(stage) {
    if (state.spawnDensityMul < 1 && state.rng() > state.spawnDensityMul) return;

    if (stage.kind === "boss") { spawnBossWave(); return; }

    const entry = nextPatternEntry();

    if (entry === "gap") {
      // A "gap" beat just extends the spawn pause by ~1.2s — handled in update
      state.spawnTimer += 1.2;
      return;
    }
    if (entry === "shard_line") {
      const lane = Math.floor(state.rng() * state.lanes);
      for (let i = 0; i < 4; i++) spawnShard(lane, -60 - i*55);
      return;
    }
    spawnByType(entry, stage, false);
  }

  function spawnByType(type, stage, bossWeakpoint) {
    switch (type) {
      case "bulkhead":     return spawnBulkhead(bossWeakpoint);
      case "splice":       return spawnSplice();
      case "drift":        return spawnDrift();
      case "mirror":       return spawnMirror();
      case "phantom":      return spawnPhantom();
      case "pulse":        return spawnPulse();
      case "convoy":       return spawnConvoy();
      case "gate":         return spawnGate(bossWeakpoint);
      case "echoes":       return spawnEchoes();
      case "gravity_well": return spawnGravityWell();
      default:             return spawnBulkhead(false);
    }
  }

  // ── Telegraph timers: each obstacle gets a telegraph field that counts down
  // from a positive value to 0 before the obstacle enters the player zone.
  // Rendering checks this to decide what warning to draw.

  function spawnBulkhead(isWeakpoint) {
    let gap;
    // Onboarding phase 0: gap always at center (lane 2) so player can easily dodge
    if (state.onboarding && state.onboardingPhase === 0) {
      gap = 2;
      // After 15s, phase 1: gap adjacent to current lane (force near-miss)
    } else if (state.onboarding && state.onboardingPhase === 1 && !state.onboardingForcedNearMiss) {
      const playerLane = laneFromX(state.playerX);
      gap = playerLane + (playerLane < 4 ? 1 : -1); // adjacent lane safe
      state.onboardingForcedNearMiss = true;
    } else {
      gap = Math.floor(state.rng() * state.lanes);
    }
    const lanes = [];
    for (let i = 0; i < state.lanes; i++) if (i !== gap) lanes.push(i);
    const ob = {
      type:"bulkhead", lanes, y:-48, h:30,
      nearMissCredit:false, passed:false, hit:false, elite:false,
      telegraph:0.5, // seconds before reaching player zone
      telegraphLane: gap, // which lane is safe (for amber line)
    };
    if (isWeakpoint) { ob.isWeakpoint=true; ob.gapLane=gap; }
    state.obstacles.push(ob);
    if (state.rng() > 0.16) spawnShard(gap, -112);
  }

  function spawnSplice() {
    const pairs = [[1,4],[0,3],[1,4]];
    const pair  = pairs[Math.floor(state.rng() * pairs.length)];
    state.obstacles.push({
      type:"splice", lanes:[...pair], y:-44, h:34,
      nearMissCredit:false, passed:false, hit:false, elite:false, telegraph:0.5,
    });
    const safe = [0,1,2,3,4].filter(l => !pair.includes(l));
    spawnShard(safe[Math.floor(state.rng()*safe.length)], -116);
  }

  function spawnDrift() {
    const startDir   = state.rng() > 0.5 ? 0 : 4;
    const speedMul   = currentStage().speedMul;
    const driftDir   = startDir === 0 ? 1 : -1;
    state.obstacles.push({
      type:"drift", lanes:[startDir], y:-44, h:30,
      nearMissCredit:false, passed:false, hit:false, elite:false,
      laneFloat:startDir, driftAge:0, driftDuration:2.4/speedMul, driftDir,
      telegraph:0.4, telegraphDir:driftDir, // arrow direction
    });
  }

  function spawnMirror() {
    state.obstacles.push({
      type:"mirror", lanes:[0,4], y:-50, h:30,
      nearMissCredit:false, passed:false, hit:false, elite:false,
      progress:0, travelDuration:1.0, leftLane:0, rightLane:4,
      telegraph:0.3, // inward arrow
    });
  }

  function spawnPhantom() {
    const lane = Math.floor(state.rng() * state.lanes);
    state.obstacles.push({
      type:"phantom", lanes:[lane], y:-44, h:30,
      nearMissCredit:false, passed:false, hit:false, elite:false,
      phantomAge:0, opacity:1,
      telegraph:0.5, // pulsing opacity is the tell
    });
  }

  function spawnPulse() {
    const lane = Math.floor(state.rng() * state.lanes);
    state.obstacles.push({
      type:"pulse", lanes:[lane], y:-44, h:30,
      nearMissCredit:false, passed:false, hit:false, elite:false,
      pulsePhase:"hold", holdTimer:1.2/currentStage().speedMul,
      warnTimer:0.08, jumpWarning:false, pulseMoving:false,
      telegraph:0.5,
    });
  }

  function spawnConvoy() {
    const lane = Math.floor(state.rng() * state.lanes);
    for (let i = 0; i < 3; i++) {
      state.obstacles.push({
        type:"convoy", lanes:[lane], y:-44-i*80, h:24,
        nearMissCredit:false, passed:false, hit:false, elite:false,
        convoyLead: i === 0,
        telegraph: 0.3,
      });
    }
  }

  function spawnGate(isWeakpoint) {
    const pairs    = [[0,2],[1,3],[2,4],[0,3],[1,4]];
    const pair     = pairs[Math.floor(state.rng() * pairs.length)];
    const gapLane  = Math.floor((pair[0]+pair[1])/2);
    state.obstacles.push({
      type:"gate", lanes:[pair[0],pair[1]], y:-44, h:30,
      nearMissCredit:false, passed:false, hit:false, elite:false,
      gapLane, gapHighlightTimer:0.3, isWeakpoint,
      telegraph: 0.3,
    });
    spawnShard(gapLane, -120);
  }

  function spawnEchoes() {
    const lane     = Math.floor(state.rng() * state.lanes);
    const fakeLane = (lane + 2) % state.lanes;
    // Real block: danger red. Fake block: slightly warmer hue
    state.obstacles.push({ type:"echoes", lanes:[lane],     y:-44, h:30, nearMissCredit:false, passed:false, hit:false, elite:false, fake:false, fakeColor:"#E8344A" });
    state.obstacles.push({ type:"echoes", lanes:[fakeLane], y:-44, h:30, nearMissCredit:false, passed:false, hit:false, elite:false, fake:true,  fakeColor:"#E85044" });
  }

  function spawnGravityWell() {
    state.obstacles.push({
      type:"gravity_well", lanes:[], y:state.h*0.4, h:0,
      nearMissCredit:false, passed:false, hit:false, elite:false,
      age:0, maxAge:6,
    });
  }

  function spawnBossWave() {
    const gap = Math.floor(state.rng() * state.lanes);
    for (let row = 0; row < 3; row++) {
      const lanes = [];
      for (let i = 0; i < state.lanes; i++) if (i !== ((gap+row) % state.lanes)) lanes.push(i);
      state.obstacles.push({ type:"bulkhead", lanes, y:-56-row*96, h:36, nearMissCredit:false, passed:false, hit:false, elite:row===2, telegraph:0.5, telegraphLane:(gap+row)%state.lanes });
    }
  }

  function spawnShard(lane, y) {
    const rareChance = 0.05 + bonus("rare")*0.02;
    const rare = state.rng() < rareChance;
    state.shards.push({ lane, y, pulse:state.rng()*Math.PI*2, value:rare?3:state.overdrive>0?2:1, rare });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §31  OBSTACLE UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  function updateObstacles(dt) {
    const playerLane = laneFromX(state.playerX);
    const w          = nearMissWindow();
    let cleanPassDetected = false, nearMissThisFrame = false;

    for (const ob of state.obstacles) {
      if (ob.type==="gravity_well") { ob.age+=dt; if(ob.age>=ob.maxAge)ob.hit=true; continue; }

      // Update telegraph countdown
      if (ob.telegraph !== undefined && ob.telegraph > 0) ob.telegraph -= dt;

      // Type-specific updates
      if (ob.type==="drift") {
        ob.driftAge += dt;
        ob.laneFloat = ob.driftDir===1 ? (ob.driftAge/ob.driftDuration)*4 : 4-(ob.driftAge/ob.driftDuration)*4;
        ob.laneFloat = clamp(ob.laneFloat, 0, 4);
        ob.lanes = [Math.round(ob.laneFloat)];
      }
      if (ob.type==="mirror") {
        ob.progress = clamp(ob.progress + dt/Math.max(0.1,ob.travelDuration), 0, 1);
        ob.leftLane  = Math.round(ob.progress * 2);
        ob.rightLane = 4 - Math.round(ob.progress * 2);
        ob.lanes = [ob.leftLane, ob.rightLane];
      }
      if (ob.type==="phantom") {
        ob.phantomAge += dt;
        ob.opacity = (ob.phantomAge > 0.34 && ob.phantomAge < 0.74) ? 0.4 : 1;
      }
      if (ob.type==="pulse") {
        if (ob.pulsePhase==="hold") {
          ob.holdTimer -= dt;
          if (ob.holdTimer <= 0.08 && !ob.jumpWarning) { ob.jumpWarning=true; ob.pulsePhase="warning"; }
          if (ob.holdTimer <= 0) {
            ob.jumpWarning=false; ob.pulsePhase="moving"; ob.pulseMoving=true;
            const dir = state.rng()>0.5?1:-1;
            ob.lanes = [clamp(ob.lanes[0]+dir, 0, 4)];
          }
        }
        if (ob.pulsePhase==="moving") { ob.pulseMoving=false; ob.pulsePhase="hold"; }
      }
      if (ob.type==="gate" && ob.gapHighlightTimer > 0) ob.gapHighlightTimer -= dt;

      if (state.bossStaggerTimer > 0) continue;
      ob.y += state.speed * dt;

      if (!ob.passed && ob.y > state.playerY + 38) {
        ob.passed = true;
        const adjacentLanes = ob.lanes.filter(l => Math.abs(l-playerLane)===1);
        const inLane        = ob.lanes.includes(playerLane);
        const noneAdjacent  = adjacentLanes.length===0 && !inLane;
        const withinWindow  = Math.abs(ob.y - state.playerY) <= w + 38;

        if (adjacentLanes.length > 0 && withinWindow && !ob.nearMissCredit && !inLane) {
          ob.nearMissCredit = true;
          nearMissThisFrame = true;
          let distOk = true;
          if (state.activeModifier==="precision") {
            const closestLane = adjacentLanes.reduce((prev,l) => Math.abs(laneCenter(l)-state.playerX)<Math.abs(laneCenter(prev)-state.playerX)?l:prev, adjacentLanes[0]);
            if (calcNearMissDistance(playerLane, closestLane) > 8) { distOk=false; cleanPassDetected=true; }
          }
          if (distOk) processNearMiss(ob, playerLane, adjacentLanes);
        } else if (noneAdjacent) {
          cleanPassDetected = true;
        }
      }
    }

    // Clean pass resets streak
    if (cleanPassDetected && !nearMissThisFrame && state.nearMissStreak > 0) {
      state.nearMissStreak = 0;
      updateStreakHud();
      if (state.clutchActive) {
        state.clutchActive = false; state.clutchTimer = 0;
        state.clutchScaleTarget = 1.0;
        document.getElementById("app").classList.remove("clutch-active");
        state.run.viralMoments++;
        playSweep(160, 60, 0.3);
      }
      if (save.selectedZone==="pulse_nexus") state.heat = Math.min(100, state.heat+4);
    }

    // Collision detection
    for (const ob of state.obstacles) {
      if (ob.hit || ob.passed) continue;
      if (ob.type==="gravity_well") continue;
      if (ob.type==="echoes" && ob.fake) {
        if (ob.lanes.includes(playerLane) && Math.abs(ob.y-state.playerY) < 34) ob.hit=true;
        continue;
      }
      if (ob.lanes.includes(playerLane) && Math.abs(ob.y-state.playerY) < 34) {
        if (state.clutchActive) { state.shake=16; endRun(); return; }
        if ((state.overdrive>0 && (!ob.elite||state.overdrive>1.2)) || state.invincible>0) {
          ob.hit = true;
          const breakScore = 35 * Math.max(1,state.combo) * (1+bonus("boostScore")*0.06);
          state.score += breakScore; state.run.hazardsBroken += 1;
          state.energy = Math.min(100, state.energy+energyGain(2));
          spawnImplodeBurst(laneCenter(playerLane), ob.y, selectedSkin().accent);
          playSound("break"); updateBoostRing();
        } else if (consumeSafety()) {
          ob.hit=true; state.stageHits+=1; state.run.shieldHits+=1;
          state.invincible=1.2; state.shake=10;
          markViral("Shield Clutch"); shieldFlash();
        } else {
          state.shake=16; endRun(); return;
        }
      }
    }

    state.obstacles = state.obstacles.filter(ob => ob.y < state.h+96 && !ob.hit);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §32  NEAR-MISS PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  function processNearMiss(ob, playerLane, adjacentLanes) {
    state.run.nearMisses += 1;
    gainCombo(1);

    if (state.activeModifier !== "ghost_run") {
      state.energy = Math.min(100, state.energy+energyGain(4));
    } else {
      state.score += state.combo * 80;
    }

    // Boss weakpoint near-miss
    if (ob.isWeakpoint || (ob.type==="gate" && ob.isWeakpoint)) {
      const mul = state.bossPhase===3 ? 5 : 3;
      state.energy = Math.min(100, state.energy+energyGain(mul*4));
      state.bossNearMissCount++;
      // Boss phase advances after 5 near-misses per phase
      if (state.bossNearMissCount >= 5 && state.bossPhase < 3) {
        state.bossPhase++; state.bossNearMissCount=0;
        updateBossPips();
        addMessage(`Phase ${state.bossPhase}`, state.w/2, state.h*0.25, C.danger);
        if (state.bossPhase===2) state.bossWeakpointActive=true;
        if (state.bossPhase===3) { state.bossWeakpointActive=true; addMessage("RAGE", state.w/2, state.h*0.35, C.danger); }
        if (state.bossPhase>3) { /* boss defeated */ bossDefeated(); }
      }
      if (state.bossPhase===3) {
        state.bossStaggerTimer=1.2;
        const wf=document.getElementById("weakpointFlash");
        wf.classList.add("fire"); setTimeout(()=>wf.classList.remove("fire"),250);
      }
    }

    const closestLane = adjacentLanes.reduce((prev,l) => Math.abs(laneCenter(l)-state.playerX)<Math.abs(laneCenter(prev)-state.playerX)?l:prev, adjacentLanes[0]);
    const dist        = calcNearMissDistance(playerLane, closestLane);
    if (dist <= 10 && bonus("perfectScore") > 0) {
      state.energy = Math.min(100, state.energy+energyGain(4));
      gainCombo(1);
      addMessage("PERFECT", state.playerX, state.playerY-80, C.perfect);
    }

    spawnWake(playerLane, closestLane);
    spawnLaneFlash(playerLane);
    if (state.run.nearMisses % 10 === 0) markViral("Near Miss Reel");

    const mod = state.activeModifier;
    if (mod==="slipstream") state.slipstreamTimer = 3.0;
    if (mod==="overclock") {
      state.nearMissCountMod = (state.nearMissCountMod||0)+1;
      if (state.nearMissCountMod % 10 === 0) state.overdrive += 1.0;
    }

    state.nearMissStreak++;
    updateStreakHud();

    // Determine streak state for sound
    const streakState = state.nearMissStreak>=20?"untouchable":state.nearMissStreak>=10?"ghost_line":state.nearMissStreak>=5?"razor":state.nearMissStreak>=3?"threading":"base";
    playNearMissSound(streakState);

    if (save.selectedZone==="pulse_nexus") state.heat = Math.max(0, state.heat-20);

    // First near-miss ever: trigger teach overlay
    if (state.run.nearMisses === 1) triggerNearMissTeach();

    // Clutch activation at streak 10
    if (state.nearMissStreak === 10 && !state.clutchActive) {
      activateClutch();
    } else if (state.nearMissStreak >= 10 && state.clutchActive) {
      state.clutchTimer = Math.min(18, state.clutchTimer+1.4);
      if (state.nearMissStreak >= 20) { state.clutchTimer = 6; state.spawnTimer = Math.max(0,state.spawnTimer)*0.9; }
    }

    if (state.nearMissStreak >= 5) vibrate([10]);

    updateBoostRing();
  }

  function calcNearMissDistance(playerLane, obstacleLane) {
    return Math.abs(laneCenter(playerLane) - laneCenter(obstacleLane)) - state.laneW;
  }

  function activateClutch() {
    state.clutchActive = true;
    state.clutchTimer  = 6;
    state.clutchScaleTarget = 1.08;
    document.getElementById("app").classList.add("clutch-active");
    addMessage("CLUTCH", state.w/2, state.h*0.3, C.wake);
    vibrate([10,5,10,5,20]);
    playSweep(80, 160, 0.4);
  }

  function updateStreakHud() {
    const streakDisplay = document.getElementById("streakDisplay");
    document.getElementById("streakCount").textContent = state.nearMissStreak;
    document.getElementById("streakLabel").textContent = getStreakLabel(state.nearMissStreak);
    streakDisplay.classList.toggle("visible", state.screen==="playing" && state.nearMissStreak>0);
    ["streak-state-threading","streak-state-razor","streak-state-ghost-line","streak-state-untouchable"].forEach(c => streakDisplay.classList.remove(c));
    if      (state.nearMissStreak >= 20) streakDisplay.classList.add("streak-state-untouchable");
    else if (state.nearMissStreak >= 10) streakDisplay.classList.add("streak-state-ghost-line");
    else if (state.nearMissStreak >= 5)  streakDisplay.classList.add("streak-state-razor");
    else if (state.nearMissStreak >= 3)  streakDisplay.classList.add("streak-state-threading");
    state.comboDecayRate = (state.nearMissStreak>=3 && state.nearMissStreak<10) ? 0.8 : 1.6;
    if (state.activeModifier==="momentum" && state.overdrive>0) state.comboDecayRate = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §33  WAKE STROKES
  // ═══════════════════════════════════════════════════════════════════════════

  function spawnWake(playerLane, obstacleLane) {
    const px      = laneCenter(playerLane);
    const ox      = laneCenter(obstacleLane);
    const dir     = ox > px ? 1 : -1;
    const maxLife = state.clutchActive ? 0.8 : 0.4;
    const skin    = selectedSkin();
    const tier    = rarityTier(skin);
    // Rare+: wider trails on near-miss
    const wScale  = tier >= 1 ? 2.5 : 1.0;
    // Epic+: use accent color for wake
    const wColor  = tier >= 2 ? skin.accent : C.wake;

    const wakeColor = state.clutchActive ? "#ffffff" : wColor;

    state.wakes.push({
      x:px, y:state.playerY,
      cx:px+dir*state.laneW*0.5, cy:state.playerY-40,
      ex:px+dir*state.laneW*0.9, ey:state.playerY-90,
      life:maxLife, maxLife, scale:wScale, color:wakeColor,
    });
    if (state.combo >= 10) {
      state.wakes.push({
        x:px, y:state.playerY,
        cx:px+dir*state.laneW*0.5, cy:state.playerY-38,
        ex:px+dir*state.laneW*0.9, ey:state.playerY-88,
        life:maxLife, maxLife, scale:wScale*0.5, color:C.reward, secondary:true,
      });
    }
    if (state.wakes.length > PERF.maxWakes) state.wakes = state.wakes.slice(-PERF.maxWakes);
  }

  function spawnLaneFlash(playerLane) {
    for (const dl of [-1,1]) {
      const fl = playerLane + dl;
      if (fl>=0 && fl<state.lanes) {
        state.particles.push({ x:laneCenter(fl), y:state.playerY, vx:0, vy:0, life:0.1, size:state.laneW*0.9, color:C.wake, isFlash:true });
      }
    }
  }

  function updateWakes(dt) { state.wakes = state.wakes.filter(w => { w.life -= dt; return w.life > 0; }); }

  // ═══════════════════════════════════════════════════════════════════════════
  // §34  SHARD UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  function updateShards(dt) {
    const playerLane = laneFromX(state.playerX);
    for (const shard of state.shards) {
      shard.y += state.speed * dt;
      shard.pulse += dt * 8;
      if (!shard.collected && shard.lane===playerLane && Math.abs(shard.y-state.playerY)<38) {
        shard.collected = true;
        const value = Math.round(shard.value * (1+bonus("shardValue")*0.03));
        state.run.shards  += value;
        if (shard.rare) state.run.rareShards += 1;
        state.energy = Math.min(100, state.energy+energyGain(11*shard.value));
        state.score  += 42 * value * Math.max(1, state.combo*0.5);
        gainCombo(1);
        spawnShardRings(laneCenter(shard.lane), shard.y, shard.rare);
        playSound("shard"); updateBoostRing();
      }
    }
    state.shards = state.shards.filter(s => s.y < state.h+60 && !s.collected);
  }

  function spawnShardRings(x, y, rare) {
    const color = rare ? C.wake : C.reward, count = rare ? 3 : 1;
    for (let i=0; i<count; i++) {
      state.particles.push({ x,y, vx:0, vy:0, life:0.2+i*0.06, size:(i+1)*8, color, isRing:true, ringR:(i+1)*4, ringMaxR:(i+1)*20 });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §35  COMBO
  // ═══════════════════════════════════════════════════════════════════════════

  function gainCombo(amount) {
    state.combo = Math.min(maxComboCap(), Math.floor(state.combo+amount));
    state.comboTimer = 2.2;
    state.run.maxCombo = Math.max(state.run.maxCombo, Math.floor(state.combo));
    if (state.combo >= 30 && state.run.viralMoments < 3) markViral("Crazy Combo");
  }
  function markViral(label) {
    state.run.viralMoments += 1; state.run.highlight = label;
    addMessage(label, state.playerX, state.playerY-76, C.reward);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §36  PARTICLES / SPARKS / FRAGMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  function updateParticles(dt) {
    for (const p of state.particles) {
      if (!p.isRing && !p.isFlash) { p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=90*dt; }
      if (p.isRing) { p.ringR += (p.ringMaxR-p.ringR)*dt*8; }
      p.life -= dt;
    }
    for (const s of state.sparks) { s.x+=(s.vx||0)*dt; s.y+=(s.vy||0)*dt; s.life-=dt; }
    for (const m of state.messages) { m.y-=30*dt; m.life-=dt; }
    state.particles = state.particles.filter(p => p.life>0).slice(-PERF.maxParticles);
    state.sparks    = state.sparks.filter(s => s.life>0).slice(-PERF.maxSparks);
    state.messages  = state.messages.filter(m => m.life>0);
  }

  function updateFragments(dt) {
    for (const f of state.fragments) {
      f.x += f.vx*dt; f.y += f.vy*dt;
      // Legendary: higher gravity (300)
      const grav = (f.tier||0) >= 3 ? 300 : 90;
      f.vy += grav * dt;
      f.rot += f.rotV*dt; f.life -= dt;
    }
    state.fragments = state.fragments.filter(f => f.life>0);
  }

  function maybeAddSpeedSparks(dt, stage) {
    if (state.rng() > dt*(20+stage.number*0.35)) return;
    const zone = currentZone();
    state.sparks.push({ x:state.trackX+state.rng()*state.trackW, y:-20, vy:state.speed*(0.8+state.rng()*0.5), life:0.5+state.rng()*0.7, color:state.rng()>0.5?zone.color:C.reward });
  }

  function burst(x, y, color, count, power) {
    const cap = Math.floor(count * PERF.burstScale);
    for (let i=0; i<cap; i++) {
      const a=Math.random()*Math.PI*2, s=(40+Math.random()*120)*power*0.14;
      state.particles.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:0.32+Math.random()*0.42, size:2+Math.random()*5, color });
    }
  }

  function addMessage(text, x, y, color) { state.messages.push({ text, x, y, color, life:0.9 }); }

  function spawnImplodeBurst(x, y, color) {
    for (let i=0; i<8; i++) {
      const a=Math.random()*Math.PI*2;
      state.particles.push({ x:x+Math.cos(a)*32, y:y+Math.sin(a)*32, vx:-Math.cos(a)*180, vy:-Math.sin(a)*180, life:0.08, size:3, color:C.danger, isImplosion:true });
    }
    for (let i=0; i<8; i++) {
      const a=(i/8)*Math.PI*2;
      state.sparks.push({ x, y, vx:Math.cos(a)*220, vy:Math.sin(a)*220, life:0.12, color:C.boost, isLine:true, len:40 });
    }
  }

  function shieldFlash() {
    state.particles.push({ x:state.playerX, y:state.playerY, vx:0, vy:0, life:0.4, size:80, color:C.ghost, isRing:true, ringR:0, ringMaxR:80 });
  }

  function consumeSafety() {
    if (state.activeModifier==="thin_ice")   return false;
    if (state.shieldAvailable)               { state.shieldAvailable=false; return true; }
    if (state.earnedExtraLife)               { state.earnedExtraLife=false; return true; }
    if (currentStage().kind==="boss" && bonus("bossGuard")>0 && state.run.shieldHits<bonus("bossGuard")) return true;
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §37  BOSS SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  function initBossStage(stage) {
    state.bossPhase=1; state.bossPhaseTimer=0; state.bossWeakpointActive=false;
    state.bossStaggerTimer=0; state.bossWeakpointCount=0; state.bossNearMissCount=0;
    const name = stage.name.replace("Boss:","").trim();
    document.getElementById("bossName").textContent = name;
    document.getElementById("bossHud").classList.add("visible");
    updateBossPips();
    state.bossRevealName=stage.name; state.bossReveal=1.4;
    addMessage(name, state.w/2, state.h*0.3, C.danger);
  }

  function updateBossPips() {
    const pips = ["bossPip1","bossPip2","bossPip3"];
    pips.forEach((id,i) => {
      const el  = document.getElementById(id);
      const pip = i+1;
      el.classList.remove("active","done");
      if (pip < state.bossPhase)   el.classList.add("done");
      else if (pip===state.bossPhase) el.classList.add("active");
    });
  }

  function bossDefeated() {
    state.bossDefeatPhase=1; state.bossDefeatTimer=0;
    document.getElementById("bossHud").classList.remove("visible");
    state.run.bossesDefeated += 1;
    burst(state.w/2, state.h*0.35, currentZone().color, 70, 12);
    vibrate([50,30,80]);
    playSound("buy");
  }

  function updateBoss(dt, stage) {
    if (stage.kind!=="boss") return;
    if (state.bossPhase===0) { initBossStage(stage); return; }
    state.bossPhaseTimer += dt;
    if (state.bossStaggerTimer > 0) state.bossStaggerTimer = Math.max(0, state.bossStaggerTimer-dt);

    if (state.bossDefeatPhase > 0) {
      state.bossDefeatTimer += dt;
      if (state.bossDefeatPhase===1 && state.bossDefeatTimer>=0.4) state.bossDefeatPhase=2;
      if (state.bossDefeatPhase===2 && state.bossDefeatTimer>=1.2) state.bossDefeatPhase=3;
      if (state.bossDefeatPhase===3 && state.bossDefeatTimer>=3.0) {
        state.bossDefeatPhase=0; state.bossDefeatTimer=0;
        state.stageIndex+=1; state.stageTimer=0; state.stageHits=0;
        save.stageDeathCounts[`${save.selectedZone}_${state.stageIndex-1}`]=0;
        pickNewPattern();
        addMessage(`Stage ${state.stageIndex}`, state.w/2, state.h*0.25, currentZone().color);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §38  ZONE MECHANICS
  // ═══════════════════════════════════════════════════════════════════════════

  function updateZoneMechanics(dt) {
    const zone = save.selectedZone;

    if (zone==="quantum_core" || state.activeModifier==="signal_decay") {
      const decayRate = state.activeModifier==="signal_decay" ? 6 : 4;
      state.energy = Math.max(0, state.energy - decayRate*dt);
    }

    if (zone==="void_network") {
      state.commitLock = Math.max(0, state.commitLock-dt);
    }

    if (zone==="glitch_dimension") {
      state.glitchFlashTimer += dt;
      if (state.glitchFlashTimer >= 8) { state.glitchFlashTimer=0; state.glitchFlashActive=true; }
      if (state.glitchFlashActive && state.glitchFlashTimer > 0.08) state.glitchFlashActive=false;
      state.glitchTears = state.glitchTears.filter(t => { t.life-=dt; return t.life>0; });
      if (state.rng() > 1-dt*0.4) {
        state.glitchTears.push({ y:Math.random()*state.h, dx:(Math.random()-0.5)*16, life:0.08+Math.random()*0.06, h:8+Math.random()*10 });
      }
    }

    if (zone==="singularity") {
      const pull = (state.w/2 - state.playerX) * 0.008 * dt;
      state.gravityPull = pull;
      state.playerX += pull;
    }

    if (zone==="pulse_nexus") {
      state.heat = Math.max(0, state.heat-2*dt);
      if (state.heatSurge > 0) {
        state.heatSurge -= dt;
        if (state.heatSurge <= 0) state.speed /= 1.15;
      }
      if (state.heat >= 100 && state.heatSurge <= 0) {
        state.heatSurge=6.0; state.heat=0; state.speed*=1.15;
        addMessage("HEAT SURGE", state.w/2, state.h*0.3, C.boost);
      }
    }
  }

  function applyModifierEffects(dt) {
    const mod = state.activeModifier;
    if (!mod) return;
    if (mod==="tremor") {
      state.tremorPhase = (state.tremorPhase||0)+dt;
      const drift = Math.sin(state.tremorPhase*(2*Math.PI/0.4))*3;
      state.playerX = clamp(state.playerX+drift*dt*8, state.trackX, state.trackX+state.trackW);
    }
    if (mod==="slipstream" && state.slipstreamTimer>0) state.slipstreamTimer=Math.max(0,state.slipstreamTimer-dt);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §39  ONBOARDING
  // ═══════════════════════════════════════════════════════════════════════════

  function updateOnboarding(dt) {
    if (!state.onboarding) return;
    state.onboardingTimer += dt;
    // Phase 0: 0-15s — single-lane bulkheads, safe lane = center
    // Phase 1: 15-30s — force adjacent near-miss opportunity
    // Phase 2: 30-50s — show streak counter, gentle combos
    // Phase 3: 50s+ — normal play
    if (state.onboardingPhase===0 && state.onboardingTimer>=15) { state.onboardingPhase=1; state.onboardingTimer=0; }
    else if (state.onboardingPhase===1 && state.onboardingTimer>=15) { state.onboardingPhase=2; state.onboardingTimer=0; }
    else if (state.onboardingPhase===2 && state.onboardingTimer>=20) { state.onboardingPhase=3; state.onboardingTimer=0; }
    else if (state.onboardingPhase===3 && state.onboardingTimer>=0)  { state.onboarding=false; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §40  MAIN GAME UPDATE LOOP
  // ═══════════════════════════════════════════════════════════════════════════

  function update(dt) {
    if (state.screen==="boot")   { updateParticles(dt); return; }
    if (state.screen==="menu")   { updateMenuGhost(dt); updateParticles(dt); return; }
    if (state.screen!=="playing"){ updateParticles(dt); updateFragments(dt); return; }

    // Near-miss teach freeze
    if (teachFreezePending) {
      teachFreezeTimer -= dt;
      if (teachFreezeTimer <= 0) teachFreezePending = false;
      // Draw but don't advance game logic
      return;
    }

    const stage        = currentStage();
    const zonePressure = 1 + ZONES.findIndex(z => z.id===save.selectedZone)*0.05;
    state.time      += dt;
    state.stageTimer+= dt;

    let speedBase = (300 + Math.min(520, state.time*8 + state.score*0.055)) * stage.speedMul * zonePressure;
    if (state.activeModifier==="double_threat") speedBase *= 1.15;
    state.speed = speedBase;

    state.meters     += state.speed * dt * 0.03;
    state.run.meters  = Math.floor(state.meters);
    state.run.stageReached = state.stageIndex;
    state.score      += dt * (11+state.speed*0.022) * (state.overdrive>0?1.8:1) * Math.min(8, 1+state.combo*0.09) * scoreMultiplier();
    state.run.score   = Math.floor(state.score);

    // Smooth score display with digit pulse
    const prevDisplayed = Math.floor(state.displayedScore);
    state.displayedScore += (state.score-state.displayedScore) * Math.min(1, dt*12);
    if (Math.floor(state.displayedScore) > prevDisplayed && els.scoreStrong) {
      els.scoreStrong.classList.add("pulse");
      setTimeout(() => els.scoreStrong.classList.remove("pulse"), 80);
    }

    state.comboTimer  = Math.max(0, state.comboTimer-dt);
    if (state.comboTimer===0 && state.combo>1) state.combo = Math.max(1, state.combo-dt*state.comboDecayRate);
    state.overdrive  = Math.max(0, state.overdrive-dt);
    state.invincible = Math.max(0, state.invincible-dt);
    state.shake      = Math.max(0, state.shake-dt*22);
    state.boostCinema= Math.max(0, state.boostCinema-dt);
    state.stageBeam  = Math.max(0, state.stageBeam-dt);
    state.bossReveal = Math.max(0, state.bossReveal-dt);
    if (state.trackMaterialise > 0) state.trackMaterialise = Math.max(0, state.trackMaterialise-dt*2);

    // Clutch mode
    if (state.clutchActive) {
      state.clutchTimer -= dt;
      document.getElementById("clutchTimer").textContent = `CLUTCH — ${Math.ceil(Math.max(0,state.clutchTimer))}s`;
      if (state.clutchTimer <= 0) {
        state.clutchActive = false;
        state.clutchScaleTarget = 1.0;
        document.getElementById("app").classList.remove("clutch-active");
        state.run.viralMoments++;
        playSweep(160, 60, 0.3);
        vibrate(80);
      }
    }

    // Clutch player scale lerp
    state.clutchScale += (state.clutchScaleTarget - state.clutchScale) * Math.min(1, dt*5);

    if (state.bossStaggerTimer > 0) state.bossStaggerTimer = Math.max(0, state.bossStaggerTimer-dt);

    // Boss reveal cinematic fires 5s before end of stage 6
    if (state.stageIndex===6 && !state.bossRevealCinematicPending && stage.duration - state.stageTimer <= 5) {
      state.bossRevealCinematicPending = true;
      const nextStage = STAGES[6]; // stage 7 = boss
      addMessage(nextStage.name.replace("Boss:","").trim(), state.w/2, state.h*0.28, C.danger);
      state.bossRevealName = nextStage.name;
      state.bossReveal     = 1.4;
    }

    state.playerX += (laneCenter(state.targetLane)-state.playerX) * Math.min(1, dt*(16+bonus("movement")*0.5));
    recordGhost(dt);

    applyModifierEffects(dt);
    updateZoneMechanics(dt);
    updateOnboarding(dt);
    updateBoss(dt, stage);

    // Spawning
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.bossDefeatPhase===0) {
      spawnPattern(stage);
      const pressure = Math.min(0.62, state.stageIndex*0.012 + state.time*0.002);
      let interval   = 0.88 - pressure + state.rng()*0.2;
      if (state.nearMissStreak >= 20) interval *= 0.9;
      state.spawnTimer = interval;
    }

    if (state.stageTimer >= stage.duration && stage.kind!=="boss" && state.bossDefeatPhase===0) advanceStage(stage);

    updateObstacles(dt); updateShards(dt); updateParticles(dt); updateWakes(dt); updateFragments(dt);
    maybeAddSpeedSparks(dt, stage);
    updateHud();
  }

  function updateMenuGhost(dt) {
    if (!menuGhost.active) return;
    menuGhost.time = (menuGhost.time||0) + dt;
    const targetLane = clamp(Math.floor(2+Math.sin(menuGhost.time*0.4)*1.8), 0, 4);
    menuGhost.x += (laneCenter(targetLane)-menuGhost.x) * Math.min(1, dt*3);
  }

  function recordGhost(dt) {
    state.recordTimer += dt;
    if (state.recordTimer < 0.25) return;
    state.recordTimer = 0;
    state.inputGhost.push([Number(state.time.toFixed(2)), laneFromX(state.playerX)]);
  }

  function advanceStage(stage) {
    state.run.stagesCleared += 1;
    state.stageBeam = 0.4;
    if (state.stageHits===0) {
      state.run.perfectStages += 1;
      state.score  += Math.floor((250+state.stageIndex*15)*(1+bonus("perfectScore")*0.07));
      state.energy  = Math.min(100, state.energy+energyGain(8));
      addMessage("Perfect", state.w/2, state.h*0.3, C.perfect);
    }
    save.stageDeathCounts[`${save.selectedZone}_${state.stageIndex}`] = 0;
    state.stageIndex += 1; state.stageTimer=0; state.stageHits=0;

    if (state.activeModifier==="cascade") {
      for (let i=0; i<45; i++) spawnShard(Math.floor(state.rng()*state.lanes), -60-i*20);
    }

    pickNewPattern();
    const nextStage = currentStage();
    if (nextStage.kind==="boss") {
      state.bossReveal=1.4; state.bossRevealName=nextStage.name; state.bossPhase=0;
    }
    addMessage(`Stage ${state.stageIndex}`, state.w/2, state.h*0.25, currentZone().color);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §41  HUD & BOOST RING
  // ═══════════════════════════════════════════════════════════════════════════

  function updateHud() {
    els.stage.textContent = format(state.stageIndex);
    els.score.textContent = format(state.displayedScore);
    els.best.textContent  = format(Math.max(save.best, state.score));
    els.boost.classList.toggle("ready", state.energy >= 100);
    updateBoostRing();
    updateStreakHud();

    const comboDisplay = document.getElementById("comboDisplay");
    const comboVal     = document.getElementById("comboValue");
    comboDisplay.classList.toggle("visible", state.screen==="playing" && state.combo > 1);
    ["combo-x1","combo-x5","combo-x10","combo-x20","combo-x40"].forEach(c => comboVal.classList.remove(c));
    if      (state.combo >= 40) comboVal.classList.add("combo-x40");
    else if (state.combo >= 20) comboVal.classList.add("combo-x20");
    else if (state.combo >= 10) comboVal.classList.add("combo-x10");
    else if (state.combo >= 5)  comboVal.classList.add("combo-x5");
    else                        comboVal.classList.add("combo-x1");
    comboVal.textContent = `${Math.floor(state.combo)}×`;
  }

  function updateBoostRing() {
    if (!els.boostRingFill) return;
    const pct     = clamp(state.energy/100, 0, 1);
    const dashLen = pct * RING_CIRC;
    els.boostRingFill.setAttribute("stroke-dasharray", `${dashLen} ${RING_CIRC}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §42  DRAWING
  // ═══════════════════════════════════════════════════════════════════════════

  function draw(now) {
    const inGame = state.screen==="playing" || state.screen==="gameover";
    const shakeX = state.shake ? (Math.random()-0.5)*state.shake : 0;
    const shakeY = state.shake ? (Math.random()-0.5)*state.shake : 0;
    ctx.save();
    if (inGame) ctx.translate(shakeX, shakeY);
    drawBackground(now);
    drawTrack(now);
    drawZoneAtmosphere(now);
    if (state.screen==="playing" || state.screen==="gameover") {
      drawGhost();
      drawSparks();
      drawWakes(now);
      drawShards(now);
      drawObstacleTelegraphs(now);
      drawObstacles(now);
      drawPlayer(now);
      drawParticles();
      drawFragments(now);
      drawMessages();
      drawBoostCinema(now);
      drawStageBeam(now);
      drawBossReveal(now);
      drawBossDefeatBeams(now);
      drawClutchCountdown(now);
    } else if (state.screen==="menu") {
      drawMenuGhost(now);
    }
    ctx.restore();
  }

  // ── Background ──────────────────────────────────────────────────────────────

  function drawBackground(now) {
    ctx.fillStyle = C.void;
    ctx.fillRect(0,0,state.w,state.h);
    ctx.save();
    ctx.globalAlpha = 0.06; ctx.strokeStyle="#ffffff"; ctx.lineWidth=1;
    const spacing=50, offset=((state.time||now)*state.speed*0.12%spacing+spacing)%spacing;
    for (let y=-spacing; y<state.h+spacing; y+=spacing) {
      ctx.beginPath(); ctx.moveTo(0,y+offset); ctx.lineTo(state.w,y+offset+22); ctx.stroke();
    }
    ctx.restore();
    const zone = currentZone();
    ctx.save();
    ctx.globalAlpha = 0.08+Math.sin((now||0)*1.2)*0.03;
    ctx.fillStyle = zone.color;
    ctx.beginPath(); ctx.arc(state.trackX+state.trackW*0.1, state.h*0.15, 100,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.07; ctx.fillStyle=C.reward;
    ctx.beginPath(); ctx.arc(state.trackX+state.trackW*0.88, state.h*0.88, 130,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ── Zone atmosphere ──────────────────────────────────────────────────────────

  function drawZoneAtmosphere(now) {
    const zoneId = save.selectedZone, t = state.time||now||0;
    ctx.save();
    if (zoneId==="neon_city") {
      drawBuildingSilhouettes(now,0.1,0.20,state.h*0.4);
      drawBuildingSilhouettes(now,0.2,0.36,state.h*0.55);
      ctx.globalAlpha=0.18; ctx.fillStyle=C.danger;
      ctx.fillRect(state.trackX+3, state.playerY+40, 6, state.h);
      ctx.fillStyle=C.wake;
      ctx.fillRect(state.trackX+state.trackW-9, state.playerY+40, 6, state.h);
    }
    if (zoneId==="quantum_core") {
      ctx.globalAlpha=0.06; ctx.strokeStyle=C.perfect; ctx.lineWidth=1;
      const hexSize=28, hexH=hexSize*Math.sqrt(3), scrollY=(t*state.speed*0.04)%hexH;
      for (let row=-1; row<state.h/hexH+2; row++) {
        for (let col=-1; col<state.w/(hexSize*1.5)+2; col++) {
          drawHex(col*hexSize*1.5, row*hexH+(col%2===0?0:hexH/2)-scrollY, hexSize-4);
        }
      }
      const pulsePeriod=3, pulseT=t%pulsePeriod, pulseR=(pulseT/pulsePeriod)*Math.max(state.w,state.h)*0.7;
      ctx.globalAlpha=Math.max(0,0.06*(1-pulseT/pulsePeriod));
      ctx.strokeStyle=C.perfect; ctx.lineWidth=80;
      ctx.beginPath(); ctx.arc(state.w/2,state.h/2,pulseR,0,Math.PI*2); ctx.stroke();
    }
    if (zoneId==="glitch_dimension") {
      ctx.globalAlpha=0.04; ctx.fillStyle="#FF00AA";
      ctx.fillRect(state.trackX,0,state.trackW,state.h);
      for (const tear of state.glitchTears) {
        ctx.save(); ctx.globalAlpha=tear.life*8*0.4;
        ctx.drawImage(canvas, 0, tear.y, state.w, tear.h, tear.dx, tear.y, state.w, tear.h);
        ctx.restore();
      }
      if (state.glitchFlashActive) { ctx.globalAlpha=0.18; ctx.fillStyle=C.spine; ctx.fillRect(0,0,state.w,state.h); }
    }
    if (zoneId==="singularity") {
      ctx.globalAlpha=0.06; ctx.fillStyle=C.boost; ctx.fillRect(0,0,state.w,state.h);
      const rg=ctx.createRadialGradient(state.w/2,state.h/2,100,state.w/2,state.h/2,state.w*0.7);
      rg.addColorStop(0,"rgba(0,0,0,0)"); rg.addColorStop(1,"rgba(0,0,0,0.22)");
      ctx.fillStyle=rg; ctx.globalAlpha=1; ctx.fillRect(0,0,state.w,state.h);
    }
    if (zoneId==="pulse_nexus") {
      if (state.heat>40) { ctx.globalAlpha=(state.heat-40)/200; ctx.fillStyle=C.boost; ctx.fillRect(state.trackX,0,state.trackW,state.h); }
      ctx.globalAlpha=0.5; ctx.strokeStyle=C.ghost; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(state.w/2,0); ctx.lineTo(state.w/2,state.h); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBuildingSilhouettes(now, speedMul, alpha, maxH) {
    const t=state.time||now||0;
    ctx.globalAlpha=alpha; ctx.fillStyle="#0A0B12";
    const scroll=(t*state.speed*speedMul)%180;
    for (let i=-1; i<state.w/60+2; i++) {
      const bx=i*60-scroll%60, bh=maxH*(0.4+((i*7+Math.floor(scroll/60))%11)/18);
      ctx.fillRect(state.trackX-120+bx, state.h-bh, 52, bh);
    }
  }

  function drawHex(cx, cy, r) {
    ctx.beginPath();
    for (let i=0; i<6; i++) { const a=(Math.PI/3)*i; if(i===0)ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a));else ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a)); }
    ctx.closePath(); ctx.stroke();
  }

  // ── Track ────────────────────────────────────────────────────────────────────

  function drawTrack(now) {
    const x=state.trackX, w=state.trackW, bottom=state.h+40, top=-40;
    ctx.save();
    ctx.fillStyle="rgba(10,11,18,0.68)";
    roundRect(ctx,x,top,w,bottom-top,8); ctx.fill();
    const mat=state.trackMaterialise>0?state.trackMaterialise:0, matY=mat>0?state.h*(1-mat):0;
    ctx.strokeStyle="rgba(255,255,255,0.09)"; ctx.lineWidth=1;
    for (let i=1; i<state.lanes; i++) {
      const lx=x+i*state.laneW;
      ctx.setLineDash([9,18]);
      ctx.lineDashOffset=-(state.time||0)*state.speed*0.05;
      ctx.beginPath(); ctx.moveTo(lx, mat>0?matY:top); ctx.lineTo(lx, bottom); ctx.stroke();
    }
    ctx.setLineDash([]);
    const heatColor=save.selectedZone==="pulse_nexus"&&state.heat>40?C.boost:(state.overdrive>0?C.boost:C.ghost);
    const heatAlpha=save.selectedZone==="pulse_nexus"?Math.max(0.14,(state.heat/100)*0.5):0.14;
    ctx.globalAlpha=state.overdrive>0?0.38:heatAlpha;
    ctx.strokeStyle=heatColor; ctx.lineWidth=state.overdrive>0?2.5:1;
    roundRect(ctx,x+4,top+4,w-8,bottom-top-8,8); ctx.stroke();
    const scanY=((((now||0)*140)%(state.h+140))-70);
    const scan=ctx.createLinearGradient(0,scanY-60,0,scanY+60);
    scan.addColorStop(0,"rgba(200,240,255,0)");scan.addColorStop(0.5,"rgba(200,240,255,0.08)");scan.addColorStop(1,"rgba(200,240,255,0)");
    ctx.fillStyle=scan; ctx.globalAlpha=1;
    ctx.fillRect(x,scanY-60,w,120);
    ctx.restore();
  }

  // ── Ghost replay ─────────────────────────────────────────────────────────────

  function drawGhost() {
    if (!state.ghostReplay?.lanes?.length) return;
    const sample=state.ghostReplay.lanes.reduce((prev,item)=>item[0]<=state.time?item:prev, state.ghostReplay.lanes[0]);
    const x=laneCenter(sample[1]);
    ctx.save(); ctx.globalAlpha=0.22; ctx.fillStyle=C.ghost;
    ctx.beginPath(); drawTearPath(ctx,x,state.playerY+18,14,20); ctx.fill();
    ctx.restore();
  }

  // ── Obstacle telegraphs (drawn BEFORE obstacles, in screen space) ────────────

  function drawObstacleTelegraphs(now) {
    ctx.save();
    for (const ob of state.obstacles) {
      if (ob.telegraph === undefined || ob.telegraph <= 0) continue;
      const tAlpha = Math.min(1, ob.telegraph/0.5);
      const blindMod = state.activeModifier==="blind_approach" ? 0.6 : 1;
      const alpha = tAlpha * 0.7 * blindMod;

      if (ob.type==="bulkhead" || ob.type==="splice") {
        // Amber line at top of screen for each blocked lane
        for (const lane of ob.lanes) {
          const lx = state.trackX + lane*state.laneW;
          ctx.globalAlpha = alpha;
          ctx.fillStyle   = "#FF8C42";
          ctx.fillRect(lx+4, 0, state.laneW-8, 3);
        }
      }

      if (ob.type==="convoy" && ob.convoyLead) {
        // "×3" label at top
        const lx = state.trackX + ob.lanes[0]*state.laneW;
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = C.reward;
        ctx.font        = "700 11px 'DM Mono', monospace";
        ctx.textAlign   = "center";
        ctx.fillText("×3", lx + state.laneW/2, 16);
      }

      if (ob.type==="drift" && ob.telegraphDir !== undefined) {
        // Arrow at top of screen
        const arrow = ob.telegraphDir > 0 ? "→" : "←";
        const lx    = state.trackX + ob.lanes[0]*state.laneW;
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = C.wake;
        ctx.font        = "700 13px 'DM Mono', monospace";
        ctx.textAlign   = "center";
        ctx.fillText(arrow, lx + state.laneW/2, 16);
      }

      if (ob.type==="mirror") {
        // Inward arrows on each block
        for (const lane of ob.lanes) {
          const lx    = state.trackX + lane*state.laneW;
          const arrow = lane <= 2 ? "→" : "←";
          ctx.globalAlpha = alpha;
          ctx.fillStyle   = C.wake;
          ctx.font        = "700 11px 'DM Mono', monospace";
          ctx.textAlign   = "center";
          ctx.fillText(arrow, lx + state.laneW/2, ob.y + ob.h/2);
        }
      }

      // Phantom: pulsing opacity handled in drawObstacles via ob.opacity
      // Pulse: red flash handled in drawObstacles via ob.jumpWarning
    }
    ctx.restore();
  }

  // ── Obstacles ────────────────────────────────────────────────────────────────

  function drawObstacles(now) {
    ctx.save();
    for (const ob of state.obstacles) {
      if (ob.type==="gravity_well") { drawGravityWell(ob,now); continue; }
      const obAlpha = ob.type==="phantom" ? ob.opacity : 1;

      for (const lane of ob.lanes) {
        const ox=state.trackX+lane*state.laneW+8, ow=state.laneW-16, oy=ob.y-ob.h/2;
        ctx.globalAlpha = obAlpha * (ob.fake ? 0.85 : 1);

        if (ob.type==="echoes") {
          // Real: #E8344A, Fake: slightly warmer #E85044
          const col = ob.fake ? ob.fakeColor : C.danger;
          const g   = ctx.createLinearGradient(ox,oy,ox+ow,oy+ob.h);
          g.addColorStop(0, col); g.addColorStop(1,"#230010");
          ctx.fillStyle = g;
          roundRect(ctx,ox,oy,ow,ob.h,6); ctx.fill();
          if (PERF.shadowBlur) { ctx.shadowColor=col; ctx.shadowBlur=12; }
          ctx.fillStyle=C.reward; ctx.globalAlpha=(obAlpha*0.85)*0.72;
          ctx.fillRect(ox+4,oy,ow-8,3);
          ctx.globalAlpha=1; ctx.shadowBlur=0;
        } else if (ob.type==="bulkhead"||ob.type==="splice") {
          const g=ctx.createLinearGradient(ox,oy,ox+ow,oy+ob.h);
          g.addColorStop(0,C.danger); g.addColorStop(1,"#230010");
          ctx.fillStyle=g;
          roundRect(ctx,ox,oy,ow,ob.h,6); ctx.fill();
          if (PERF.shadowBlur) { ctx.shadowColor=C.danger; ctx.shadowBlur=12; }
          ctx.fillStyle=ob.isWeakpoint?C.perfect:C.reward;
          ctx.globalAlpha=obAlpha*0.72; ctx.fillRect(ox+4,oy,ow-8,3);
          ctx.globalAlpha=1; ctx.shadowBlur=0;
        } else if (ob.type==="convoy") {
          ctx.fillStyle=C.danger; ctx.globalAlpha=obAlpha;
          roundRect(ctx,ox,oy,ow,ob.h,4); ctx.fill();
          ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.fillRect(ox,oy,ow,2);
        } else if (ob.type==="drift") {
          // Ghost trail to show movement direction
          for (let g=1; g<=3; g++) {
            const gox=state.trackX+(ob.laneFloat-ob.driftDir*g*0.25)*state.laneW+8;
            ctx.globalAlpha=obAlpha*(0.15-g*0.04); ctx.fillStyle=C.danger;
            roundRect(ctx,gox,oy,ow,ob.h,4); ctx.fill();
          }
          ctx.globalAlpha=obAlpha; ctx.fillStyle=C.danger;
          roundRect(ctx,ox,oy,ow,ob.h,6); ctx.fill();
          ctx.fillStyle=C.reward; ctx.globalAlpha=obAlpha*0.72; ctx.fillRect(ox+4,oy,ow-8,3);
        } else if (ob.type==="pulse") {
          ctx.globalAlpha=obAlpha; ctx.fillStyle=C.danger;
          roundRect(ctx,ox,oy,ow,ob.h,6); ctx.fill();
          if (ob.jumpWarning) {
            // Red flash sides
            ctx.globalAlpha=0.85; ctx.fillStyle=C.danger;
            ctx.fillRect(ox,oy,4,ob.h); ctx.fillRect(ox+ow-4,oy,4,ob.h);
          }
          ctx.fillStyle=C.reward; ctx.globalAlpha=obAlpha*0.72; ctx.fillRect(ox+4,oy,ow-8,3);
        } else if (ob.type==="mirror") {
          ctx.globalAlpha=obAlpha; ctx.fillStyle=C.danger;
          roundRect(ctx,ox,oy,ow,ob.h,6); ctx.fill();
          ctx.fillStyle=C.reward; ctx.globalAlpha=obAlpha*0.72; ctx.fillRect(ox+4,oy,ow-8,3);
        } else if (ob.type==="gate") {
          ctx.globalAlpha=obAlpha;
          const g2=ctx.createLinearGradient(ox,oy,ox+ow,oy+ob.h);
          g2.addColorStop(0,C.danger); g2.addColorStop(1,"#230010");
          ctx.fillStyle=g2; roundRect(ctx,ox,oy,ow,ob.h,6); ctx.fill();
          ctx.fillStyle=C.reward; ctx.globalAlpha=obAlpha*0.72; ctx.fillRect(ox+4,oy,ow-8,3);
          if (ob.gapHighlightTimer > 0) {
            const gapX=state.trackX+ob.gapLane*state.laneW;
            ctx.globalAlpha=ob.gapHighlightTimer*0.8;
            ctx.fillStyle=ob.isWeakpoint?(state.bossPhase===3?"rgba(160,255,180,0.2)":"rgba(160,255,180,0.15)"):"rgba(200,240,255,0.15)";
            ctx.fillRect(gapX,oy-20,state.laneW,ob.h+40);
          }
        } else {
          ctx.globalAlpha=obAlpha; ctx.fillStyle=C.danger;
          roundRect(ctx,ox,oy,ow,ob.h,6); ctx.fill();
          ctx.fillStyle=C.reward; ctx.globalAlpha=obAlpha*0.72; ctx.fillRect(ox+4,oy,ow-8,3);
        }
        ctx.globalAlpha=1; ctx.shadowBlur=0;
      }

      // Mirror centre line
      if (ob.type==="mirror" && ob.lanes.length===2) {
        ctx.strokeStyle="rgba(200,240,255,0.3)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(laneCenter(ob.lanes[0]),ob.y); ctx.lineTo(laneCenter(ob.lanes[1]),ob.y); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawGravityWell(ob, now) {
    ctx.save();
    const cx=state.w/2, cy=ob.y, t=(now||0)*2;
    for (let i=3; i>=1; i--) {
      const r=80*(i/3)*(0.85+0.15*Math.sin(t+i));
      ctx.globalAlpha=0.08; ctx.strokeStyle=C.reward; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha=0.5; ctx.fillStyle=C.reward;
    ctx.beginPath(); ctx.arc(cx,cy,6,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ── Shards ───────────────────────────────────────────────────────────────────

  function drawShards(now) {
    ctx.save();
    for (const shard of state.shards) {
      const x=laneCenter(shard.lane), r=(shard.rare?12:9)+Math.sin(shard.pulse)*2;
      ctx.save(); ctx.translate(x,shard.y); ctx.rotate(Math.PI/4);
      if (PERF.shadowBlur) { ctx.shadowColor=shard.rare?C.wake:C.reward; ctx.shadowBlur=18; }
      ctx.fillStyle=shard.rare?C.wake:C.reward;
      roundRect(ctx,-r,-r,r*2,r*2,3); ctx.fill(); ctx.shadowBlur=0;
      ctx.globalAlpha=0.38; ctx.fillStyle=shard.rare?C.danger:C.ghost;
      ctx.fillRect(-2,-r,4,r*2); ctx.fillRect(-r,-2,r*2,4);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Player ───────────────────────────────────────────────────────────────────

  function drawPlayer(now) {
    if (state.runEnded) return;
    const skin       = selectedSkin();
    const tier       = rarityTier(skin);
    const bob        = Math.sin((now||0)*8)*2;
    const x          = state.playerX;
    const y          = state.playerY + bob;
    const inv        = state.invincible > 0 && Math.floor((now||0)*16)%2===0;
    const overdriving= state.overdrive > 0;
    const bodyColor  = overdriving ? C.reward : skin.color;
    const trailColor = overdriving ? C.boost  : C.wake;
    const filamentW  = overdriving ? 4 : (tier >= 1 ? 2.5 : 1.5); // Rare+: wider filaments
    const trailLen   = overdriving ? 90 : 60;
    const trailAlpha = overdriving ? 0.9 : 0.7;

    ctx.save();
    if (inv) ctx.globalAlpha = 0.5;

    // Mythic: slow ±5° rotation on 0.8s sine
    let rot = 0;
    if (tier >= 4) rot = Math.sin((now||0)*(2*Math.PI/0.8)) * (5 * Math.PI/180);

    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);

    // Filament trails
    for (const side of [-1,1]) {
      const tx = side * 10;
      const grad = ctx.createLinearGradient(tx,18,tx,18+trailLen);
      grad.addColorStop(0, trailColor); grad.addColorStop(1,"rgba(0,0,0,0)");
      ctx.globalAlpha=trailAlpha; ctx.strokeStyle=trailColor;
      ctx.lineWidth=filamentW; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(tx,14); ctx.lineTo(tx+(side*Math.sin((now||0)*12)*3), 18+trailLen); ctx.stroke();
    }

    ctx.globalAlpha=1;
    if (PERF.shadowBlur) { ctx.shadowColor=overdriving?C.boost:skin.color; ctx.shadowBlur=overdriving?36:20; }
    ctx.fillStyle=bodyColor;
    // Clutch: scale player up by clutchScale
    const cs = state.clutchScale;
    drawTearPath(ctx, 0, 0, 22*cs, 38*cs); ctx.fill();
    ctx.shadowBlur=0;

    // Inner highlight
    ctx.fillStyle="#ffffff"; ctx.globalAlpha=0.7;
    drawTearPath(ctx, 0, -4*cs, 10*cs, 16*cs); ctx.fill(); ctx.globalAlpha=1;

    // Boost ring pulse
    if (overdriving) {
      const ring=state.overdrive%0.32, rp=ring/0.32;
      const rw=40+rp*40, rh=12+rp*12;
      ctx.globalAlpha=(1-rp)*0.55; ctx.strokeStyle=C.boost; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(0,-20,rw/2,rh/2,0,0,Math.PI*2); ctx.stroke();
    }

    // Modifier tag
    if (state.activeModifier) {
      ctx.globalAlpha=0.4; ctx.fillStyle=C.muted;
      ctx.font="700 9px 'DM Mono',monospace"; ctx.textAlign="center";
      ctx.fillText(state.activeModifier.toUpperCase().slice(0,4), 0, -50);
    }

    ctx.restore();
  }

  // ── Clutch canvas countdown ──────────────────────────────────────────────────

  function drawClutchCountdown(now) {
    if (!state.clutchActive) return;
    const frac     = clamp(state.clutchTimer/18, 0, 1);
    const cx       = state.playerX;
    const cy       = state.playerY - 50;
    const r        = 28;

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth   = 3;
    ctx.lineCap     = "round";

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.globalAlpha = 0.15;
    ctx.stroke();

    // Depleting arc (clockwise from top)
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + frac*Math.PI*2, false);
    ctx.stroke();

    ctx.restore();
  }

  // ── Wake strokes (drawing) ───────────────────────────────────────────────────

  function drawWakes(now) {
    ctx.save();
    for (const w of state.wakes) {
      const alpha = w.life/w.maxLife;
      const width = (w.secondary?4:18) * w.scale * alpha;
      // Clutch: white burst instead of standard
      ctx.globalAlpha   = Math.max(0, w.secondary ? alpha*0.3 : alpha*0.7);
      ctx.strokeStyle   = w.color;
      ctx.lineWidth     = Math.max(0.5, width);
      ctx.lineCap       = "round";
      ctx.beginPath(); ctx.moveTo(w.x,w.y); ctx.quadraticCurveTo(w.cx,w.cy,w.ex,w.ey); ctx.stroke();
    }
    ctx.restore();
  }

  // ── Particles ────────────────────────────────────────────────────────────────

  function drawParticles() {
    ctx.save();
    for (const p of state.particles) {
      const alpha=Math.max(0,p.life*2.0);
      ctx.globalAlpha=alpha; ctx.fillStyle=p.color;
      if (p.isFlash) {
        ctx.globalAlpha=p.life*4; ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
      } else if (p.isRing) {
        ctx.globalAlpha=alpha; ctx.strokeStyle=p.color; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.ringR||0,0,Math.PI*2); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawSparks() {
    ctx.save();
    for (const s of state.sparks) {
      ctx.globalAlpha=Math.max(0,s.life); ctx.strokeStyle=s.color; ctx.lineWidth=2;
      if (s.isLine) {
        ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.x+(s.vx||0)*0.06,s.y+(s.vy||0)*0.06); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.x,s.y+22); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── Fragments ────────────────────────────────────────────────────────────────

  function drawFragments(now) {
    if (!state.fragments.length) return;
    ctx.save();
    for (const f of state.fragments) {
      const alpha=Math.max(0, f.life/f.maxLife);
      ctx.globalAlpha=alpha; ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.rot);
      ctx.fillStyle=f.color;
      drawTearPath(ctx,0,0,22*f.scale,36*f.scale); ctx.fill();
      ctx.strokeStyle=C.wake; ctx.lineWidth=1; ctx.globalAlpha=alpha*0.5;
      ctx.beginPath(); ctx.moveTo(0,14*f.scale); ctx.lineTo(0,14*f.scale+20*alpha); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Messages ─────────────────────────────────────────────────────────────────

  function drawMessages() {
    ctx.save();
    ctx.font="800 15px 'DM Mono', monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
    for (const m of state.messages) {
      ctx.globalAlpha=Math.max(0,Math.min(1,m.life*2)); ctx.fillStyle=m.color;
      if (PERF.shadowBlur) { ctx.shadowColor=m.color; ctx.shadowBlur=10; }
      ctx.fillText(m.text, m.x, m.y);
    }
    ctx.shadowBlur=0;
    ctx.restore();
  }

  // ── Boost cinema ─────────────────────────────────────────────────────────────

  function drawBoostCinema(now) {
    if (state.boostCinema<=0) return;
    const elapsed = 2.0-state.boostCinema;
    ctx.save();
    if (elapsed<0.08) {
      ctx.globalAlpha=(1-(elapsed/0.08))*0.88; ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,state.w,state.h);
    } else if (elapsed<0.2) {
      const pct=1-((elapsed-0.08)/0.12);
      ctx.globalAlpha=pct*0.55; ctx.strokeStyle="#ffffff"; ctx.lineWidth=1.5;
      for (let i=0; i<12; i++) {
        const a=(i/12)*Math.PI*2, len=60+Math.random()*80;
        const sx=state.playerX+Math.cos(a)*20, sy=state.playerY+Math.sin(a)*20;
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+Math.cos(a)*len,sy+Math.sin(a)*len); ctx.stroke();
      }
    } else if (state.boostCinema<0.1) {
      ctx.globalAlpha=(state.boostCinema/0.1)*0.55; ctx.fillStyle=C.reward; ctx.fillRect(0,0,state.w,state.h);
    }
    if (elapsed>0.2 && state.boostCinema>0.1) { ctx.globalAlpha=0.06; ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,state.w,state.h); }
    ctx.restore();
  }

  function drawStageBeam(now) {
    if (state.stageBeam<=0) return;
    const pct=1-(state.stageBeam/0.4), beamY=pct*state.h*1.4-80;
    ctx.save(); ctx.globalAlpha=Math.sin(Math.min(pct*Math.PI,Math.PI))*0.8; ctx.fillStyle=C.perfect;
    ctx.fillRect(0,beamY,state.w,4); ctx.restore();
  }

  function drawBossReveal(now) {
    if (state.bossReveal<=0) return;
    const elapsed=1.4-state.bossReveal;
    ctx.save();
    ctx.globalAlpha=Math.min(elapsed/0.6,1)*0.12; ctx.fillStyle=C.danger; ctx.fillRect(0,0,state.w,state.h);
    if (elapsed>0.3) {
      const te=elapsed-0.3, fi=Math.min(te/0.4,1), dy=state.h/2-te*30;
      ctx.globalAlpha=fi*(1-Math.max(0,(te-0.4)/0.7));
      ctx.fillStyle=C.danger; ctx.font="700 2.8rem 'DM Mono', monospace";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(state.bossRevealName.replace("Boss:","").trim(), state.w/2, dy);
    }
    ctx.restore();
  }

  function drawBossDefeatBeams(now) {
    if (state.bossDefeatPhase===0) return;
    ctx.save();
    if (state.bossDefeatPhase===1) {
      for (let i=0; i<8; i++) {
        const a=(i/8)*Math.PI*2;
        ctx.strokeStyle=C.perfect; ctx.lineWidth=2; ctx.globalAlpha=0.8;
        ctx.beginPath(); ctx.moveTo(state.playerX,state.playerY);
        ctx.lineTo(state.playerX+Math.cos(a)*200,state.playerY+Math.sin(a)*200); ctx.stroke();
      }
    } else if (state.bossDefeatPhase===2) {
      const progress=Math.min(1,(state.bossDefeatTimer-0.4)/0.8), ringR=progress*Math.max(state.w,state.h);
      ctx.globalAlpha=(1-progress)*0.6; ctx.strokeStyle=C.perfect; ctx.lineWidth=ringR*2;
      ctx.beginPath(); ctx.arc(state.w/2,state.h/2,ringR,0,Math.PI*2); ctx.stroke();
      if (state.bossRevealName) {
        ctx.globalAlpha=progress*(1-progress)*4; ctx.fillStyle=C.perfect;
        ctx.font="700 2rem 'DM Mono',monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(state.bossRevealName.replace("Boss:","").trim(), state.w/2, state.h*0.3-progress*40);
      }
    } else if (state.bossDefeatPhase===3) {
      ctx.globalAlpha=0.7; ctx.fillStyle=C.reward;
      ctx.font="800 1.4rem 'DM Mono',monospace"; ctx.textAlign="center";
      ctx.fillText(`${Math.floor(state.combo)}× COMBO`, state.w/2, state.h*0.45);
    }
    ctx.restore();
  }

  function drawMenuGhost(now) {
    if (!menuGhost.active) return;
    ctx.save(); ctx.globalAlpha=0.14; ctx.translate(menuGhost.x,state.playerY); ctx.fillStyle=C.ghost;
    drawTearPath(ctx,0,0,22,38); ctx.fill();
    ctx.strokeStyle=C.wake; ctx.lineWidth=1.5; ctx.globalAlpha=0.08;
    for (const side of[-1,1]) { ctx.beginPath(); ctx.moveTo(side*10,14); ctx.lineTo(side*10,80); ctx.stroke(); }
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §43  CANVAS UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  function roundRect(context,x,y,w,h,r) {
    const radius = Math.min(r, Math.abs(w)/2, Math.abs(h)/2);
    context.beginPath();
    context.moveTo(x+radius,y); context.arcTo(x+w,y,x+w,y+h,radius);
    context.arcTo(x+w,y+h,x,y+h,radius); context.arcTo(x,y+h,x,y,radius);
    context.arcTo(x,y,x+w,y,radius); context.closePath();
  }

  function drawTearPath(context,cx,cy,hw,hh) {
    context.beginPath();
    context.moveTo(cx,cy-hh);
    context.bezierCurveTo(cx+hw,cy-hh*0.4, cx+hw*0.7,cy+hh*0.5, cx,cy+hh);
    context.bezierCurveTo(cx-hw*0.7,cy+hh*0.5, cx-hw,cy-hh*0.4, cx,cy-hh);
    context.closePath();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §44  AUDIO
  // ═══════════════════════════════════════════════════════════════════════════

  function ensureAudio() {
    if (!save.sound || audioCtx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
  }

  function playSound(type) {
    if (!save.sound || !audioCtx) return;
    const map = {
      start:  [220,360,0.09], select: [420,560,0.04], buy:    [360,720,0.12],
      shard:  [660,940,0.06], boost:  [140,680,0.18], break:  [120,80,0.08],
      crash:  [90,42,0.2],    error:  [160,120,0.1],
    };
    const [from,to,duration] = map[type] || map.select;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    const n   = audioCtx.currentTime;
    osc.type  = type==="crash" ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(from, n);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1,to), n+duration);
    gain.gain.setValueAtTime(0.0001, n);
    gain.gain.exponentialRampToValueAtTime(type==="boost"?0.16:0.07, n+0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, n+duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(n); osc.stop(n+duration+0.02);
  }

  // Dynamic near-miss sound based on streak state
  function playNearMissSound(streakState) {
    if (!save.sound || !audioCtx) return;
    const n = audioCtx.currentTime;

    // Base triangle sound
    const base = audioCtx.createOscillator(), gBase = audioCtx.createGain();
    base.type = "triangle";
    base.frequency.setValueAtTime(580, n);
    base.frequency.exponentialRampToValueAtTime(860, n+0.05);
    gBase.gain.setValueAtTime(0.0001, n); gBase.gain.exponentialRampToValueAtTime(0.07, n+0.01);
    gBase.gain.exponentialRampToValueAtTime(0.0001, n+0.08);
    base.connect(gBase); gBase.connect(audioCtx.destination);
    base.start(n); base.stop(n+0.1);

    if (streakState==="threading") {
      // Subtle shimmer at 880Hz
      const shimmer = audioCtx.createOscillator(), gS = audioCtx.createGain();
      shimmer.type = "sine"; shimmer.frequency.value = 880;
      gS.gain.setValueAtTime(0.0001,n); gS.gain.exponentialRampToValueAtTime(0.03,n+0.01);
      gS.gain.exponentialRampToValueAtTime(0.0001,n+0.06);
      shimmer.connect(gS); gS.connect(audioCtx.destination);
      shimmer.start(n); shimmer.stop(n+0.08);
    }

    if (streakState==="razor") {
      // Rising pitch: each near-miss in this state is tracked by nearMissStreak
      const pitchBase = 600 + Math.min(600, (state.nearMissStreak-5)*50);
      const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
      osc.type = "triangle"; osc.frequency.setValueAtTime(pitchBase, n);
      osc.frequency.exponentialRampToValueAtTime(Math.min(1200, pitchBase+100), n+0.06);
      g.gain.setValueAtTime(0.0001,n); g.gain.exponentialRampToValueAtTime(0.05,n+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,n+0.08);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(n); osc.stop(n+0.1);
    }

    if (streakState==="ghost_line") {
      // Pure sine at 1400Hz + sub bass thud
      const sine = audioCtx.createOscillator(), gSine = audioCtx.createGain();
      sine.type="sine"; sine.frequency.value=1400;
      gSine.gain.setValueAtTime(0.0001,n); gSine.gain.exponentialRampToValueAtTime(0.06,n+0.01);
      gSine.gain.exponentialRampToValueAtTime(0.0001,n+0.15);
      sine.connect(gSine); gSine.connect(audioCtx.destination);
      sine.start(n); sine.stop(n+0.17);

      const sub = audioCtx.createOscillator(), gSub = audioCtx.createGain();
      sub.type="sine"; sub.frequency.value=60;
      gSub.gain.setValueAtTime(0.0001,n); gSub.gain.exponentialRampToValueAtTime(0.08,n+0.01);
      gSub.gain.exponentialRampToValueAtTime(0.0001,n+0.08);
      sub.connect(gSub); gSub.connect(audioCtx.destination);
      sub.start(n); sub.stop(n+0.1);
    }

    if (streakState==="untouchable") {
      // Reverb tail: near-miss sounds in large space
      try {
        const irLen     = Math.floor(audioCtx.sampleRate * 0.3);
        const irBuffer  = audioCtx.createBuffer(1, irLen, audioCtx.sampleRate);
        const irData    = irBuffer.getChannelData(0);
        for (let i=0; i<irLen; i++) irData[i] = (Math.random()*2-1) * Math.pow(1-i/irLen, 2);
        const conv = audioCtx.createConvolver();
        conv.buffer = irBuffer;
        const osc2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();
        osc2.type="triangle"; osc2.frequency.setValueAtTime(1100,n); osc2.frequency.exponentialRampToValueAtTime(1400,n+0.06);
        g2.gain.setValueAtTime(0.0001,n); g2.gain.exponentialRampToValueAtTime(0.09,n+0.01);
        g2.gain.exponentialRampToValueAtTime(0.0001,n+0.08);
        osc2.connect(g2); g2.connect(conv); conv.connect(audioCtx.destination);
        osc2.start(n); osc2.stop(n+0.12);
      } catch {}
    }
  }

  // Clutch activate/deactivate sweep
  function playSweep(freqFrom, freqTo, duration) {
    if (!save.sound || !audioCtx) return;
    const n = audioCtx.currentTime;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type="sine";
    osc.frequency.setValueAtTime(freqFrom, n);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1,freqTo), n+duration);
    gain.gain.setValueAtTime(0.0001,n); gain.gain.exponentialRampToValueAtTime(0.22,n+0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001,n+duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(n); osc.stop(n+duration+0.02);
  }

  // PB two-note chord — only plays on personal best
  function playPbChord() {
    if (!save.sound || !audioCtx) return;
    const n    = audioCtx.currentTime;
    const dur  = 0.6;
    for (const freq of [660, 880]) {
      const osc  = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type   = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001,n); gain.gain.exponentialRampToValueAtTime(0.1,n+0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001,n+dur);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(n); osc.stop(n+dur+0.02);
    }
  }

  function vibrate(pattern) { if (save.haptics && navigator.vibrate) navigator.vibrate(pattern); }

  // ═══════════════════════════════════════════════════════════════════════════
  // §45  AD BRIDGE
  // ═══════════════════════════════════════════════════════════════════════════

  const AdBridge = {
    async showRewarded(placement) {
      const admob = window.Capacitor?.Plugins?.AdMob;
      const unit  = window.PULSEBREAK_AD_UNITS?.rewarded || AD_UNITS.rewarded;
      if (admob && unit && !unit.startsWith("REPLACE_")) {
        try {
          if (typeof admob.prepareRewardVideoAd==="function") await admob.prepareRewardVideoAd({adId:unit,isTesting:false});
          if (typeof admob.showRewardVideoAd==="function") { await admob.showRewardVideoAd(); return true; }
        } catch {}
      }
      return showPreviewAd(`Rewarded ${placement}`);
    }
  };

  function showPreviewAd(title) {
    return new Promise(resolve => {
      const start = performance.now(); let done = false;
      els.adModal.classList.add("active"); els.adModal.setAttribute("aria-hidden","false");
      els.adDone.disabled = true;
      document.getElementById("adTitle").textContent = title;
      els.adMeter.style.width = "0%";
      function tick(now) {
        if (done) return;
        const pct = clamp((now-start)/1800, 0, 1);
        els.adMeter.style.width = `${pct*100}%`;
        if (pct >= 1) { els.adDone.disabled=false; els.adDone.focus(); return; }
        requestAnimationFrame(tick);
      }
      const finish = () => {
        if (done || els.adDone.disabled) return;
        done = true;
        els.adModal.classList.remove("active"); els.adModal.setAttribute("aria-hidden","true");
        els.adDone.removeEventListener("click",finish);
        resolve(true);
      };
      els.adDone.addEventListener("click", finish);
      requestAnimationFrame(tick);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §46  CHALLENGE CODES
  // ═══════════════════════════════════════════════════════════════════════════

  function makeChallengeCode() {
    const zone  = save.selectedZone.replace(/_/g,"-").toUpperCase().slice(0,10);
    const seed  = (save.lastRun?.seed || hashString(dayKey())).toString(16).toUpperCase().slice(0,6);
    const stage = String(save.lastRun?.stageReached||1).padStart(3,"0");
    const score = String(save.lastRun?.score||save.best||1000);
    const check = hashString(`${zone}-${seed}-${stage}-${score}`).toString(36).toUpperCase().slice(0,3);
    return `PBK-${zone}-${seed}-${stage}-${score}-${check}`;
  }
  function parseChallengeCode(code) {
    const parts = code.trim().toUpperCase().split("-");
    if (parts[0]!=="PBK" || parts.length<6) return null;
    const score = parseInt(parts[parts.length-2],10);
    const stage = parseInt(parts[parts.length-3],10);
    const seed  = parseInt(parts[parts.length-4],16);
    if (!Number.isFinite(score)||!Number.isFinite(stage)||!Number.isFinite(seed)) return null;
    return { seed, score, stage };
  }
  function loadChallenge() {
    const parsed = parseChallengeCode(els.challengeInput.value);
    if (!parsed) return toast("Bad challenge code");
    save.challenge = parsed; persist(); toast("Challenge loaded"); startRun("challenge");
  }
  function copyText(text, success) {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(()=>toast(success)).catch(()=>toast(text));
    else toast(text);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §47  INPUT HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  const SWIPE_THRESHOLD = 22;

  function handlePointerDown(event) {
    if (state.screen!=="playing") return;
    ensureAudio();
    state.pointerId    = event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    state.swipeStartX  = event.clientX;
    state.swipeStartLane = state.targetLane;
    if (save.selectedZone!=="void_network" || state.commitLock<=0)
      state.targetLane = laneFromX(event.clientX);
  }

  function handlePointerMove(event) {
    if (state.screen!=="playing") return;
    if (state.pointerId!==null && event.pointerId!==state.pointerId) return;
    if (save.selectedZone==="void_network" && state.commitLock>0) return;
    const dx = event.clientX-(state.swipeStartX??event.clientX);
    if (Math.abs(dx) >= SWIPE_THRESHOLD && state.swipeStartLane!==null) {
      const laneDelta = Math.round(dx/state.laneW);
      const newLane   = clamp((state.swipeStartLane??2)+laneDelta, 0, state.lanes-1);
      if (newLane !== state.targetLane) {
        if (save.selectedZone==="void_network") state.commitLock=0.6;
        state.targetLane = newLane;
      }
    } else {
      state.targetLane = laneFromX(event.clientX);
    }
  }

  function handlePointerUp(event) {
    if (event.pointerId===state.pointerId) { state.pointerId=null; state.swipeStartX=null; state.swipeStartLane=null; }
  }

  function handleKey(event) {
    if (event.key==="ArrowLeft"||event.key.toLowerCase()==="a") {
      if (save.selectedZone!=="void_network"||state.commitLock<=0) {
        state.targetLane=clamp(state.targetLane-1,0,state.lanes-1);
        if (save.selectedZone==="void_network") state.commitLock=0.6;
      }
    }
    if (event.key==="ArrowRight"||event.key.toLowerCase()==="d") {
      if (save.selectedZone!=="void_network"||state.commitLock<=0) {
        state.targetLane=clamp(state.targetLane+1,0,state.lanes-1);
        if (save.selectedZone==="void_network") state.commitLock=0.6;
      }
    }
    if (event.key===" "||event.key==="ArrowUp"||event.key.toLowerCase()==="w") { event.preventDefault(); triggerBoost(); }
    if (event.key==="Escape") state.screen==="playing" ? pauseGame() : resumeGame();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §48  TOAST / MISC
  // ═══════════════════════════════════════════════════════════════════════════

  function toast(text) {
    els.toast.textContent = text;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 1600);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §49  MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════

  function loop(now) {
    const dt = Math.min(0.033, (now-lastFrame)/1000 || 0);
    lastFrame = now;
    update(dt);
    draw(now/1000);
    requestAnimationFrame(loop);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §50  EVENT WIRING
  // ═══════════════════════════════════════════════════════════════════════════

  document.querySelectorAll(".tab-button").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));

  // Play buttons
  document.getElementById("playBtn").addEventListener("click",  () => startRun("classic"));
  document.getElementById("dailyBtn").addEventListener("click", () => startRun("daily"));
  document.getElementById("ghostBtn").addEventListener("click", () => save.ghosts[save.selectedZone] ? startRun("ghost") : toast("Set a ghost first"));
  document.getElementById("challengeBtn").addEventListener("click", loadChallenge);

  // Navigation
  document.getElementById("pauseBtn").addEventListener("click",     pauseGame);
  document.getElementById("resumeBtn").addEventListener("click",    resumeGame);
  document.getElementById("pauseMenuBtn").addEventListener("click", () => setScreen("menu"));
  document.getElementById("restartBtn").addEventListener("click",   () => startRun(state.mode));
  document.getElementById("gameOverMenuBtn").addEventListener("click", () => setScreen("menu"));
  document.getElementById("reviveBtn").addEventListener("click",    reviveRun);

  // Modifier screen (post-run nudge path)
  document.getElementById("modifierConfirmBtn").addEventListener("click", () => {
    if (!selectedModifierCard) return;
    state.activeModifier = selectedModifierCard.id;
    document.getElementById("modifierScreen").classList.remove("active");
    startRun("classic");
  });
  document.getElementById("modifierSkipBtn").addEventListener("click", () => {
    state.activeModifier = null;
    document.getElementById("modifierScreen").classList.remove("active");
    startRun("classic");
  });

  // Post-run modifier banners
  const modBannerResult = document.getElementById("modifierChallengeBannerResult");
  if (modBannerResult) modBannerResult.addEventListener("click", () => { modBannerResult.classList.remove("show"); showModifierScreen(); });
  const modBannerMenu   = document.getElementById("modifierChallengeBanner");
  if (modBannerMenu)   modBannerMenu.addEventListener("click",   () => { modBannerMenu.classList.remove("show");   showModifierScreen(); });

  // Rewards
  els.doubleReward.addEventListener("click", doubleRunReward);
  els.share.addEventListener("click", shareRun);
  els.lucky.addEventListener("click", luckySpin);
  els.doubleLast.addEventListener("click", doubleRunReward);
  els.boost.addEventListener("click", triggerBoost);

  // Settings
  els.sound.addEventListener("click", () => {
    save.sound = !save.sound;
    if (!save.sound && audioCtx) { audioCtx.close(); audioCtx=null; }
    persist();
  });
  els.haptics.addEventListener("click", () => { save.haptics=!save.haptics; persist(); });

  // Starter pack
  const spBuy     = document.getElementById("starterPackBuyBtn");
  const spDismiss = document.getElementById("starterPackDismissBtn");
  if (spBuy)     spBuy.addEventListener("click",     () => openIAP("starter_pack", 5000, "₹99"));
  if (spDismiss) spDismiss.addEventListener("click", dismissStarterPack);

  // Share card modal
  const scDownload = document.getElementById("shareCardDownloadBtn");
  const scShare    = document.getElementById("shareCardShareBtn");
  const scDismiss  = document.getElementById("shareCardDismissBtn");
  if (scDownload) scDownload.addEventListener("click", downloadShareCard);
  if (scShare)    scShare.addEventListener("click",    nativeShareCard);
  if (scDismiss)  scDismiss.addEventListener("click",  dismissShareCard);

  // Season pass & coin bundles (all IAP stubs)
  initSeasonPassBanner();
  initCoinBundles();

  // Canvas input
  const passiveOpts = { passive:true };
  canvas.addEventListener("pointerdown",   handlePointerDown,  passiveOpts);
  canvas.addEventListener("pointermove",   handlePointerMove,  passiveOpts);
  canvas.addEventListener("pointerup",     handlePointerUp,    passiveOpts);
  canvas.addEventListener("pointercancel", handlePointerUp,    passiveOpts);
      window.addEventListener("keydown",        handleKey);
      window.addEventListener("resize",         resize);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && state.screen === "playing") pauseGame();
      });

      if ("serviceWorker" in navigator && location.protocol.startsWith("http"))
        navigator.serviceWorker.register("sw.js").catch(() => {});

      // ═══════════════════════════════════════════════════════════════════════
      // §51  INIT
      // ═══════════════════════════════════════════════════════════════════════

      ensureLiveSystems();
      resize();

      // Hide menu initially — boot screen shown first
      els.menu.classList.remove("active");

      persist();
      updateHud();
      menuGhost.active = false;

      // Start render loop first so boot canvas animates
      requestAnimationFrame(loop);

      // Then kick off boot screen
      initBootScreen();

})();
