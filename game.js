(() => {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────────
  // SIGNAL GHOST — Pulsebreak Visual Redesign
  //
  // Palette applied throughout:
  //   Ghost White  #E8EDF5  — player, UI text
  //   Breach Red   #E8344A  — danger / obstacles
  //   Amber Core   #FF8C42  — reward / shards
  //   Slate Void   #0A0B12  — background
  //   Signal Blue  #1A2340  — track / structure
  //   Wake Ice     #C8F0FF  — near-miss wake strokes
  //   Boost Orange #FF5500  — boost state only
  //   Perfect Mint #A0FFB4  — stage perfect only
  //
  // Key new systems:
  //   • Teardrop player with filament trails
  //   • Near-miss wake strokes (quadraticCurveTo brushmarks, 400ms decay)
  //   • Near-miss screen-edge lane flash
  //   • Circular SVG energy ring on boost button (energy = ring progress)
  //   • Obstacle families: Bulkhead / Spine / Crawler / Sentinel
  //   • Zone-specific atmosphere layers (parallax silhouettes, hex grid, tears…)
  //   • Combo visual escalation (size + color + flash thresholds)
  //   • Boost cinema: white flash → desaturate obstacles → speed-lines → reverse flash
  //   • Death: 12 teardrop fragments with individual filament trails
  //   • Stage-clear beam sweep
  //   • Score counter scaleY pulse on increase
  //   • Ambient idle ghost on menu canvas
  // ─────────────────────────────────────────────────────────────────────────────

  const STORAGE_KEY     = "pulsebreak.save.v2";
  const OLD_STORAGE_KEY = "pulsebreak.save.v1";
  const AD_UNITS        = { rewarded: "REPLACE_WITH_ADMOB_REWARDED_ID" };

  const canvas = document.getElementById("gameCanvas");
  const ctx    = canvas.getContext("2d", { alpha: false });

  // ── Performance tier ─────────────────────────────────────────────────────────
  const PERF = (() => {
    const mem   = navigator.deviceMemory       || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const isLowEnd  = mem <= 2 || cores <= 2;
    const isMidRange= !isLowEnd && (mem <= 4 || cores <= 4);
    return {
      shadowBlur:   !isLowEnd,
      maxParticles: isLowEnd ? 60  : isMidRange ? 110 : 160,
      maxSparks:    isLowEnd ? 24  : isMidRange ? 44  : 70,
      maxWakes:     isLowEnd ? 6   : isMidRange ? 12  : 20,
      burstScale:   isLowEnd ? 0.5 : isMidRange ? 0.75 : 1.0,
      dprCap:       isLowEnd ? 1   : 2,
    };
  })();

  // ── Colours (centralised) ────────────────────────────────────────────────────
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

  // ── DOM refs ─────────────────────────────────────────────────────────────────
  const els = {
    hud:            document.getElementById("hud"),
    menu:           document.getElementById("menuScreen"),
    pause:          document.getElementById("pauseScreen"),
    gameOver:       document.getElementById("gameOverScreen"),
    stage:          document.getElementById("stageText"),
    score:          document.getElementById("scoreText"),
    best:           document.getElementById("bestText"),
    energy:         document.getElementById("energyFill"),   // hidden, kept for compat
    level:          document.getElementById("levelText"),
    xp:             document.getElementById("xpText"),
    menuBest:       document.getElementById("menuBest"),
    coins:          document.getElementById("coinText"),
    cores:          document.getElementById("coreText"),
    runs:           document.getElementById("runText"),
    zoneGrid:       document.getElementById("zoneGrid"),
    skinGrid:       document.getElementById("skinGrid"),
    trailGrid:      document.getElementById("trailGrid"),
    boostGrid:      document.getElementById("boostGrid"),
    extraCosmetics: document.getElementById("extraCosmetics"),
    missionList:    document.getElementById("missionList"),
    dailyPanel:     document.getElementById("dailyPanel"),
    levelPanel:     document.getElementById("levelPanel"),
    skillTree:      document.getElementById("skillTree"),
    achievementList:document.getElementById("achievementList"),
    socialPanel:    document.getElementById("socialPanel"),
    challengeInput: document.getElementById("challengeInput"),
    finalScore:     document.getElementById("finalScore"),
    earnedCoins:    document.getElementById("earnedCoins"),
    finalShards:    document.getElementById("finalShards"),
    finalCombo:     document.getElementById("finalCombo"),
    finalStage:     document.getElementById("finalStage"),
    finalXp:        document.getElementById("finalXp"),
    finalMoment:    document.getElementById("finalMoment"),
    runMode:        document.getElementById("runModeText"),
    revive:         document.getElementById("reviveBtn"),
    doubleReward:   document.getElementById("doubleRewardBtn"),
    share:          document.getElementById("shareBtn"),
    boost:          document.getElementById("boostBtn"),
    boostRingFill:  document.getElementById("boostRingFill"),
    toast:          document.getElementById("toast"),
    adModal:        document.getElementById("adModal"),
    adMeter:        document.getElementById("adMeterFill"),
    adDone:         document.getElementById("adDoneBtn"),
    lucky:          document.getElementById("luckyBtn"),
    doubleLast:     document.getElementById("doubleBtn"),
    sound:          document.getElementById("soundBtn"),
    haptics:        document.getElementById("hapticsBtn"),
    scoreStrong:    document.querySelector("#scoreText"),
  };

  // Boost ring circumference for r=44: 2π×44 ≈ 276.5
  const RING_CIRC = 2 * Math.PI * 44;

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA — unchanged from original (zones, stages, skins, etc.)
  // ─────────────────────────────────────────────────────────────────────────────

  const RARITIES = {
    Common:    { color: C.ghost,   coin: [150, 600],     fragment: 0  },
    Rare:      { color: C.perfect, coin: [800, 2000],    fragment: 0  },
    Epic:      { color: C.spine,   coin: [3000, 7500],   fragment: 10 },
    Legendary: { color: C.reward,  coin: [12000, 18000], fragment: 35 },
    Mythic:    { color: "#ffffff", coin: [0, 0],          fragment: 80 }
  };

  const ZONES = [
    { id: "neon_city",        name: "Neon City",        color: C.wake,      unlockLevel: 1,  music: "synthwave",          hazard: "traffic walls",   theme: "street-level digital chase" },
    { id: "quantum_core",     name: "Quantum Core",     color: C.perfect,   unlockLevel: 8,  music: "reactor arps",       hazard: "pulse drains",    theme: "reactor interior"            },
    { id: "void_network",     name: "Void Network",     color: C.muted,     unlockLevel: 16, music: "minimal bass",       hazard: "vanishing tiles", theme: "deep network space"          },
    { id: "glitch_dimension", name: "Glitch Dimension", color: C.spine,     unlockLevel: 26, music: "bitcrushed pop",     hazard: "decoy shards",    theme: "broken simulation"           },
    { id: "singularity",      name: "Singularity",      color: C.boost,     unlockLevel: 38, music: "heavy gravity bass", hazard: "gravity wells",   theme: "gravity collapse"            },
    { id: "pulse_nexus",      name: "Pulse Nexus",      color: C.ghost,     unlockLevel: 55, music: "orchestral electro", hazard: "all hazards",     theme: "endgame pulse gate"          }
  ];

  const STAGES = [
    ["Calm Introduction",    "intro",     28, 1.00],
    ["Speed Lift",           "speed",     30, 1.10],
    ["Split Paths",          "split",     32, 1.14],
    ["Signal Drift",         "drift",     32, 1.18],
    ["Gatebreaker Mini Boss","mini",      36, 1.22],
    ["First Chaos Event",    "chaos",     34, 1.26],
    ["Boss: Metro Firewall", "boss",      42, 1.30],
    ["Aftershock",           "speed",     34, 1.36],
    ["Hazard Mix",           "mix",       36, 1.42],
    ["Elite Signal",         "elite",     38, 1.46],
    ["Blind Corners",        "drift",     38, 1.50],
    ["Overcharge",           "overcharge",38, 1.54],
    ["Compression",          "compress",  38, 1.58],
    ["Boss: Circuit Tyrant", "boss",      45, 1.64],
    ["Neon Rain",            "rain",      40, 1.68],
    ["Mirror Split",         "mirror",    40, 1.74],
    ["Elite Convoy",         "elite",     42, 1.78],
    ["Glitch Surge",         "chaos",     40, 1.84],
    ["Velocity Gate",        "speed",     42, 1.90],
    ["Mini Boss: Null Lock",  "mini",     44, 1.96],
    ["Boss: Void Sentinel",  "boss",      50, 2.02],
    ["Shard Fever",          "fever",     42, 2.08],
    ["Collapse Grid",        "collapse",  45, 2.14],
    ["Chaos Stack",          "chaos",     48, 2.22],
    ["Boss: Pulsebreaker",   "boss",      58, 2.32],
  ].map((r, i) => ({ number: i+1, name: r[0], kind: r[1], duration: r[2], speedMul: r[3] }));

  const LOGIN_REWARDS = [
    "250 coins","50 XP","1 core","300 coins","Common skin ticket","2 lucky tokens","5 rare fragments",
    "350 coins","80 XP","2 cores","5 trail fragments","450 coins","3 lucky tokens","Rare skin ticket",
    "600 coins","120 XP","3 cores","5 boost fragments","700 coins","5 epic fragments","5 theme fragments",
    "850 coins","180 XP","5 cores","5 sound fragments","1000 coins","10 epic fragments","3 legendary fragments",
    "8 cores","Legendary quest"
  ];

  const SKILL_NODES = [
    ["lane_snap","Lane Snap","Reflex","movement",5,250,0,"+3% lane response"],
    ["near_window","Near-Miss Window","Reflex","near",5,300,0,"+4px near-miss grace"],
    ["calm_start","Calm Start","Reflex","startShield",3,450,1,"+0.5s start guard"],
    ["boost_duration","Boost Duration","Pulse","boostDuration",6,500,1,"+0.12s boost"],
    ["boost_recharge","Boost Recharge","Pulse","boostRecharge",6,500,1,"+4% Pulse gain"],
    ["boost_score","Boost Break Score","Pulse","boostScore",5,650,2,"+6% break score"],
    ["combo_cap","Combo Cap","Score","comboCap",5,700,2,"+3 max combo"],
    ["perfect_stage","Perfect Stage","Score","perfectScore",5,500,1,"+7% perfect reward"],
    ["boss_score","Boss Multiplier","Score","bossScore",4,900,3,"+8% boss score"],
    ["coin_mult","Coin Multiplier","Economy","coinMult",5,600,1,"+5% run coins"],
    ["shard_value","Shard Value","Economy","shardValue",5,650,2,"+3% shard value"],
    ["mission_bonus","Mission Bonus","Economy","missionBonus",4,800,3,"+6% mission coins"],
    ["failsafe","Failsafe Shield","Survival","shield",5,1000,4,"Rank 5 grants shield"],
    ["extra_life","Extra Life","Survival","extraLife",1,3000,18,"One earned revive"],
    ["boss_guard","Boss Guard","Survival","bossGuard",4,1300,5,"Boss hit guard"],
    ["rare_spawn","Rare Spawn Chance","Discovery","rare",6,900,3,"+2% rare spawns"],
    ["blueprint","Blueprint Magnet","Discovery","blueprint",5,1200,4,"+3% blueprint odds"],
    ["lucky_quality","Lucky Quality","Discovery","lucky",4,1500,6,"Better spin floor"],
  ].map(r => ({ id: r[0], name: r[1], branch: r[2], bonus: r[3], ranks: r[4], baseCoins: r[5], baseCores: r[6], copy: r[7] }));

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
  ].map(r => ({ id: r[0], label: r[1], metric: r[2], target: r[3], reward: r[4] }));

  const WEEKLY_BANK = [
    ["weekly_score","Earn 30,000 score","score",30000,1200,8],
    ["weekly_shards","Collect 600 shards","shards",600,1000,8],
    ["weekly_boss","Defeat 5 bosses","bossesDefeated",5,1400,12],
    ["weekly_near","Trigger 300 near misses","nearMisses",300,1200,10],
    ["weekly_stage","Reach Stage 20 twice","stage20Runs",2,1500,14],
    ["weekly_ghost","Beat 3 ghosts","ghostWins",3,1300,10],
  ].map(r => ({ id: r[0], label: r[1], metric: r[2], target: r[3], xp: r[4], cores: r[5] }));

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
    const range = RARITIES[rarity].coin;
    const step  = range[1] ? (range[1]-range[0])/Math.max(1,rarity==="Common"?29:rarity==="Rare"?24:rarity==="Epic"?19:14) : 0;
    const offset= rarity==="Common"?i:rarity==="Rare"?i-30:rarity==="Epic"?i-55:rarity==="Legendary"?i-75:i-90;
    return {
      id: `skin_${String(n).padStart(3,"0")}`, name, rarity,
      color: COLOR_SET[i % COLOR_SET.length],
      accent: COLOR_SET[(i+3) % COLOR_SET.length],
      cost: Math.round(range[0]+step*offset),
      fragments: RARITIES[rarity].fragment+(rarity==="Mythic"?offset*6:0),
      unlockLevel: rarity==="Common"?1:rarity==="Rare"?6:rarity==="Epic"?18:rarity==="Legendary"?35:80
    };
  });

  const TRAILS        = makeCosmetics("trail",    ["Thin Line","Spark Dust","Data Thread","Ripple","Neon Ribbon","Scanline","Coin Burst","Shard Wake","Prism Trail","Glitch Tear","Gravity Arc","Overdrive Flame","Boss Aura","Nexus Path","Perfect Clear Trail","Ascension Wake","Eternal Pulse Trail"]);
  const BOOST_EFFECTS = makeCosmetics("boost_fx", ["Flash Ring","Shockwave","Split Beam","Pixel Break","Shard Nova","Gravity Snap","Firewall Burst","Whiteout","Ascension Break"]);
  const MENU_THEMES   = makeCosmetics("theme",    ["Neon City Rooftop","Quantum Reactor","Void Console","Glitch Arcade","Singularity Chamber","Pulse Nexus Gate","Seasonal Event Hub"]);
  const SOUND_PACKS   = makeCosmetics("sound",    ["Classic Pulse","Synthwave","Minimal Click","Glitch Pop","Quantum Bass","Boss Heavy","Calm Focus","Prestige Noise"]);
  const ACHIEVEMENTS  = buildAchievements();

 const DEFAULT_SAVE = {
    version:2,best:0,coins:0,xp:0,level:1,cores:0,fragments:0,
    streakTokens:0,ascensionMarks:0,runs:0,
    selectedZone:"neon_city",selectedSkin:"skin_001",selectedTrail:"trail_001",
    selectedBoost:"boost_fx_001",selectedTheme:"theme_001",selectedSound:"sound_001",
    unlocked:{
      skins:{"skin_001":true},trails:{"trail_001":true},
      boosts:{"boost_fx_001":true},themes:{"theme_001":true},sounds:{"sound_001":true}
    },
    skills:{},achievements:{},sound:true,haptics:true,
    missionDay:"",missions:[],weeklyKey:"",weekly:[],
    loginDay:1,loginStreak:0,lastLogin:"",dailyClaimed:"",
    adDay:"",adCounts:{},lastRun:null,ghosts:{},challenge:null,
    archive:[],
    circuit:{ points:0, resetDate:"", milestones:[5000,12000,22000,35000] },
    season:{ level:0, xp:0, hasSeason:false },
    stageDeathCounts:{},
    nearMissTutorialShown:false,
    stats:{
      runs:0,totalScore:0,totalShards:0,totalNearMisses:0,totalBoosts:0,
      hazardsBroken:0,bossesDefeated:0,stagesCleared:0,perfectStages:0,
      coinsEarned:0,skinsUnlocked:1,cosmeticsUnlocked:5,dailyMissions:0,
      weeklyChallenges:0,shares:0,ghostWins:0,highestStage:1,
      ascensions:0,viralMoments:0,stage20Runs:0
    }
  };

  const save  = loadSave();
 const state = {
    screen:"menu",mode:"classic",lanes:5,dpr:1,
    w:0,h:0,trackX:0,trackW:0,laneW:0,
    playerY:0,playerX:0,targetLane:2,pointerId:null,
    swipeStartX:null,swipeStartLane:null,
    score:0,displayedScore:0,speed:330,time:0,
    meters:0,energy:0,combo:1,comboTimer:0,
    overdrive:0,invincible:0,reviveUsed:false,
    earnedExtraLife:false,shieldAvailable:false,runEnded:false,
    spawnTimer:0,stageIndex:1,stageTimer:0,stageHits:0,
    recordTimer:0,inputGhost:[],ghostReplay:null,
    obstacles:[],shards:[],particles:[],sparks:[],messages:[],
    wakes:[],
    fragments:[],
    boostCinema:0,
    stageBeam:0,
    bossReveal:0,
    bossRevealName:"",
    glitchTears:[],
    shake:0,rng:Math.random,seed:0,
    // ── Near-miss streak ──────────────────────────────────────────────────────
    nearMissStreak:0,
    nearMissCleanPassPending:false,
    // ── Clutch Mode ───────────────────────────────────────────────────────────
    clutchActive:false,
    clutchTimer:0,
    // ── Modifiers ─────────────────────────────────────────────────────────────
    activeModifier:null,
    tremorPhase:0,
    slipstreamTimer:0,
    nearMissCountMod:0,
    // ── Zone-specific ─────────────────────────────────────────────────────────
    commitLock:0,
    glitchFlashTimer:0,
    glitchFlashActive:false,
    heat:0,
    heatSurge:0,
    gravityPull:0,
    // ── Boss ──────────────────────────────────────────────────────────────────
    bossPhase:0,
    bossPhaseTimer:0,
    bossWeakpointActive:false,
    bossStaggerTimer:0,
    bossDefeatPhase:0,
    bossDefeatTimer:0,
    bossWeakpointCount:0,
    // ── Pattern rhythm ────────────────────────────────────────────────────────
    patternBeat:0,
    spawnDensityMul:1.0,
    // ── Track materialise ─────────────────────────────────────────────────────
    trackMaterialise:1.0,
    // ── Onboarding ────────────────────────────────────────────────────────────
    onboarding:false,
    onboardingPhase:0,
    onboardingTimer:0,
    comboDecayRate:1.6,
    run:freshRunStats()
  };
  // Ambient menu idle ghost
  const menuGhost = { x: 0, lane: 2, time: 0, active: false };

  let audioCtx  = null;
  let lastFrame = performance.now();
  let toastTimer= 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA HELPERS (unchanged)
  // ─────────────────────────────────────────────────────────────────────────────

  function makeCosmetics(prefix, names) {
    return names.map((name, i) => ({
      id:`${prefix}_${String(i+1).padStart(3,"0")}`,name,
      rarity:i<4?"Common":i<8?"Rare":i<12?"Epic":i<15?"Legendary":"Mythic",
      color:COLOR_SET[i%COLOR_SET.length],
      cost:i<4?250+i*120:i<8?1000+i*160:i<12?3600+i*320:i<15?12000+i*500:0,
      fragments:i<8?0:i<12?10:i<15?35:80,
      unlockLevel:i<4?1:i<8?8:i<12?22:i<15?45:80
    }));
  }

  function buildAchievements() {
    const rows=[
      ["First Pulse","Complete 1 run","runs",1],["Back Again","Complete 5 runs","runs",5],
      ["Habit Spark","Complete 25 runs","runs",25],["Runner's Rhythm","Complete 100 runs","runs",100],
      ["Endless Intent","Complete 250 runs","runs",250],["One More Run","Complete 500 runs","runs",500],
      ["True Circuit","Complete 1,000 runs","runs",1000],["First Clear","Clear Stage 5","highestStage",5],
      ["Into The Deep","Clear Stage 15","highestStage",15],["Past The Break","Clear Stage 25","highestStage",25],
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
      ["First Shard","Collect 1 shard","totalShards",1],
      ["Pocket Glow","Collect 100 shards","totalShards",100],
      ["Shard Route","Collect 500 shards","totalShards",500],
      ["Shard Surge","Collect 2,500 shards","totalShards",2500],
      ["Shard Storm","Collect 10,000 shards","totalShards",10000],
      ["Rare Catch","Collect 1 rare shard","rareShards",1],
      ["Rare Route","Collect 25 rare shards","rareShards",25],
      ["Rare Magnet","Collect 250 rare shards","rareShards",250],
      ["Coin Flow","Earn 10,000 coins","coinsEarned",10000],
      ["Coin Engine","Earn 100,000 coins","coinsEarned",100000],
      ["First Combo","Reach 5x combo","bestCombo",5],
      ["Clean Chain","Reach 10x combo","bestCombo",10],
      ["Pulse Chain","Reach 20x combo","bestCombo",20],
      ["Combo Architect","Reach 30x combo","bestCombo",30],
      ["Impossible Thread","Reach 40x combo","bestCombo",40],
      ["Near Miss","Trigger 1 near miss","totalNearMisses",1],
      ["Risk Taker","Trigger 50 near misses","totalNearMisses",50],
      ["Close Call Pro","Trigger 500 near misses","totalNearMisses",500],
      ["Edge Reader","Trigger 2,000 near misses","totalNearMisses",2000],
      ["Clutch Signature","Trigger 10 near misses in one run","bestNearMisses",10],
      ["First Boost","Use Boost once","totalBoosts",1],
      ["Boost Habit","Use Boost 50 times","totalBoosts",50],
      ["Boost Breaker","Destroy 100 hazards with Boost","hazardsBroken",100],
      ["Overdrive Line","Destroy 1,000 hazards with Boost","hazardsBroken",1000],
      ["Perfect Boost","Clear a boss phase using Boost","bossesDefeated",5],
      ["Late Save","Trigger a clutch moment","viralMoments",1],
      ["Revived Run","Use rewarded revive once","adsWatched",1],
      ["Second Chance Win","Defeat boss after revive","reviveBoss",1],
      ["No Revive Needed","Reach Stage 20 without revive","noReviveStage",20],
      ["Final Spark","Clear Stage 25 with low Pulse","lowPulse25",1],
      ["Neon Native","Play Neon City","zone_neon_city",1],
      ["Quantum Key","Unlock Quantum Core","level",8],
      ["Void Key","Unlock Void Network","level",16],
      ["Glitch Key","Unlock Glitch Dimension","level",26],
      ["Singularity Key","Unlock Singularity","level",38],
      ["Nexus Key","Unlock Pulse Nexus","level",55],
      ["City Master","Reach Stage 25 in Neon City","master_neon_city",1],
      ["Core Master","Reach Stage 25 in Quantum Core","master_quantum_core",1],
      ["Void Master","Reach Stage 25 in Void Network","master_void_network",1],
      ["Nexus Master","Reach Stage 25 in Pulse Nexus","master_pulse_nexus",1],
      ["Daily Spark","Complete 1 Daily Mission","dailyMissions",1],
      ["Daily Routine","Complete 10 Daily Missions","dailyMissions",10],
      ["Daily Machine","Complete 50 Daily Missions","dailyMissions",50],
      ["Daily Loyalist","Complete 150 Daily Missions","dailyMissions",150],
      ["Calendar Start","Claim 3 login rewards","loginClaims",3],
      ["Streak Seven","Reach 7-day streak","loginStreak",7],
      ["Streak Thirty","Reach 30-day streak","loginStreak",30],
      ["Weekly Winner","Complete 1 Weekly Challenge","weeklyChallenges",1],
      ["Weekly Veteran","Complete 12 Weekly Challenges","weeklyChallenges",12],
      ["Season Finisher","Earn 5,000 event score","eventScore",5000],
      ["First Skin","Unlock 1 skin","skinsUnlocked",1],
      ["Closet Starter","Unlock 5 skins","skinsUnlocked",5],
      ["Style Grid","Unlock 15 skins","skinsUnlocked",15],
      ["Collector","Unlock 35 skins","skinsUnlocked",35],
      ["Curator","Unlock 60 skins","skinsUnlocked",60],
      ["Hundred Signal","Unlock 100 skins","skinsUnlocked",100],
      ["Trail Start","Unlock 1 trail","trailsUnlocked",1],
      ["Boost Style","Unlock 1 boost effect","boostsUnlocked",1],
      ["Sound Shift","Unlock 1 sound pack","soundsUnlocked",1],
      ["Full Fit","Equip full cosmetic kit","fullFit",1],
      ["Ghost Made","Save first ghost replay","ghostsSaved",1],
      ["Ghost Beat","Beat your ghost","ghostWins",1],
      ["Ghost Hunter","Beat 25 ghosts","ghostWins",25],
      ["Ghost Rival","Beat a friend challenge code","challengeWins",1],
      ["Share The Break","Share 10 end screens","shares",10],
      ["Clutch Reel","Generate 25 highlight moments","viralMoments",25],
      ["Level 50","Reach Account Level 50","level",50],
      ["Level 100","Reach Account Level 100","level",100],
      ["First Ascension","Ascend once","ascensions",1],
      ["Eternal Pulse","Ascend 10 times","ascensions",10],
    ];
    const tiers=["Bronze","Bronze","Silver","Gold","Platinum","Mythic"];
    return rows.map((row,i)=>({
      id:`ach_${String(i+1).padStart(3,"0")}`,
      name:row[0],copy:row[1],metric:row[2],target:row[3],
      tier:tiers[Math.min(tiers.length-1,Math.floor(i/18))]
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SAVE / LOAD
  // ─────────────────────────────────────────────────────────────────────────────

  function loadSave() {
    let parsed={};
    try { parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||localStorage.getItem(OLD_STORAGE_KEY)||"{}"); }
    catch { parsed={}; }
    const merged=mergeSave(DEFAULT_SAVE,parsed);
    if (parsed.selectedSkin==="volt"||parsed.unlocked?.volt) {
      merged.selectedSkin="skin_001"; merged.unlocked.skins.skin_001=true;
    }
    normalizeSave(merged);
    return merged;
  }
  function mergeSave(base,patch) {
    const out=Array.isArray(base)?[...base]:{...base};
    Object.keys(patch||{}).forEach(k=>{
      if(patch[k]&&typeof patch[k]==="object"&&!Array.isArray(patch[k])&&base[k]&&typeof base[k]==="object"&&!Array.isArray(base[k]))
        out[k]=mergeSave(base[k],patch[k]);
      else out[k]=patch[k];
    });
    return out;
  }
  function normalizeSave(data) {
    data.level=levelFromXp(data.xp);
    data.runs=data.stats.runs||data.runs||0;
    data.stats.runs=data.runs;
    data.stats.skinsUnlocked=Object.keys(data.unlocked.skins||{}).length;
    data.stats.trailsUnlocked=Object.keys(data.unlocked.trails||{}).length;
    data.stats.boostsUnlocked=Object.keys(data.unlocked.boosts||{}).length;
    data.stats.soundsUnlocked=Object.keys(data.unlocked.sounds||{}).length;
    data.stats.cosmeticsUnlocked=data.stats.skinsUnlocked+data.stats.trailsUnlocked+data.stats.boostsUnlocked+Object.keys(data.unlocked.themes||{}).length+data.stats.soundsUnlocked;
  }
  function persist() { normalizeSave(save); localStorage.setItem(STORAGE_KEY,JSON.stringify(save)); updateMenu(); }

  function freshRunStats() {
    return {
      score:0,shards:0,rareShards:0,boosts:0,nearMisses:0,
      hazardsBroken:0,maxCombo:1,meters:0,stageReached:1,
      stagesCleared:0,perfectStages:0,bossesDefeated:0,shieldHits:0,
      viralMoments:0,earnedCoins:0,xpEarned:0,coresEarned:0,
      fragmentsEarned:0,doubled:false,highlight:"Clean Run"
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  function dayKey(offset=0) {
    const d=new Date(Date.now()+offset*86400000);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function weekKey() {
    const d=new Date(),s=new Date(d.getFullYear(),0,1);
    return `${d.getFullYear()}-W${String(Math.ceil((((d-s)/86400000)+s.getDay()+1)/7)).padStart(2,"0")}`;
  }
  function xpForLevel(l) { return Math.round(80+Math.pow(l,1.42)*42); }
  function xpAtLevel(l)  { let t=0; for(let i=1;i<l;i++)t+=xpForLevel(i); return t; }
  function levelFromXp(xp) { let l=1,r=xp; while(l<100&&r>=xpForLevel(l)){r-=xpForLevel(l);l++;} return l; }
  function addXp(amt) {
    const before=save.level; save.xp+=Math.max(0,Math.floor(amt)); save.level=levelFromXp(save.xp);
    if(save.level>before){toast(`Level ${save.level}`);awardLevelMilestones(before+1,save.level);}
  }
  function awardLevelMilestones(from,to) {
    for(let l=from;l<=to;l++){
      if(l%5===0)save.cores+=1+Math.floor(l/20);
      if(l===10)unlockCosmetic("skins","skin_031");
      if(l===25)save.fragments+=10;
      if(l===50)save.fragments+=25;
      if(l===100)save.ascensionMarks+=1;
    }
  }
  function hashString(v) {
    let h=2166136261;
    for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function mulberry32(seed) {
    return function rng(){let t=seed+=0x6d2b79f5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
  }
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function format(v){return Math.floor(v).toLocaleString();}
  function selectedSkin(){return SKINS.find(s=>s.id===save.selectedSkin)||SKINS[0];}
  function currentZone(){return ZONES.find(z=>z.id===save.selectedZone)||ZONES[0];}
  function currentStage() {
    const idx=(state.stageIndex-1)%STAGES.length;
    const loops=Math.floor((state.stageIndex-1)/STAGES.length);
    const base=STAGES[idx];
    return {...base,number:state.stageIndex,speedMul:base.speedMul+loops*0.38,duration:base.duration+loops*5};
  }
  function skillRank(id){return save.skills[id]||0;}
  function bonus(kind){return SKILL_NODES.filter(n=>n.bonus===kind).reduce((s,n)=>s+skillRank(n.id),0);}
  function energyGain(base){return base*(1+bonus("boostRecharge")*0.04);}
  function maxComboCap(){return 20+bonus("comboCap")*3+save.ascensionMarks;}
  function coinMultiplier(){return 1+bonus("coinMult")*0.05+save.ascensionMarks*0.01;}
  function scoreMultiplier(){return 1+bonus("perfectScore")*0.015+save.ascensionMarks*0.005;}
  function isZoneUnlocked(zone){return save.level>=zone.unlockLevel;}

  // ─────────────────────────────────────────────────────────────────────────────
  // LIVE SYSTEMS (unchanged logic)
  // ─────────────────────────────────────────────────────────────────────────────

  function ensureLiveSystems(){ensureLoginState();ensureDailyMissions();ensureWeeklyChallenges();ensureAdDay();}
  function ensureLoginState(){
    const today=dayKey();
    if(save.lastLogin===today)return;
    save.loginStreak=save.lastLogin===dayKey(-1)?save.loginStreak+1:1;
    save.lastLogin=today;save.dailyClaimed="";
  }
  function ensureDailyMissions(){
    const key=dayKey(),slots=save.level>=20?4:3;
    if(save.missionDay===key&&Array.isArray(save.missions)&&save.missions.length===slots)return;
    const rng=mulberry32(hashString(`missions-${key}`));
    const pool=[...MISSION_BANK].sort(()=>rng()-0.5);
    save.missionDay=key;
    save.missions=pool.slice(0,slots).map(m=>({...m,progress:0,done:false,paid:false}));
  }
  function ensureWeeklyChallenges(){
    const key=weekKey();
    if(save.weeklyKey===key&&Array.isArray(save.weekly)&&save.weekly.length===3)return;
    const rng=mulberry32(hashString(`weekly-${key}`));
    const pool=[...WEEKLY_BANK].sort(()=>rng()-0.5);
    save.weeklyKey=key;
    save.weekly=pool.slice(0,3).map(c=>({...c,progress:0,done:false,paid:false}));
  }
  function ensureAdDay(){
    const today=dayKey();
    if(save.adDay===today)return;
    save.adDay=today;save.adCounts={total:0,revive:0,double:0,spin:0,mission:0};
  }
  function canWatchAd(placement){
    ensureAdDay();
    const caps={total:20,revive:8,double:5,spin:2,mission:3};
    return (save.adCounts.total||0)<caps.total&&(save.adCounts[placement]||0)<(caps[placement]||5);
  }
  function countAd(placement){
    ensureAdDay();
    save.adCounts.total=(save.adCounts.total||0)+1;
    save.adCounts[placement]=(save.adCounts[placement]||0)+1;
    save.stats.adsWatched=(save.stats.adsWatched||0)+1;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LAYOUT
  // ─────────────────────────────────────────────────────────────────────────────

  function resize(){
    state.dpr=Math.min(PERF.dprCap,window.devicePixelRatio||1);
    state.w=Math.max(320,window.innerWidth);
    state.h=Math.max(520,window.innerHeight);
    canvas.width=Math.floor(state.w*state.dpr);
    canvas.height=Math.floor(state.h*state.dpr);
    canvas.style.width=`${state.w}px`;
    canvas.style.height=`${state.h}px`;
    ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
    state.trackW=Math.min(state.w*(state.w<680?0.9:0.54),520);
    state.trackX=(state.w-state.trackW)/2;
    state.laneW=state.trackW/state.lanes;
    state.playerY=Math.min(state.h*0.78,state.h-122);
    state.playerX=laneCenter(state.targetLane);
    menuGhost.x=laneCenter(2);
  }

  function laneCenter(lane){return state.trackX+state.laneW*(lane+0.5);}
  function laneFromX(x){return clamp(Math.floor((x-state.trackX)/state.laneW),0,state.lanes-1);}

  // ─────────────────────────────────────────────────────────────────────────────
  // SCREEN MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  function setScreen(screen){
    state.screen=screen;
    els.menu.classList.toggle("active",screen==="menu");
    els.pause.classList.toggle("active",screen==="pause");
    els.gameOver.classList.toggle("active",screen==="gameover");
    els.hud.classList.toggle("visible",screen==="playing");
    els.boost.classList.toggle("visible",screen==="playing");
    if(screen==="menu"){updateMenu();menuGhost.active=true;}
    else{menuGhost.active=false;}
  }
  function switchTab(name){
    document.querySelectorAll(".tab-button").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
    document.querySelectorAll(".tab-page").forEach(p=>p.classList.toggle("active",p.id===`tab${name[0].toUpperCase()}${name.slice(1)}`));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MENU RENDERING
  // ─────────────────────────────────────────────────────────────────────────────

  function updateMenu(){
    ensureLiveSystems();
    const baseXp=xpAtLevel(save.level),next=xpForLevel(save.level);
    els.level.textContent=format(save.level);
    els.xp.textContent=`${format(save.xp-baseXp)}/${format(next)}`;
    els.menuBest.textContent=format(save.best);
    els.best.textContent=format(save.best);
    els.coins.textContent=format(save.coins);
    els.cores.textContent=format(save.cores);
    els.runs.textContent=format(save.runs);
    els.sound.textContent=save.sound?"Sound On":"Sound Off";
    els.haptics.textContent=save.haptics?"Haptics On":"Haptics Off";
    els.sound.classList.toggle("on",save.sound);
    els.haptics.classList.toggle("on",save.haptics);
    renderZones();renderMissions();renderDailyPanel();renderLevelPanel();
    renderSkillTree();renderAchievements();renderCosmetics();renderSocial();
  }

  function renderZones(){
    els.zoneGrid.replaceChildren();
    ZONES.forEach(zone=>{
      const unlocked=isZoneUnlocked(zone);
      const button=document.createElement("button");
      button.type="button";
      button.className=`zone-button${save.selectedZone===zone.id?" selected":""}${unlocked?"":" locked"}`;
      button.style.setProperty("--skin",zone.color);
      const best=save.ghosts[zone.id]?.stage||0;
      button.innerHTML=`<span class="zone-dot" aria-hidden="true"></span><span><span class="skin-name">${zone.name}</span><span class="skin-cost">${unlocked?`${zone.hazard} · best stage ${best}`:`Unlock level ${zone.unlockLevel}`}</span></span>`;
      button.addEventListener("click",()=>{
        if(!unlocked)return toast(`Reach Level ${zone.unlockLevel}`);
        save.selectedZone=zone.id;persist();toast(zone.name);
      });
      els.zoneGrid.append(button);
    });
  }

  function renderMissions(){
    els.missionList.replaceChildren();
    save.missions.forEach(m=>{
      const item=document.createElement("div");
      item.className=`mission-item${m.done?" done":""}`;
      const progress=Math.min(m.target,Math.floor(m.progress||0));
      item.innerHTML=`<span class="mission-copy">${m.label} <span class="muted">${format(progress)}/${format(m.target)}</span></span><span class="mission-reward">${m.paid?"Paid":`+${m.reward}`}</span>`;
      els.missionList.append(item);
    });
  }

  function renderDailyPanel(){
    const day=((save.loginDay-1)%LOGIN_REWARDS.length)+1;
    const claimed=save.dailyClaimed===dayKey();
    els.dailyPanel.innerHTML=`<div><span class="system-name">Day ${day} · Streak ${save.loginStreak}</span><span class="system-copy">${LOGIN_REWARDS[day-1]} · Weekly ${save.weeklyKey}</span></div><button id="claimDailyBtn" class="toggle-button${claimed?"":" on"}" type="button">${claimed?"Claimed":"Claim"}</button>`;
    document.getElementById("claimDailyBtn").addEventListener("click",claimDailyReward);
  }

  function renderLevelPanel(){
    const milestones=[[2,"Daily Missions"],[3,"Rewarded Revive"],[5,"Skill Tree"],[8,"Quantum Core"],[15,"Weekly Challenges"],[16,"Void Network"],[20,"Fourth Mission Slot"],[26,"Glitch Dimension"],[38,"Singularity"],[45,"Season Track"],[55,"Pulse Nexus"],[100,"Ascension"]];
    els.levelPanel.replaceChildren();
    milestones.forEach(([level,reward])=>{
      const item=document.createElement("div");
      item.className=`system-item${save.level>=level?" done":""}`;
      item.innerHTML=`<span><span class="system-name">Level ${level}</span><span class="system-copy">${reward}</span></span><span class="system-pill">${save.level>=level?"Open":"Locked"}</span>`;
      els.levelPanel.append(item);
    });
    save.weekly.forEach(c=>{
      const item=document.createElement("div");
      item.className=`system-item${c.done?" done":""}`;
      item.innerHTML=`<span><span class="system-name">${c.label}</span><span class="system-copy">${format(c.progress||0)}/${format(c.target)} · +${c.xp} XP · +${c.cores} cores</span></span><span class="system-pill">${c.paid?"Paid":c.done?"Done":"Weekly"}</span>`;
      els.levelPanel.append(item);
    });
  }

  function renderSkillTree(){
    els.skillTree.replaceChildren();
    SKILL_NODES.forEach(node=>{
      const rank=skillRank(node.id),cost=skillCost(node,rank+1);
      const capped=rank>=node.ranks,locked=save.level<unlockLevelForSkill(node);
      const button=document.createElement("button");
      button.type="button";
      button.className=`skill-button${capped?" selected":""}${locked?" locked":""}`;
      button.style.setProperty("--skin",locked?C.muted:branchColor(node.branch));
      button.innerHTML=`<span class="skill-dot" aria-hidden="true"></span><span><span class="skin-name">${node.name} ${rank}/${node.ranks}</span><span class="skin-cost">${locked?`Level ${unlockLevelForSkill(node)}`:capped?"Maxed":`${format(cost.coins)} coins · ${format(cost.cores)} cores · ${node.copy}`}</span></span>`;
      button.addEventListener("click",()=>buySkill(node));
      els.skillTree.append(button);
    });
  }
  function branchColor(branch){return{Reflex:C.wake,Pulse:C.reward,Score:C.danger,Economy:C.perfect,Survival:C.ghost,Discovery:C.spine}[branch]||C.wake;}
  function unlockLevelForSkill(node){return node.branch==="Reflex"?5:node.branch==="Pulse"?8:node.branch==="Score"?12:node.branch==="Economy"?16:node.branch==="Survival"?24:32;}
  function skillCost(node,nextRank){return{coins:Math.round(node.baseCoins*Math.pow(nextRank,1.45)),cores:Math.round(node.baseCores*Math.pow(nextRank,1.35))};}
  function buySkill(node){
    const rank=skillRank(node.id);
    if(save.level<unlockLevelForSkill(node))return toast(`Unlocks at Level ${unlockLevelForSkill(node)}`);
    if(rank>=node.ranks)return toast("Already maxed");
    const cost=skillCost(node,rank+1);
    if(save.coins<cost.coins||save.cores<cost.cores)return toast("Need more coins or cores");
    save.coins-=cost.coins;save.cores-=cost.cores;save.skills[node.id]=rank+1;
    toast(`${node.name} upgraded`);playSound("buy");persist();
  }

  function renderAchievements(){
    els.achievementList.replaceChildren();
    ACHIEVEMENTS.forEach(ach=>{
      const progress=achievementProgress(ach),done=Boolean(save.achievements[ach.id]);
      const item=document.createElement("div");
      item.className=`system-item${done?" done":progress>=ach.target?" claimable":""}`;
      item.innerHTML=`<span><span class="system-name">${ach.name}</span><span class="system-copy">${ach.copy} · ${format(Math.min(progress,ach.target))}/${format(ach.target)}</span></span><span class="system-pill">${ach.tier}</span>`;
      els.achievementList.append(item);
    });
  }

  function renderCosmetics(){
    renderCosmeticGrid(els.skinGrid,SKINS,"skins","selectedSkin");
    renderCosmeticGrid(els.trailGrid,TRAILS,"trails","selectedTrail");
    renderCosmeticGrid(els.boostGrid,BOOST_EFFECTS,"boosts","selectedBoost");
    els.extraCosmetics.replaceChildren();
    [...MENU_THEMES.map(c=>[c,"themes","selectedTheme"]),...SOUND_PACKS.map(c=>[c,"sounds","selectedSound"])].forEach(([item,bucket,selectedKey])=>{
      const unlocked=Boolean(save.unlocked[bucket][item.id]);
      const row=document.createElement("button");
      row.type="button";
      row.className=`system-item${save[selectedKey]===item.id?" done":""}`;
      row.innerHTML=`<span><span class="system-name">${item.name}</span><span class="system-copy">${item.rarity} · ${unlocked?"Owned":priceText(item)}</span></span><span class="system-pill">${unlocked?"Equip":"Buy"}</span>`;
      row.addEventListener("click",()=>handleCosmetic(item,bucket,selectedKey));
      els.extraCosmetics.append(row);
    });
  }
  function renderCosmeticGrid(container,items,bucket,selectedKey){
    container.replaceChildren();
    items.forEach(item=>{
      const unlocked=Boolean(save.unlocked[bucket][item.id]);
      const button=document.createElement("button");
      button.type="button";
      button.className=`skin-button${save[selectedKey]===item.id?" selected":""}${save.level<item.unlockLevel?" locked":""}`;
      button.style.setProperty("--skin",item.color||RARITIES[item.rarity].color);
      button.innerHTML=`<span class="skin-dot" aria-hidden="true"></span><span><span class="skin-name">${item.name}</span><span class="skin-cost">${item.rarity} · ${unlocked?"Owned":save.level<item.unlockLevel?`Level ${item.unlockLevel}`:priceText(item)}</span></span>`;
      button.addEventListener("click",()=>handleCosmetic(item,bucket,selectedKey));
      container.append(button);
    });
  }
  function priceText(item){if(item.rarity==="Mythic")return`${item.fragments} fragments · ${item.unlockLevel}+`;return`${format(item.cost)} coins${item.fragments?` · ${item.fragments} fragments`:""}` ;}
  function handleCosmetic(item,bucket,selectedKey){
    if(save.unlocked[bucket][item.id]){save[selectedKey]=item.id;playSound("select");toast(`${item.name} equipped`);persist();return;}
    if(save.level<item.unlockLevel)return toast(`Unlocks at Level ${item.unlockLevel}`);
    if(save.coins<item.cost||save.fragments<item.fragments)return toast("Need more coins or fragments");
    save.coins-=item.cost;save.fragments-=item.fragments;
    unlockCosmetic(bucket,item.id);save[selectedKey]=item.id;
    playSound("buy");toast(`${item.name} unlocked`);persist();
  }
  function unlockCosmetic(bucket,id){if(!save.unlocked[bucket])return;save.unlocked[bucket][id]=true;normalizeSave(save);}
  function renderSocial(){
    els.socialPanel.replaceChildren();
    const zone=currentZone(),ghost=save.ghosts[zone.id],code=makeChallengeCode();
    [["Best Ghost",ghost?`${format(ghost.score)} · Stage ${ghost.stage}`:"No ghost saved yet"],["Friend Code",code],["Offline Social","Paste a code to race the same seed and score target"],["Last Highlight",save.lastRun?.highlight||"No run yet"]].forEach(([name,copy])=>{
      const item=document.createElement("div");
      item.className="system-item";
      item.innerHTML=`<span><span class="system-name">${name}</span><span class="system-copy">${copy}</span></span><span class="system-pill">${name==="Friend Code"?"Copy":"Info"}</span>`;
      if(name==="Friend Code")item.addEventListener("click",()=>copyText(code,"Challenge code copied"));
      els.socialPanel.append(item);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DAILY / ECONOMY
  // ─────────────────────────────────────────────────────────────────────────────

  function claimDailyReward(){
    if(save.dailyClaimed===dayKey())return toast("Already claimed");
    const day=((save.loginDay-1)%LOGIN_REWARDS.length)+1;
    grantRewardText(LOGIN_REWARDS[day-1]);
    save.dailyClaimed=dayKey();save.loginDay+=1;
    save.stats.loginClaims=(save.stats.loginClaims||0)+1;
    save.streakTokens+=save.loginStreak>=7?2:1;
    toast(`Claimed ${LOGIN_REWARDS[day-1]}`);playSound("buy");persist();
  }
  function grantRewardText(reward){
    if(reward.includes("coins"))save.coins+=parseInt(reward,10)||250;
    if(reward.includes("XP"))addXp(parseInt(reward,10)||50);
    if(reward.includes("core"))save.cores+=parseInt(reward,10)||1;
    if(reward.includes("fragment"))save.fragments+=parseInt(reward,10)||5;
    if(reward.includes("skin ticket"))unlockRandomSkin(reward.includes("Rare")?"Rare":"Common");
  }
  function unlockRandomSkin(rarity){
    const locked=SKINS.filter(s=>s.rarity===rarity&&!save.unlocked.skins[s.id]);
    if(!locked.length){save.fragments+=rarity==="Rare"?8:3;return;}
    unlockCosmetic("skins",locked[Math.floor(Math.random()*locked.length)].id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GAME STATE
  // ─────────────────────────────────────────────────────────────────────────────

  function startRun(mode="classic"){
    ensureAudio();
    state.mode=mode;
    state.targetLane=2;state.playerX=laneCenter(2);
    state.score=0;state.displayedScore=0;state.speed=330;
    state.time=0;state.meters=0;state.energy=0;
    state.combo=1;state.comboTimer=0;state.overdrive=0;
    state.invincible=1.2+bonus("startShield")*0.5;
    state.reviveUsed=false;
    state.earnedExtraLife=skillRank("extra_life")>0;
    state.shieldAvailable=skillRank("failsafe")>=5;
    state.runEnded=false;state.spawnTimer=0.8;
    state.stageIndex=1;state.stageTimer=0;state.stageHits=0;
    state.recordTimer=0;state.inputGhost=[];
    state.obstacles=[];state.shards=[];
    state.particles=[];state.sparks=[];state.messages=[];
    state.wakes=[];state.fragments=[];
    state.boostCinema=0;state.stageBeam=0;state.bossReveal=0;state.bossRevealName="";
    state.glitchTears=[];
    state.shake=0;state.swipeStartX=null;state.swipeStartLane=null;
    state.run=freshRunStats();

    if(mode==="daily")state.seed=hashString(`daily-${dayKey()}-${save.selectedZone}`);
    else if(mode==="ghost"&&save.ghosts[save.selectedZone]){state.seed=save.ghosts[save.selectedZone].seed;state.ghostReplay=save.ghosts[save.selectedZone];}
    else if(mode==="challenge"&&save.challenge){state.seed=save.challenge.seed;state.ghostReplay=null;}
    else{state.seed=Math.floor(Math.random()*2**32);state.ghostReplay=null;}
    state.rng=mulberry32(state.seed);
    setScreen("playing");
    addMessage("Stage 1",state.w/2,state.h*0.25,currentZone().color);
    updateHud();playSound("start");vibrate(20);
    // Materialise lane lines on run start
    state.trackMaterialise=1.0;
  }

  function pauseGame(){if(state.screen!=="playing")return;setScreen("pause");playSound("select");}
  function resumeGame(){if(state.screen!=="pause")return;lastFrame=performance.now();setScreen("playing");playSound("start");}

  function endRun(){
    if(state.runEnded)return;
    state.runEnded=true;
    // Death: spawn 12 teardrop fragments
    spawnDeathFragments();
    // Hold for fragment settle, then show game-over after 1.8s
    setTimeout(()=>{
      finalizeRunRewards();applyRunToSave();updateAchievements();saveGhostIfBest();
      persist();renderResults();setScreen("gameover");
    },1800);
    playSound("crash");vibrate([40,40,80]);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DEATH FRAGMENTS — 12 teardrop shards fly outward
  // ─────────────────────────────────────────────────────────────────────────────

  function spawnDeathFragments(){
    const skin=selectedSkin();
    state.fragments=[];
    for(let i=0;i<12;i++){
      const a=Math.random()*Math.PI*2;
      const s=80+Math.random()*120;
      state.fragments.push({
        x:state.playerX,y:state.playerY,
        vx:Math.cos(a)*s,vy:Math.sin(a)*s-80,
        rot:a,rotV:(Math.random()-0.5)*8,
        life:0.9+Math.random()*0.3,
        maxLife:0,  // set after push
        color:skin.color,
        trailLen:0,
        scale:0.32+Math.random()*0.28,
      });
      state.fragments[state.fragments.length-1].maxLife=state.fragments[state.fragments.length-1].life;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RUN REWARDS / SAVE (unchanged logic)
  // ─────────────────────────────────────────────────────────────────────────────

  function finalizeRunRewards(){
    const finalScore=Math.floor(state.score);
    state.run.score=finalScore;state.run.meters=Math.floor(state.meters);
    state.run.stageReached=state.stageIndex;
    const stageCoins=state.run.stagesCleared*18;
    const baseCoins=Math.floor(finalScore/120)+state.run.shards+stageCoins+state.run.bossesDefeated*75;
    state.run.earnedCoins=Math.max(1,Math.floor(baseCoins*coinMultiplier()));
    state.run.xpEarned=Math.floor(20+finalScore/500*8+state.run.stagesCleared*18+state.run.bossesDefeated*120+state.run.perfectStages*35);
    state.run.coresEarned=state.run.bossesDefeated+Math.floor(state.run.stagesCleared/10);
    state.run.fragmentsEarned=Math.floor(state.run.rareShards/3)+Math.floor(state.run.bossesDefeated/2)+bonus("blueprint");
    state.run.highlight=pickHighlight();
  }
  function applyRunToSave(){
    const oldDailyBest=save.stats.dailyBestScore||0;
    if(state.mode==="daily"&&state.run.score>oldDailyBest)state.run.dailyBest=1;
    save.runs+=1;save.stats.runs=save.runs;
    save.coins+=state.run.earnedCoins;save.cores+=state.run.coresEarned;
    save.fragments+=state.run.fragmentsEarned;addXp(state.run.xpEarned);
    if(state.run.score>save.best)save.best=state.run.score;
    save.stats.totalScore+=state.run.score;
    save.stats.totalShards+=state.run.shards;
    save.stats.totalNearMisses+=state.run.nearMisses;
    save.stats.totalBoosts+=state.run.boosts;
    save.stats.hazardsBroken+=state.run.hazardsBroken;
    save.stats.bossesDefeated+=state.run.bossesDefeated;
    save.stats.stagesCleared+=state.run.stagesCleared;
    save.stats.perfectStages+=state.run.perfectStages;
    save.stats.coinsEarned+=state.run.earnedCoins;
    save.stats.highestStage=Math.max(save.stats.highestStage,state.run.stageReached);
    save.stats.bestCombo=Math.max(save.stats.bestCombo||1,state.run.maxCombo);
    save.stats.bestNearMisses=Math.max(save.stats.bestNearMisses||0,state.run.nearMisses);
    save.stats.bestPerfectStages=Math.max(save.stats.bestPerfectStages||0,state.run.perfectStages);
    save.stats.rareShards=(save.stats.rareShards||0)+state.run.rareShards;
    save.stats.viralMoments+=state.run.viralMoments;
    if(!state.reviveUsed){save.stats.noReviveScore=Math.max(save.stats.noReviveScore||0,state.run.score);save.stats.noReviveStage=Math.max(save.stats.noReviveStage||0,state.run.stageReached);}
    if(state.mode==="daily")save.stats.dailyBestScore=Math.max(oldDailyBest,state.run.score);
    if(state.run.stageReached>=20)save.stats.stage20Runs+=1;
    save.stats[`zone_${save.selectedZone}`]=1;
    if(state.run.stageReached>=25)save.stats[`master_${save.selectedZone}`]=1;
    save.lastRun={...state.run,zone:save.selectedZone,mode:state.mode,seed:state.seed};
    progressMissions(save.missions);progressWeeklies();
    if(state.mode==="ghost"&&save.ghosts[save.selectedZone]&&state.run.score>save.ghosts[save.selectedZone].score)save.stats.ghostWins+=1;
    if(state.mode==="challenge"&&save.challenge&&state.run.score>=save.challenge.score){save.stats.challengeWins=(save.stats.challengeWins||0)+1;toast("Challenge beaten");}
  }
  function progressMissions(missions){
    let completed=0;
    missions.forEach(m=>{
      if(m.paid)return;
      const amount=m.metric==="score"||m.metric==="maxCombo"||m.metric==="stageReached"?Math.max(m.progress||0,state.run[m.metric]||0):(m.progress||0)+(state.run[m.metric]||0);
      m.progress=amount;
      if(!m.done&&amount>=m.target){m.done=true;m.paid=true;save.coins+=Math.floor(m.reward*(1+bonus("missionBonus")*0.06));save.stats.dailyMissions+=1;completed++;}
    });
    if(completed)toast(`${completed} mission${completed>1?"s":""} cashed`);
  }
  function progressWeeklies(){
    save.weekly.forEach(c=>{
      if(c.paid)return;
      const add=c.metric==="stage20Runs"?(state.run.stageReached>=20?1:0):state.run[c.metric]||0;
      c.progress=(c.progress||0)+add;
      if(!c.done&&c.progress>=c.target){c.done=true;c.paid=true;addXp(c.xp);save.cores+=c.cores;save.stats.weeklyChallenges+=1;}
    });
  }
  function updateAchievements(){
    let unlocked=0;
    ACHIEVEMENTS.forEach(ach=>{
      if(save.achievements[ach.id])return;
      if(achievementProgress(ach)>=ach.target){save.achievements[ach.id]=true;grantAchievementReward(ach);unlocked++;}
    });
    if(unlocked)toast(`${unlocked} achievement${unlocked>1?"s":""}`);
  }
  function achievementProgress(ach){
    if(ach.metric==="best")return save.best;
    if(ach.metric==="level")return save.level;
    if(ach.metric==="loginStreak")return save.loginStreak;
    if(ach.metric==="fullFit")return save.selectedSkin&&save.selectedTrail&&save.selectedBoost&&save.selectedTheme&&save.selectedSound?1:0;
    return save.stats[ach.metric]||0;
  }
  function grantAchievementReward(ach){
    const table={Bronze:[50,150,0,0],Silver:[150,500,1,0],Gold:[400,900,3,2],Platinum:[900,1500,6,8],Mythic:[1500,0,10,20]};
    const[xp,coins,cores,fragments]=table[ach.tier];
    addXp(xp);save.coins+=coins;save.cores+=cores;save.fragments+=fragments;
  }
  function saveGhostIfBest(){
    const z=save.selectedZone,prev=save.ghosts[z];
    if(!prev||state.run.score>prev.score){
      save.ghosts[z]={score:state.run.score,stage:state.run.stageReached,seed:state.seed,lanes:state.inputGhost.slice(0,900),created:Date.now()};
      save.stats.ghostsSaved=Math.max(save.stats.ghostsSaved||0,Object.keys(save.ghosts).length);
    }
  }
  function pickHighlight(){
    if(state.run.stageReached>=25&&state.energy<5){save.stats.lowPulse25=1;return"Final Spark";}
    if(state.run.maxCombo>=30)return"Combo Architect";
    if(state.run.viralMoments>0)return"Clutch Save";
    if(state.run.bossesDefeated>0&&state.reviveUsed){save.stats.reviveBoss=1;return"Second Chance Boss";}
    if(state.run.nearMisses>=10)return"Near Miss Reel";
    if(state.run.boosts>=3)return"Boost Chain";
    return"Clean Run";
  }

  function renderResults(){
    els.runMode.textContent=state.mode==="daily"?"Daily run":state.mode==="ghost"?"Ghost run":state.mode==="challenge"?"Challenge run":currentZone().name;
    els.finalScore.textContent=format(state.run.score);
    els.earnedCoins.textContent=format(state.run.earnedCoins);
    els.finalShards.textContent=format(state.run.shards);
    els.finalCombo.textContent=`${state.run.maxCombo}x`;
    els.finalStage.textContent=format(state.run.stageReached);
    els.finalXp.textContent=format(state.run.xpEarned);
    els.finalMoment.textContent=state.run.highlight;
    els.revive.disabled=state.reviveUsed||state.run.score<80||!canWatchAd("revive");
    els.doubleReward.disabled=state.run.doubled||!canWatchAd("double");
  }

  async function reviveRun(){
    if(state.screen!=="gameover"||state.reviveUsed||!canWatchAd("revive"))return;
    els.revive.disabled=true;
    const rewarded=await AdBridge.showRewarded("revive");
    if(!rewarded)return;
    countAd("revive");
    state.reviveUsed=true;state.runEnded=false;
    state.invincible=2.6;state.overdrive=1.4;
    state.energy=Math.max(state.energy,55);
    state.fragments=[];
    state.obstacles=state.obstacles.filter(ob=>ob.y<state.playerY-160);
    burst(state.playerX,state.playerY,C.ghost,34,8);
    setScreen("playing");playSound("boost");vibrate(45);persist();
  }

  async function doubleRunReward(){
    if(!save.lastRun||save.lastRun.doubled||!canWatchAd("double"))return toast("No double available");
    const rewarded=await AdBridge.showRewarded("double rewards");
    if(!rewarded)return;
    countAd("double");save.coins+=save.lastRun.earnedCoins;
    addXp(save.lastRun.xpEarned);save.lastRun.doubled=true;state.run.doubled=true;
    els.doubleReward.disabled=true;toast("Rewards doubled");persist();
  }

  async function luckySpin(){
    if(!canWatchAd("spin"))return toast("Daily spin cap reached");
    const rewarded=await AdBridge.showRewarded("lucky spin");
    if(!rewarded)return;
    countAd("spin");
    const rank=bonus("lucky"),roll=Math.random();
    if(roll<0.36-rank*0.03){const amt=400+rank*100;save.coins+=amt;toast(`Lucky Spin: ${amt} coins`);}
    else if(roll<0.7){const cores=2+Math.floor(rank/2);save.cores+=cores;toast(`Lucky Spin: ${cores} cores`);}
    else if(roll<0.93){const frags=5+rank*2;save.fragments+=frags;toast(`Lucky Spin: ${frags} fragments`);}
    else{unlockRandomSkin(rank>=3?"Epic":"Rare");toast("Lucky Spin: skin unlocked");}
    playSound("buy");persist();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BOOST — with cinema trigger
  // ─────────────────────────────────────────────────────────────────────────────

  function triggerBoost(){
    if(state.screen!=="playing"||state.energy<100)return;
    state.energy=0;
    state.overdrive=3.6+bonus("boostDuration")*0.12;
    state.combo=Math.max(state.combo,3);
    state.run.boosts+=1;
    state.run.maxCombo=Math.max(state.run.maxCombo,state.combo);
    state.shake=8;
    state.boostCinema=2.0;  // cinema countdown
    burst(state.playerX,state.playerY,C.boost,52,12);
    addMessage("Boost",state.playerX,state.playerY-60,C.boost);
    playSound("boost");vibrate(35);
    updateBoostRing();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GAME LOOP
  // ─────────────────────────────────────────────────────────────────────────────

  function update(dt){
    // Menu: update ambient ghost + particles only
    if(state.screen==="menu"){
      updateMenuGhost(dt);updateParticles(dt);return;
    }
    if(state.screen!=="playing"){updateParticles(dt);updateFragments(dt);return;}

    const stage=currentStage();
    const zonePressure=1+ZONES.findIndex(z=>z.id===save.selectedZone)*0.05;
    state.time+=dt;state.stageTimer+=dt;
    state.speed=(300+Math.min(520,state.time*8+state.score*0.055))*stage.speedMul*zonePressure;
    state.meters+=state.speed*dt*0.03;state.run.meters=Math.floor(state.meters);
    state.run.stageReached=state.stageIndex;
    state.score+=dt*(11+state.speed*0.022)*(state.overdrive>0?1.8:1)*Math.min(8,1+state.combo*0.09)*scoreMultiplier();
    state.run.score=Math.floor(state.score);

    // Score counter pulse on integer increase
    const prevDisplayed=Math.floor(state.displayedScore);
    state.displayedScore+=(state.score-state.displayedScore)*Math.min(1,dt*12);
    if(Math.floor(state.displayedScore)>prevDisplayed&&els.scoreStrong){
      els.scoreStrong.classList.add("pulse");
      setTimeout(()=>els.scoreStrong.classList.remove("pulse"),80);
    }

    state.comboTimer=Math.max(0,state.comboTimer-dt);
    if(state.comboTimer===0&&state.combo>1)state.combo=Math.max(1,state.combo-dt*1.6);
    state.overdrive=Math.max(0,state.overdrive-dt);
    state.invincible=Math.max(0,state.invincible-dt);
    state.shake=Math.max(0,state.shake-dt*22);
    state.boostCinema=Math.max(0,state.boostCinema-dt);
    state.stageBeam=Math.max(0,state.stageBeam-dt);
    state.bossReveal=Math.max(0,state.bossReveal-dt);
    if(state.trackMaterialise!==undefined)state.trackMaterialise=Math.max(0,state.trackMaterialise-dt*2);

    state.playerX+=(laneCenter(state.targetLane)-state.playerX)*Math.min(1,dt*(16+bonus("movement")*0.5));
    recordGhost(dt);

    // Glitch tears
    if(save.selectedZone==="glitch_dimension"){
      state.glitchTears=state.glitchTears.filter(t=>{t.life-=dt;return t.life>0;});
      if(state.rng()>1-dt*0.4){
        state.glitchTears.push({y:Math.random()*state.h,dx:(Math.random()-0.5)*16,life:0.08+Math.random()*0.06,h:8+Math.random()*10});
      }
    }

    state.spawnTimer-=dt;
    if(state.spawnTimer<=0){
      spawnPattern(stage);
      const pressure=Math.min(0.62,state.stageIndex*0.012+state.time*0.002);
      state.spawnTimer=0.88-pressure+state.rng()*0.2;
    }
    if(state.stageTimer>=stage.duration)advanceStage(stage);
    updateObstacles(dt);updateShards(dt);updateParticles(dt);updateWakes(dt);updateFragments(dt);
    maybeAddSpeedSparks(dt,stage);
    updateHud();
  }

  // ── Ambient menu ghost ────────────────────────────────────────────────────────
  function updateMenuGhost(dt){
    if(!menuGhost.active)return;
    menuGhost.time=(menuGhost.time||0)+dt;
    // Drift across lanes slowly
    const targetLane=Math.floor(2+Math.sin(menuGhost.time*0.4)*1.8);
    const clampedLane=clamp(targetLane,0,4);
    const targetX=laneCenter(clampedLane);
    menuGhost.x+=(targetX-menuGhost.x)*Math.min(1,dt*3);
  }

  function recordGhost(dt){
    state.recordTimer+=dt;
    if(state.recordTimer<0.25)return;
    state.recordTimer=0;
    state.inputGhost.push([Number(state.time.toFixed(2)),laneFromX(state.playerX)]);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STAGE ADVANCE + BOSS REVEAL CINEMA
  // ─────────────────────────────────────────────────────────────────────────────

  function advanceStage(stage){
    state.run.stagesCleared+=1;
    state.stageBeam=0.4;  // trigger stage-clear beam
    if(state.stageHits===0){
      state.run.perfectStages+=1;
      state.score+=Math.floor((250+state.stageIndex*15)*(1+bonus("perfectScore")*0.07));
      state.energy=Math.min(100,state.energy+energyGain(8));
      addMessage("Perfect",state.w/2,state.h*0.3,C.perfect);
    }
    if(stage.kind==="boss"){
      state.run.bossesDefeated+=1;
      state.score+=Math.floor((1000+state.stageIndex*60)*(1+bonus("bossScore")*0.08));
      burst(state.w/2,state.h*0.35,currentZone().color,70,12);
      playSound("buy");
    }
    state.stageIndex+=1;state.stageTimer=0;state.stageHits=0;
    // Boss reveal for next stage if it's a boss
    const nextStage=currentStage();
    if(nextStage.kind==="boss"){
      state.bossReveal=1.4;
      state.bossRevealName=nextStage.name;
    }
    addMessage(`Stage ${state.stageIndex}`,state.w/2,state.h*0.25,currentZone().color);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OBSTACLE SPAWNING — 4 visual families
  // Bulkhead (wall) · Spine (elite) · Crawler (stagger) · Sentinel (boss)
  // ─────────────────────────────────────────────────────────────────────────────

  function spawnPattern(stage){
    const roll=state.rng();
    if(stage.kind==="boss"&&roll<0.65)return spawnBossWave();
    if(stage.kind==="mini"&&roll<0.6)return spawnCrawlerChain();
    if(stage.kind==="fever"&&roll<0.7)return spawnShardLine();
    if(stage.kind==="elite"&&roll<0.45)return spawnSpine();
    if(stage.kind==="chaos"&&roll<0.35)return spawnChaos();
    if(roll<0.42)spawnBulkhead();
    else if(roll<0.72)spawnDouble();
    else spawnCrawlerChain();
  }

  function spawnBulkhead(){
    const gap=Math.floor(state.rng()*state.lanes);
    const lanes=[];
    for(let i=0;i<state.lanes;i++)if(i!==gap)lanes.push(i);
    state.obstacles.push({lanes,y:-48,h:30,kind:"bulkhead",passed:false,hit:false,elite:false});
    if(state.rng()>0.16)spawnShard(gap,-112);
  }

  function spawnDouble(){
    const first=Math.floor(state.rng()*state.lanes);
    let second=Math.floor(state.rng()*state.lanes);
    if(second===first)second=(second+2)%state.lanes;
    state.obstacles.push({lanes:[first,second],y:-44,h:34,kind:"bulkhead",passed:false,hit:false,elite:false});
    const safe=[0,1,2,3,4].filter(l=>l!==first&&l!==second);
    spawnShard(safe[Math.floor(state.rng()*safe.length)],-116);
  }

  function spawnCrawlerChain(){
    // Crawlers: low, wide, semi-transparent, 3 in a chain
    const lane=Math.floor(state.rng()*state.lanes);
    const dir=state.rng()>0.5?1:-1;
    for(let i=0;i<3;i++)state.obstacles.push({lanes:[clamp(lane+i*dir,0,state.lanes-1)],y:-56-i*72,h:18,kind:"crawler",passed:false,hit:false,elite:false});
    if(state.rng()>0.25)spawnShard(clamp(lane-dir,0,state.lanes-1),-250);
  }

  function spawnSpine(){
    // Spine: tall narrow rhombus, violet, elite
    const lane=Math.floor(state.rng()*state.lanes);
    state.obstacles.push({lanes:[lane],y:-56,h:52,kind:"spine",passed:false,hit:false,elite:true});
    spawnShard((lane+2)%state.lanes,-130);
  }

  function spawnBossWave(){
    // Sentinels: triple concentric rings
    const gap=Math.floor(state.rng()*state.lanes);
    for(let row=0;row<3;row++){
      const lanes=[];
      for(let i=0;i<state.lanes;i++)if(i!==((gap+row)%state.lanes))lanes.push(i);
      state.obstacles.push({lanes,y:-56-row*96,h:36,kind:"sentinel",passed:false,hit:false,elite:row===2});
    }
  }

  function spawnChaos(){spawnDouble();if(state.rng()>0.5)spawnSpine();}
  function spawnShardLine(){
    const lane=Math.floor(state.rng()*state.lanes);
    for(let i=0;i<4;i++)spawnShard(lane,-90-i*58);
  }

  function spawnShard(lane,y){
    const rareChance=0.05+bonus("rare")*0.02;
    const rare=state.rng()<rareChance;
    state.shards.push({lane,y,pulse:state.rng()*Math.PI*2,value:rare?3:state.overdrive>0?2:1,rare});
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OBSTACLE UPDATE — near-miss wake + lane flash
  // ─────────────────────────────────────────────────────────────────────────────

  function updateObstacles(dt){
    const playerLane=laneFromX(state.playerX);
    for(const ob of state.obstacles){
      ob.y+=state.speed*dt;
      if(!ob.passed&&ob.y>state.playerY+38){
        ob.passed=true;
        const close=ob.lanes.some(l=>Math.abs(l-playerLane)===1);
        if(close){
          state.run.nearMisses+=1;gainCombo(1);
          state.energy=Math.min(100,state.energy+energyGain(4));
          // WAKE STROKE — the signature near-miss visual
          spawnWake(playerLane,ob.lanes.find(l=>Math.abs(l-playerLane)===1));
          // Lane-edge flash
          spawnLaneFlash(playerLane);
          // First near-miss of a run: wake is 50% larger (taught in code via wake.firstRun)
          if(state.run.nearMisses===1&&state.wakes.length>0)state.wakes[state.wakes.length-1].scale=1.5;
          if(state.run.nearMisses%10===0)markViral("Near Miss Reel");
          updateBoostRing();
        }
      }
      if(ob.hit)continue;
      if(ob.lanes.includes(playerLane)&&Math.abs(ob.y-state.playerY)<34){
        if(state.overdrive>0&&!ob.elite||state.overdrive>1.2||state.invincible>0){
          ob.hit=true;
          const breakScore=35*Math.max(1,state.combo)*(1+bonus("boostScore")*0.06);
          state.score+=breakScore;state.run.hazardsBroken+=1;
          state.energy=Math.min(100,state.energy+energyGain(2));
          // Implosion-then-burst shatter
          spawnImplodeBurst(laneCenter(playerLane),ob.y,selectedSkin().accent);
          playSound("break");
          updateBoostRing();
        } else if(consumeSafety()){
          ob.hit=true;state.stageHits+=1;state.run.shieldHits+=1;
          state.invincible=1.2;state.shake=10;
          markViral("Shield Clutch");
          shieldFlash();
        } else {
          state.shake=16;endRun();return;
        }
      }
    }
    state.obstacles=state.obstacles.filter(ob=>ob.y<state.h+96&&!ob.hit);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WAKE STROKES — near-miss brushmarks
  // ─────────────────────────────────────────────────────────────────────────────

  function spawnWake(playerLane,obstacleLane){
    const px=laneCenter(playerLane);
    const ox=laneCenter(obstacleLane);
    const dir=ox>px?1:-1;
    state.wakes.push({
      x:px,y:state.playerY,
      cx:px+dir*state.laneW*0.5,cy:state.playerY-40,
      ex:px+dir*state.laneW*0.9,ey:state.playerY-90,
      life:0.4,maxLife:0.4,
      scale:1.0,
      color:C.wake,
    });
    // If high combo, secondary amber afterglow
    if(state.combo>=10){
      state.wakes.push({
        x:px,y:state.playerY,
        cx:px+dir*state.laneW*0.5,cy:state.playerY-38,
        ex:px+dir*state.laneW*0.9,ey:state.playerY-88,
        life:0.4,maxLife:0.4,
        scale:1.0,
        color:C.reward,
        secondary:true,
      });
    }
    // Keep within max
    if(state.wakes.length>PERF.maxWakes)state.wakes=state.wakes.slice(-PERF.maxWakes);
  }

  function spawnLaneFlash(playerLane){
    // Flash the two adjacent lanes at the track edge
    for(const dl of [-1,1]){
      const fl=playerLane+dl;
      if(fl>=0&&fl<state.lanes){
        state.particles.push({
          x:laneCenter(fl),y:state.playerY,
          vx:0,vy:0,
          life:0.1,size:state.laneW*0.9,
          color:C.wake,
          isFlash:true,
        });
      }
    }
  }

  function updateWakes(dt){
    state.wakes=state.wakes.filter(w=>{w.life-=dt;return w.life>0;});
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // IMPLOSION BURST — obstacle shatter when Boost hits
  // ─────────────────────────────────────────────────────────────────────────────

  function spawnImplodeBurst(x,y,color){
    // 80ms: fragments fly inward (negative velocity toward center)
    for(let i=0;i<8;i++){
      const a=Math.random()*Math.PI*2;
      state.particles.push({x:x+Math.cos(a)*32,y:y+Math.sin(a)*32,vx:-Math.cos(a)*180,vy:-Math.sin(a)*180,life:0.08,size:3,color:C.danger,isImplosion:true});
    }
    // Then 8 radial lines burst outward
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      state.sparks.push({x,y:y,vx:Math.cos(a)*220,vy:Math.sin(a)*220,vy2:0,life:0.12,color:C.boost,isLine:true,len:40});
    }
  }

  function shieldFlash(){
    // White concentric ring
    state.particles.push({x:state.playerX,y:state.playerY,vx:0,vy:0,life:0.4,size:80,color:C.ghost,isRing:true,ringR:0,ringMaxR:80});
  }

  function consumeSafety(){
    if(state.shieldAvailable){state.shieldAvailable=false;return true;}
    if(state.earnedExtraLife){state.earnedExtraLife=false;return true;}
    if(currentStage().kind==="boss"&&bonus("bossGuard")>0&&state.run.shieldHits<bonus("bossGuard"))return true;
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SHARD UPDATE
  // ─────────────────────────────────────────────────────────────────────────────

  function updateShards(dt){
    const playerLane=laneFromX(state.playerX);
    for(const shard of state.shards){
      shard.y+=state.speed*dt;shard.pulse+=dt*8;
      if(!shard.collected&&shard.lane===playerLane&&Math.abs(shard.y-state.playerY)<38){
        shard.collected=true;
        const value=Math.round(shard.value*(1+bonus("shardValue")*0.03));
        state.run.shards+=value;
        if(shard.rare)state.run.rareShards+=1;
        state.energy=Math.min(100,state.energy+energyGain(11*shard.value));
        state.score+=42*value*Math.max(1,state.combo*0.5);
        gainCombo(1);
        // 3-ring expand feedback for rare; single ring for common
        spawnShardRings(laneCenter(shard.lane),shard.y,shard.rare);
        playSound("shard");
        updateBoostRing();
      }
    }
    state.shards=state.shards.filter(s=>s.y<state.h+60&&!s.collected);
  }

  function spawnShardRings(x,y,rare){
    const color=rare?C.wake:C.reward;
    const count=rare?3:1;
    for(let i=0;i<count;i++){
      state.particles.push({x,y,vx:0,vy:0,life:0.2+i*0.06,size:(i+1)*8,color,isRing:true,ringR:(i+1)*4,ringMaxR:(i+1)*20});
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMBO
  // ─────────────────────────────────────────────────────────────────────────────

  function gainCombo(amount){
    state.combo=Math.min(maxComboCap(),Math.floor(state.combo+amount));state.comboTimer=2.2;
    state.run.maxCombo=Math.max(state.run.maxCombo,Math.floor(state.combo));
    if(state.combo>=30&&state.run.viralMoments<3)markViral("Crazy Combo");
  }
  function markViral(label){
    state.run.viralMoments+=1;state.run.highlight=label;
    addMessage(label,state.playerX,state.playerY-76,C.reward);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PARTICLES / SPARKS / FRAGMENTS
  // ─────────────────────────────────────────────────────────────────────────────

  function updateParticles(dt){
    for(const p of state.particles){
      if(!p.isRing&&!p.isFlash){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;}
      if(p.isRing){p.ringR+=(p.ringMaxR-p.ringR)*dt*8;}
      p.life-=dt;
    }
    for(const s of state.sparks){
      s.x+=(s.vx||0)*dt;s.y+=(s.vy||0)*dt;
      s.life-=dt;
    }
    for(const m of state.messages){m.y-=30*dt;m.life-=dt;}
    state.particles=state.particles.filter(p=>p.life>0).slice(-PERF.maxParticles);
    state.sparks=state.sparks.filter(s=>s.life>0).slice(-PERF.maxSparks);
    state.messages=state.messages.filter(m=>m.life>0);
  }

  function updateFragments(dt){
    for(const f of state.fragments){
      f.x+=f.vx*dt;f.y+=f.vy*dt;
      f.vy+=90*dt;
      f.rot+=f.rotV*dt;
      f.life-=dt;
    }
    state.fragments=state.fragments.filter(f=>f.life>0);
  }

  function maybeAddSpeedSparks(dt,stage){
    if(state.rng()>dt*(20+stage.number*0.35))return;
    const zone=currentZone();
    state.sparks.push({x:state.trackX+state.rng()*state.trackW,y:-20,vy:state.speed*(0.8+state.rng()*0.5),life:0.5+state.rng()*0.7,color:state.rng()>0.5?zone.color:C.reward});
  }

  function burst(x,y,color,count,power){
    const cap=Math.floor(count*PERF.burstScale);
    for(let i=0;i<cap;i++){
      const a=Math.random()*Math.PI*2,s=(40+Math.random()*120)*power*0.14;
      state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.32+Math.random()*0.42,size:2+Math.random()*5,color});
    }
  }

  function addMessage(text,x,y,color){state.messages.push({text,x,y,color,life:0.9});}

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAWING
  // ─────────────────────────────────────────────────────────────────────────────

  function draw(now){
    const inGame=state.screen==="playing"||state.screen==="gameover";
    const shakeX=state.shake?(Math.random()-0.5)*state.shake:0;
    const shakeY=state.shake?(Math.random()-0.5)*state.shake:0;
    ctx.save();
    if(inGame)ctx.translate(shakeX,shakeY);
    drawBackground(now);
    drawTrack(now);
    drawZoneAtmosphere(now);
    if(state.screen==="playing"||state.screen==="gameover"){
      drawGhost();
      drawSparks();
      drawWakes(now);
      drawShards(now);
      drawObstacles(now);
      drawPlayer(now);
      drawParticles();
      drawFragments(now);
      drawMessages();
      drawBoostCinema(now);
      drawStageBeam(now);
      drawBossReveal(now);
    } else if(state.screen==="menu"){
      drawMenuGhost(now);
    }
    ctx.restore();
  }

  // ── Background ───────────────────────────────────────────────────────────────

  function drawBackground(now){
    // Solid void base
    ctx.fillStyle=C.void;
    ctx.fillRect(0,0,state.w,state.h);
    // Subtle diagonal scan lines
    ctx.save();
    ctx.globalAlpha=0.06;
    ctx.strokeStyle="#ffffff";ctx.lineWidth=1;
    const spacing=50;
    const offset=((state.time||now)*state.speed*0.12%spacing+spacing)%spacing;
    for(let y=-spacing;y<state.h+spacing;y+=spacing){
      ctx.beginPath();ctx.moveTo(0,y+offset);ctx.lineTo(state.w,y+offset+22);ctx.stroke();
    }
    ctx.restore();
    // Subtle ambient orbs (zone-tinted)
    const zone=currentZone();
    ctx.save();
    ctx.globalAlpha=0.08+Math.sin((now||0)*1.2)*0.03;
    ctx.fillStyle=zone.color;
    ctx.beginPath();ctx.arc(state.trackX+state.trackW*0.1,state.h*0.15,100,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=0.07;
    ctx.fillStyle=C.reward;
    ctx.beginPath();ctx.arc(state.trackX+state.trackW*0.88,state.h*0.88,130,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  // ── Zone-specific atmosphere layers ──────────────────────────────────────────

  function drawZoneAtmosphere(now){
    const zoneId=save.selectedZone;
    const t=state.time||now||0;
    ctx.save();

    if(zoneId==="neon_city"){
      // 3 parallax building silhouette layers
      drawBuildingSilhouettes(now,0.1,0.20,state.h*0.4);
      drawBuildingSilhouettes(now,0.2,0.36,state.h*0.55);
      // Neon reflections on track surface
      ctx.globalAlpha=0.18;
      ctx.fillStyle=C.danger;
      ctx.fillRect(state.trackX+3,state.playerY+40,6,state.h);
      ctx.fillStyle=C.wake;
      ctx.fillRect(state.trackX+state.trackW-9,state.playerY+40,6,state.h);
    }

    if(zoneId==="quantum_core"){
      // Hex grid overlay
      ctx.globalAlpha=0.06;ctx.strokeStyle=C.perfect;ctx.lineWidth=1;
      const hexSize=28,hexH=hexSize*Math.sqrt(3);
      const scrollY=(t*state.speed*0.04)%hexH;
      for(let row=-1;row<state.h/hexH+2;row++){
        for(let col=-1;col<state.w/(hexSize*1.5)+2;col++){
          const cx=col*hexSize*1.5;
          const cy=row*hexH+(col%2===0?0:hexH/2)-scrollY;
          drawHex(cx,cy,hexSize-4);
        }
      }
      // Data cascade columns
      ctx.globalAlpha=0.07;ctx.fillStyle=C.perfect;
      const numCols=Math.floor(state.trackW/60);
      for(let i=0;i<numCols;i++){
        const cx=state.trackX+i*60;
        const yOff=((t*220+i*37)%(state.h+100))-50;
        ctx.fillRect(cx,yOff,3,60);
      }
      // Radial pulse ring
      const pulsePeriod=3,pulseT=t%pulsePeriod;
      const pulseR=(pulseT/pulsePeriod)*Math.max(state.w,state.h)*0.7;
      ctx.globalAlpha=Math.max(0,0.06*(1-pulseT/pulsePeriod));
      ctx.strokeStyle=C.perfect;ctx.lineWidth=80;
      ctx.beginPath();ctx.arc(state.w/2,state.h/2,pulseR,0,Math.PI*2);ctx.stroke();
    }

    if(zoneId==="void_network"){
      // Void: almost nothing — occasional floor drop (purely visual)
      if(Math.floor(t*2)%5===0){
        const sectionY=state.h*0.6;
        ctx.globalAlpha=0.04*(1-(t%0.5)/0.5);
        ctx.fillStyle=C.void;
        ctx.fillRect(state.trackX,sectionY,state.trackW,40);
      }
    }

    if(zoneId==="glitch_dimension"){
      // Magenta tint on track
      ctx.globalAlpha=0.04;ctx.fillStyle="#FF00AA";
      ctx.fillRect(state.trackX,0,state.trackW,state.h);
      // Horizontal tears
      for(const tear of state.glitchTears){
        ctx.save();
        ctx.globalAlpha=tear.life*8*0.4;
        ctx.drawImage(canvas,0,tear.y,state.w,tear.h,tear.dx,tear.y,state.w,tear.h);
        ctx.restore();
      }
    }

    if(zoneId==="singularity"){
      // Amber/orange temperature tint
      ctx.globalAlpha=0.06;ctx.fillStyle=C.boost;
      ctx.fillRect(0,0,state.w,state.h);
      // Radial distortion fake: dark vignette that "warps" toward center
      const radGrad=ctx.createRadialGradient(state.w/2,state.h/2,100,state.w/2,state.h/2,state.w*0.7);
      radGrad.addColorStop(0,"rgba(0,0,0,0)");
      radGrad.addColorStop(1,"rgba(0,0,0,0.22)");
      ctx.fillStyle=radGrad;ctx.globalAlpha=1;
      ctx.fillRect(0,0,state.w,state.h);
    }

    if(zoneId==="pulse_nexus"){
      // White strobe — single frame flash every ~4s
      if(Math.floor(t*60)%240===0){
        ctx.globalAlpha=0.08;ctx.fillStyle="#ffffff";
        ctx.fillRect(0,0,state.w,state.h);
      }
      // White core line down track center
      ctx.globalAlpha=0.5;ctx.strokeStyle=C.ghost;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(state.w/2,0);ctx.lineTo(state.w/2,state.h);ctx.stroke();
    }

    ctx.restore();
  }

  function drawBuildingSilhouettes(now,speedMul,alpha,maxH){
    const t=state.time||now||0;
    ctx.globalAlpha=alpha;ctx.fillStyle="#0A0B12";
    const scroll=(t*state.speed*speedMul)%180;
    for(let i=-1;i<state.w/60+2;i++){
      const bx=i*60-scroll%60;
      const bh=maxH*(0.4+((i*7+Math.floor(scroll/60))%11)/18);
      ctx.fillRect(state.trackX-120+bx,state.h-bh,52,bh);
    }
  }

  function drawHex(cx,cy,r){
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const a=(Math.PI/3)*i;
      if(i===0)ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
      else ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
    }
    ctx.closePath();ctx.stroke();
  }

  // ── Track ────────────────────────────────────────────────────────────────────

  function drawTrack(now){
    const x=state.trackX,w=state.trackW,bottom=state.h+40,top=-40;
    ctx.save();
    ctx.fillStyle="rgba(10,11,18,0.68)";
    roundRect(ctx,x,top,w,bottom-top,8);ctx.fill();

    // Lane dividers — dashed, with optional materialise reveal
    const mat=state.trackMaterialise!==undefined?state.trackMaterialise:0;
    const matY=mat>0?state.h*(1-mat):0; // lines reveal top-to-bottom

    ctx.strokeStyle="rgba(255,255,255,0.09)";ctx.lineWidth=1;
    for(let i=1;i<state.lanes;i++){
      const lx=x+i*state.laneW;
      ctx.setLineDash([9,18]);
      ctx.lineDashOffset=-(state.time||0)*state.speed*0.05;
      ctx.beginPath();
      ctx.moveTo(lx,mat>0?matY:top);
      ctx.lineTo(lx,bottom);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Track border — ghost white at low alpha, boosts to visible during overdrive
    ctx.globalAlpha=state.overdrive>0?0.38:0.14;
    ctx.strokeStyle=state.overdrive>0?C.boost:C.ghost;
    ctx.lineWidth=state.overdrive>0?2.5:1;
    roundRect(ctx,x+4,top+4,w-8,bottom-top-8,8);ctx.stroke();

    // Scan line
    const scanY=((((now||0)*140)%(state.h+140))-70);
    const scan=ctx.createLinearGradient(0,scanY-60,0,scanY+60);
    scan.addColorStop(0,"rgba(200,240,255,0)");
    scan.addColorStop(0.5,"rgba(200,240,255,0.08)");
    scan.addColorStop(1,"rgba(200,240,255,0)");
    ctx.fillStyle=scan;ctx.globalAlpha=1;
    ctx.fillRect(x,scanY-60,w,120);
    ctx.restore();
  }

  // ── Ghost replay ─────────────────────────────────────────────────────────────

  function drawGhost(){
    if(!state.ghostReplay?.lanes?.length)return;
    const sample=state.ghostReplay.lanes.reduce((prev,item)=>item[0]<=state.time?item:prev,state.ghostReplay.lanes[0]);
    const x=laneCenter(sample[1]);
    ctx.save();
    ctx.globalAlpha=0.22;ctx.fillStyle=C.ghost;
    ctx.beginPath();drawTearPath(ctx,x,state.playerY+18,14,20);ctx.fill();
    ctx.restore();
  }

  // ── WAKE STROKES — the signature near-miss brushmarks ────────────────────────

  function drawWakes(now){
    ctx.save();
    for(const w of state.wakes){
      const alpha=w.life/w.maxLife;
      const width=(w.secondary?4:18)*w.scale*(alpha);
      ctx.globalAlpha=Math.max(0,w.secondary?alpha*0.3:alpha*0.7);
      ctx.strokeStyle=w.color;
      ctx.lineWidth=Math.max(0.5,width);
      ctx.lineCap="round";
      ctx.beginPath();
      ctx.moveTo(w.x,w.y);
      ctx.quadraticCurveTo(w.cx,w.cy,w.ex,w.ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── OBSTACLES — 4 visual families ────────────────────────────────────────────

  function drawObstacles(now){
    ctx.save();
    for(const ob of state.obstacles){
      for(const lane of ob.lanes){
        const ox=state.trackX+lane*state.laneW+8;
        const ow=state.laneW-16;
        const oy=ob.y-ob.h/2;

        if(ob.kind==="bulkhead"){
          // Flat danger red with bright top-edge telegraph
          const g=ctx.createLinearGradient(ox,oy,ox+ow,oy+ob.h);
          g.addColorStop(0,C.danger);g.addColorStop(1,"#230010");
          ctx.fillStyle=g;
          roundRect(ctx,ox,oy,ow,ob.h,6);ctx.fill();
          if(PERF.shadowBlur){ctx.shadowColor=C.danger;ctx.shadowBlur=12;}
          // Top edge telegraph: amber heat signature
          ctx.fillStyle=C.reward;ctx.globalAlpha=0.72;
          ctx.fillRect(ox+4,oy,ow-8,3);
          ctx.globalAlpha=1;ctx.shadowBlur=0;

        } else if(ob.kind==="spine"){
          // Tall narrow violet rhombus
          const cx=ox+ow/2,cy=ob.y;
          const hw=ow*0.36,hh=ob.h/2;
          if(PERF.shadowBlur){ctx.shadowColor=C.spine;ctx.shadowBlur=16;}
          ctx.fillStyle=C.spine;
          ctx.beginPath();
          ctx.moveTo(cx,cy-hh);ctx.lineTo(cx+hw,cy);ctx.lineTo(cx,cy+hh);ctx.lineTo(cx-hw,cy);
          ctx.closePath();ctx.fill();
          ctx.shadowBlur=0;
          // Violet lane hint (flat fallback always visible)
          ctx.globalAlpha=0.18;ctx.fillStyle=C.spine;
          ctx.fillRect(ox,oy-12,ow,6);
          ctx.globalAlpha=1;

        } else if(ob.kind==="crawler"){
          // Low wide semi-transparent
          ctx.globalAlpha=0.58;
          ctx.fillStyle=C.danger;
          roundRect(ctx,ox-2,oy,ow+4,ob.h,4);ctx.fill();
          ctx.globalAlpha=1;
          // Scan-line top edge
          ctx.fillStyle="rgba(255,255,255,0.35)";
          ctx.fillRect(ox,oy,ow,2);

        } else if(ob.kind==="sentinel"){
          // Concentric triple rect — looks like depth
          const scales=[1,0.7,0.45];
          const alphas=[0.3,0.6,1.0];
          const pulse=0.08*Math.sin((now||0)*6+lane);
          for(let r=0;r<3;r++){
            const s=scales[r]*(1+pulse);
            const rw=ow*s,rh=ob.h*s;
            const rx=ox+(ow-rw)/2,ry=ob.y-rh/2;
            ctx.globalAlpha=alphas[r];
            ctx.fillStyle=C.danger;
            roundRect(ctx,rx,ry,rw,rh,5);ctx.fill();
          }
          ctx.globalAlpha=1;

        } else {
          // Fallback: flat danger rect
          ctx.fillStyle=C.danger;
          roundRect(ctx,ox,oy,ow,ob.h,6);ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // ── SHARDS ───────────────────────────────────────────────────────────────────

  function drawShards(now){
    ctx.save();
    for(const shard of state.shards){
      const x=laneCenter(shard.lane);
      const r=(shard.rare?12:9)+Math.sin(shard.pulse)*2;
      ctx.save();
      ctx.translate(x,shard.y);ctx.rotate(Math.PI/4);
      if(PERF.shadowBlur){ctx.shadowColor=shard.rare?C.wake:C.reward;ctx.shadowBlur=18;}
      ctx.fillStyle=shard.rare?C.wake:C.reward;
      roundRect(ctx,-r,-r,r*2,r*2,3);ctx.fill();
      ctx.shadowBlur=0;
      // Cross flash
      ctx.globalAlpha=0.38;ctx.fillStyle=shard.rare?C.danger:C.ghost;
      ctx.fillRect(-2,-r,4,r*2);ctx.fillRect(-r,-2,r*2,4);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── PLAYER — teardrop with filament trails ────────────────────────────────────

  function drawPlayer(now){
    const skin=selectedSkin();
    const bob=Math.sin((now||0)*8)*2;
    const x=state.playerX,y=state.playerY+bob;
    const inv=state.invincible>0&&Math.floor((now||0)*16)%2===0;
    if(state.runEnded)return; // fragments take over on death

    ctx.save();
    if(inv)ctx.globalAlpha=0.5;
    ctx.translate(x,y);

    const overdriving=state.overdrive>0;
    const bodyColor=overdriving?C.reward:skin.color;
    const trailColor=overdriving?C.boost:C.wake;
    const filamentWidth=overdriving?4:1.5;

    // Filament trails — two thin lines trailing behind
    const trailLen=overdriving?90:60;
    const trailAlpha=overdriving?0.9:0.7;
    for(const side of [-1,1]){
      const tx=side*10;
      const grad=ctx.createLinearGradient(tx,18,tx,18+trailLen);
      grad.addColorStop(0,trailColor);
      grad.addColorStop(1,"rgba(0,0,0,0)");
      ctx.globalAlpha=trailAlpha;
      ctx.strokeStyle=trailColor;ctx.lineWidth=filamentWidth;ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(tx,14);ctx.lineTo(tx+(side*Math.sin((now||0)*12)*3),18+trailLen);ctx.stroke();
    }
    ctx.globalAlpha=1;

    // Body glow
    if(PERF.shadowBlur){ctx.shadowColor=overdriving?C.boost:skin.color;ctx.shadowBlur=overdriving?36:20;}

    // Teardrop body: wider at top (nose), tapering at bottom (tail)
    ctx.fillStyle=bodyColor;
    drawTearPath(ctx,0,0,22,38);
    ctx.fill();

    // Inner highlight
    ctx.shadowBlur=0;
    ctx.fillStyle="#ffffff";
    ctx.globalAlpha=0.7;
    drawTearPath(ctx,0,-4,10,16);
    ctx.fill();
    ctx.globalAlpha=1;

    // Shockwave ring during boost
    if(overdriving){
      const ring=state.overdrive%0.32;
      const rp=ring/0.32;
      const rw=40+rp*40,rh=12+rp*12;
      ctx.globalAlpha=(1-rp)*0.55;
      ctx.strokeStyle=C.boost;ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(0,-20,rw/2,rh/2,0,0,Math.PI*2);ctx.stroke();
    }

    ctx.restore();
  }

  // Draw teardrop path — wider at top, pointed at bottom
  function drawTearPath(context,cx,cy,hw,hh){
    context.beginPath();
    context.moveTo(cx,cy-hh);   // nose (top)
    context.bezierCurveTo(cx+hw,cy-hh*0.4, cx+hw*0.7,cy+hh*0.5, cx,cy+hh); // right
    context.bezierCurveTo(cx-hw*0.7,cy+hh*0.5, cx-hw,cy-hh*0.4, cx,cy-hh); // left
    context.closePath();
  }

  // ── PARTICLES ────────────────────────────────────────────────────────────────

  function drawParticles(){
    ctx.save();
    for(const p of state.particles){
      const alpha=Math.max(0,p.life*2.0);
      ctx.globalAlpha=alpha;
      ctx.fillStyle=p.color;
      if(p.isFlash){
        // Lane flash: wide low-alpha rect
        ctx.globalAlpha=p.life*4;
        ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
      } else if(p.isRing){
        ctx.globalAlpha=alpha;
        ctx.strokeStyle=p.color;ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(p.x,p.y,p.ringR||0,0,Math.PI*2);ctx.stroke();
      } else {
        ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── SPARKS ───────────────────────────────────────────────────────────────────

  function drawSparks(){
    ctx.save();
    for(const s of state.sparks){
      ctx.globalAlpha=Math.max(0,s.life);
      ctx.strokeStyle=s.color;ctx.lineWidth=2;
      if(s.isLine){
        // Radial burst line
        ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+(s.vx||0)*0.06,s.y+(s.vy||0)*0.06);ctx.stroke();
      } else {
        ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x,s.y+22);ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── DEATH FRAGMENTS — 12 teardrops ──────────────────────────────────────────

  function drawFragments(now){
    if(!state.fragments.length)return;
    ctx.save();
    for(const f of state.fragments){
      const alpha=Math.max(0,f.life/f.maxLife);
      ctx.globalAlpha=alpha;
      ctx.save();
      ctx.translate(f.x,f.y);ctx.rotate(f.rot);
      ctx.fillStyle=f.color;
      drawTearPath(ctx,0,0,22*f.scale,36*f.scale);ctx.fill();
      // Tiny filament trail on each fragment
      ctx.strokeStyle=C.wake;ctx.lineWidth=1;ctx.globalAlpha=alpha*0.5;
      ctx.beginPath();ctx.moveTo(0,14*f.scale);ctx.lineTo(0,14*f.scale+20*alpha);ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ── MESSAGES ─────────────────────────────────────────────────────────────────

  function drawMessages(){
    ctx.save();
    ctx.font="800 15px 'DM Mono', monospace";
    ctx.textAlign="center";ctx.textBaseline="middle";
    for(const m of state.messages){
      ctx.globalAlpha=Math.max(0,Math.min(1,m.life*2));
      ctx.fillStyle=m.color;
      if(PERF.shadowBlur){ctx.shadowColor=m.color;ctx.shadowBlur=10;}
      ctx.fillText(m.text,m.x,m.y);
    }
    ctx.restore();
  }

  // ── BOOST CINEMA ─────────────────────────────────────────────────────────────
  // Frame 0-80ms: white radial flash, obstacles desaturate
  // Frame 80-200ms: speed lines burst
  // Tail: background brightens

  function drawBoostCinema(now){
    if(state.boostCinema<=0)return;
    const elapsed=2.0-state.boostCinema;
    ctx.save();

    if(elapsed<0.08){
      // Radial white flash
      const pct=1-(elapsed/0.08);
      ctx.globalAlpha=pct*0.88;
      ctx.fillStyle="#ffffff";
      ctx.fillRect(0,0,state.w,state.h);

    } else if(elapsed<0.2){
      // Speed lines
      const pct=1-((elapsed-0.08)/0.12);
      ctx.globalAlpha=pct*0.55;
      ctx.strokeStyle="#ffffff";ctx.lineWidth=1.5;
      for(let i=0;i<12;i++){
        const a=(i/12)*Math.PI*2;
        const len=60+Math.random()*80;
        const sx=state.playerX+Math.cos(a)*20,sy=state.playerY+Math.sin(a)*20;
        ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*len,sy+Math.sin(a)*len);ctx.stroke();
      }

    } else if(state.boostCinema<0.1){
      // Reverse flash at end of boost
      const pct=state.boostCinema/0.1;
      ctx.globalAlpha=pct*0.55;
      ctx.fillStyle=C.reward;
      ctx.fillRect(0,0,state.w,state.h);
    }

    // Background brightens during boost
    if(elapsed>0.2&&state.boostCinema>0.1){
      ctx.globalAlpha=0.06;
      ctx.fillStyle="#ffffff";
      ctx.fillRect(0,0,state.w,state.h);
    }

    ctx.restore();
  }

  // ── STAGE CLEAR BEAM ─────────────────────────────────────────────────────────

  function drawStageBeam(now){
    if(state.stageBeam<=0)return;
    const pct=1-(state.stageBeam/0.4);
    const beamY=pct*state.h*1.4-80;
    ctx.save();
    ctx.globalAlpha=Math.sin(Math.min(pct*Math.PI,Math.PI))*0.8;
    ctx.fillStyle=C.perfect;
    ctx.fillRect(0,beamY,state.w,4);
    ctx.restore();
  }

  // ── BOSS REVEAL ──────────────────────────────────────────────────────────────

  function drawBossReveal(now){
    if(state.bossReveal<=0)return;
    const elapsed=1.4-state.bossReveal;
    ctx.save();

    // Warm background tint
    ctx.globalAlpha=Math.min(elapsed/0.6,1)*0.12;
    ctx.fillStyle=C.danger;
    ctx.fillRect(0,0,state.w,state.h);

    // Boss name fades in then drifts upward
    if(elapsed>0.3){
      const textElapsed=elapsed-0.3;
      const fadeIn=Math.min(textElapsed/0.4,1);
      const driftY=state.h/2-textElapsed*30;
      ctx.globalAlpha=fadeIn*(1-Math.max(0,(textElapsed-0.4)/0.7));
      ctx.fillStyle=C.danger;
      ctx.font="700 2.8rem 'DM Mono', monospace";
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(state.bossRevealName.replace("Boss:","").trim(),state.w/2,driftY);
    }
    ctx.restore();
  }

  // ── MENU GHOST ───────────────────────────────────────────────────────────────

  function drawMenuGhost(now){
    if(!menuGhost.active)return;
    ctx.save();
    ctx.globalAlpha=0.14;
    ctx.translate(menuGhost.x,state.playerY);
    ctx.fillStyle=C.ghost;
    drawTearPath(ctx,0,0,22,38);ctx.fill();
    // Trailing filaments
    ctx.strokeStyle=C.wake;ctx.lineWidth=1.5;ctx.globalAlpha=0.08;
    for(const side of [-1,1]){
      ctx.beginPath();ctx.moveTo(side*10,14);ctx.lineTo(side*10,80);ctx.stroke();
    }
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HUD + BOOST RING UPDATE
  // ─────────────────────────────────────────────────────────────────────────────

  function updateHud(){
    els.stage.textContent=format(state.stageIndex);
    els.score.textContent=format(state.displayedScore);
    els.best.textContent=format(Math.max(save.best,state.score));
    const ready=state.energy>=100;
    els.boost.classList.toggle("ready",ready);
    updateBoostRing();
  }

  function updateBoostRing(){
    if(!els.boostRingFill)return;
    const pct=clamp(state.energy/100,0,1);
    const dashLen=pct*RING_CIRC;
    els.boostRingFill.setAttribute("stroke-dasharray",`${dashLen} ${RING_CIRC}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMBO DRAW (on-canvas, escalating)
  // ─────────────────────────────────────────────────────────────────────────────

  // Combo drawn on canvas — escalates in size and color
  function drawComboOverlay(now){
    if(state.combo<=1)return;
    const combo=Math.floor(state.combo);
    // Size escalation
    let fontSize=14,color=C.muted,flash=false;
    if(combo>=40){fontSize=32;color="#ffffff";flash=Math.floor((now||0)*4)%2===0;}
    else if(combo>=20){fontSize=22;color=C.ghost;}
    else if(combo>=10){fontSize=18;color=C.reward;}
    else if(combo>=5){fontSize=16;color=C.reward;}

    ctx.save();
    ctx.globalAlpha=flash?0.6:0.85;
    ctx.font=`800 ${fontSize}px 'DM Mono', monospace`;
    ctx.textAlign="left";ctx.textBaseline="bottom";
    if(PERF.shadowBlur&&combo>=10){ctx.shadowColor=color;ctx.shadowBlur=8;}
    ctx.fillStyle=color;
    ctx.fillText(`${combo}x`,state.trackX+8,state.playerY-10);
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────────────────────────────────────

  function toast(text){
    els.toast.textContent=text;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer=window.setTimeout(()=>els.toast.classList.remove("show"),1600);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AUDIO
  // ─────────────────────────────────────────────────────────────────────────────

  function ensureAudio(){
    if(!save.sound||audioCtx)return;
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return;
    audioCtx=new AudioContext();
  }
  function playSound(type){
    if(!save.sound||!audioCtx)return;
    const map={start:[220,360,0.09],select:[420,560,0.04],buy:[360,720,0.12],shard:[660,940,0.06],boost:[140,680,0.18],break:[120,80,0.08],crash:[90,42,0.2],error:[160,120,0.1]};
    const[from,to,duration]=map[type]||map.select;
    const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
    const now=audioCtx.currentTime;
    osc.type=type==="crash"?"sawtooth":"triangle";
    osc.frequency.setValueAtTime(from,now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1,to),now+duration);
    gain.gain.setValueAtTime(0.0001,now);
    gain.gain.exponentialRampToValueAtTime(type==="boost"?0.16:0.07,now+0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    osc.connect(gain);gain.connect(audioCtx.destination);
    osc.start(now);osc.stop(now+duration+0.02);
  }
  function vibrate(pattern){if(save.haptics&&navigator.vibrate)navigator.vibrate(pattern);}

  // ─────────────────────────────────────────────────────────────────────────────
  // AD BRIDGE
  // ─────────────────────────────────────────────────────────────────────────────

  const AdBridge={
    async showRewarded(placement){
      const admob=window.Capacitor?.Plugins?.AdMob;
      const unit=window.PULSEBREAK_AD_UNITS?.rewarded||AD_UNITS.rewarded;
      if(admob&&unit&&!unit.startsWith("REPLACE_")){
        try{
          if(typeof admob.prepareRewardVideoAd==="function")await admob.prepareRewardVideoAd({adId:unit,isTesting:false});
          if(typeof admob.showRewardVideoAd==="function"){await admob.showRewardVideoAd();return true;}
        }catch(error){console.warn("Rewarded ad failed",placement,error);}
      }
      return showPreviewAd(`Rewarded ${placement}`);
    }
  };

  function showPreviewAd(title){
    return new Promise(resolve=>{
      const start=performance.now();let done=false;
      els.adModal.classList.add("active");els.adModal.setAttribute("aria-hidden","false");
      els.adDone.disabled=true;
      document.getElementById("adTitle").textContent=title;
      els.adMeter.style.width="0%";
      function tick(now){
        if(done)return;
        const pct=clamp((now-start)/1800,0,1);
        els.adMeter.style.width=`${pct*100}%`;
        if(pct>=1){els.adDone.disabled=false;els.adDone.focus();return;}
        requestAnimationFrame(tick);
      }
      const finish=()=>{
        if(done||els.adDone.disabled)return;
        done=true;
        els.adModal.classList.remove("active");els.adModal.setAttribute("aria-hidden","true");
        els.adDone.removeEventListener("click",finish);
        resolve(true);
      };
      els.adDone.addEventListener("click",finish);
      requestAnimationFrame(tick);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHALLENGE CODES
  // ─────────────────────────────────────────────────────────────────────────────

  function makeChallengeCode(){
    const zone=save.selectedZone.replace(/_/g,"-").toUpperCase().slice(0,10);
    const seed=(save.lastRun?.seed||hashString(dayKey())).toString(16).toUpperCase().slice(0,6);
    const stage=String(save.lastRun?.stageReached||1).padStart(3,"0");
    const score=String(save.lastRun?.score||save.best||1000);
    const check=hashString(`${zone}-${seed}-${stage}-${score}`).toString(36).toUpperCase().slice(0,3);
    return `PBK-${zone}-${seed}-${stage}-${score}-${check}`;
  }
  function parseChallengeCode(code){
    const parts=code.trim().toUpperCase().split("-");
    if(parts[0]!=="PBK"||parts.length<6)return null;
    const score=parseInt(parts[parts.length-2],10);
    const stage=parseInt(parts[parts.length-3],10);
    const seed=parseInt(parts[parts.length-4],16);
    if(!Number.isFinite(score)||!Number.isFinite(stage)||!Number.isFinite(seed))return null;
    return{seed,score,stage};
  }
  function loadChallenge(){
    const parsed=parseChallengeCode(els.challengeInput.value);
    if(!parsed)return toast("Bad challenge code");
    save.challenge=parsed;persist();toast("Challenge loaded");startRun("challenge");
  }
  function shareRun(){
    if(!save.lastRun)return toast("No run to share");
    const text=`Pulsebreak ${format(save.lastRun.score)} · Stage ${save.lastRun.stageReached} · ${save.lastRun.highlight} · ${makeChallengeCode()}`;
    save.stats.shares+=1;updateAchievements();
    copyText(text,"Share card copied");persist();
  }
  function copyText(text,success){
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>toast(success)).catch(()=>toast(text));
    else toast(text);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CANVAS UTIL
  // ─────────────────────────────────────────────────────────────────────────────

  function roundRect(context,x,y,w,h,r){
    const radius=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);
    context.beginPath();
    context.moveTo(x+radius,y);
    context.arcTo(x+w,y,x+w,y+h,radius);
    context.arcTo(x+w,y+h,x,y+h,radius);
    context.arcTo(x,y+h,x,y,radius);
    context.arcTo(x,y,x+w,y,radius);
    context.closePath();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INPUT HANDLING
  // ─────────────────────────────────────────────────────────────────────────────

  const SWIPE_THRESHOLD=22;

  function handlePointerDown(event){
    if(state.screen!=="playing")return;
    ensureAudio();
    state.pointerId=event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    state.swipeStartX=event.clientX;
    state.swipeStartLane=state.targetLane;
    state.targetLane=laneFromX(event.clientX);
  }
  function handlePointerMove(event){
    if(state.screen!=="playing")return;
    if(state.pointerId!==null&&event.pointerId!==state.pointerId)return;
    const dx=event.clientX-(state.swipeStartX??event.clientX);
    if(Math.abs(dx)>=SWIPE_THRESHOLD&&state.swipeStartLane!==null){
      const laneDelta=Math.round(dx/state.laneW);
      state.targetLane=clamp((state.swipeStartLane??2)+laneDelta,0,state.lanes-1);
    } else {
      state.targetLane=laneFromX(event.clientX);
    }
  }
  function handlePointerUp(event){
    if(event.pointerId===state.pointerId){
      state.pointerId=null;state.swipeStartX=null;state.swipeStartLane=null;
    }
  }
  function handleKey(event){
    if(event.key==="ArrowLeft"||event.key.toLowerCase()==="a")state.targetLane=clamp(state.targetLane-1,0,state.lanes-1);
    if(event.key==="ArrowRight"||event.key.toLowerCase()==="d")state.targetLane=clamp(state.targetLane+1,0,state.lanes-1);
    if(event.key===" "||event.key==="ArrowUp"||event.key.toLowerCase()==="w"){event.preventDefault();triggerBoost();}
    if(event.key==="Escape")state.screen==="playing"?pauseGame():resumeGame();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN LOOP
  // ─────────────────────────────────────────────────────────────────────────────

  function loop(now){
    const dt=Math.min(0.033,(now-lastFrame)/1000||0);
    lastFrame=now;
    update(dt);
    const t=now/1000;
    draw(t);
    // Combo overlay drawn after main draw (on top of everything)
    if(state.screen==="playing"&&!state.runEnded)drawComboOverlay(t);
    requestAnimationFrame(loop);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT WIRING
  // ─────────────────────────────────────────────────────────────────────────────

  document.querySelectorAll(".tab-button").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
  document.getElementById("playBtn").addEventListener("click",()=>startRun("classic"));
  document.getElementById("dailyBtn").addEventListener("click",()=>startRun("daily"));
  document.getElementById("ghostBtn").addEventListener("click",()=>save.ghosts[save.selectedZone]?startRun("ghost"):toast("Set a ghost first"));
  document.getElementById("challengeBtn").addEventListener("click",loadChallenge);
  document.getElementById("pauseBtn").addEventListener("click",pauseGame);
  document.getElementById("resumeBtn").addEventListener("click",resumeGame);
  document.getElementById("pauseMenuBtn").addEventListener("click",()=>setScreen("menu"));
  document.getElementById("restartBtn").addEventListener("click",()=>startRun(state.mode));
  document.getElementById("gameOverMenuBtn").addEventListener("click",()=>setScreen("menu"));
  document.getElementById("reviveBtn").addEventListener("click",reviveRun);
  els.doubleReward.addEventListener("click",doubleRunReward);
  els.share.addEventListener("click",shareRun);
  els.lucky.addEventListener("click",luckySpin);
  els.doubleLast.addEventListener("click",doubleRunReward);
  els.boost.addEventListener("click",triggerBoost);
  els.sound.addEventListener("click",()=>{
    save.sound=!save.sound;
    if(!save.sound&&audioCtx){audioCtx.close();audioCtx=null;}
    persist();
  });
  els.haptics.addEventListener("click",()=>{save.haptics=!save.haptics;persist();});

  const passiveOpts={passive:true};
  canvas.addEventListener("pointerdown",  handlePointerDown, passiveOpts);
  canvas.addEventListener("pointermove",  handlePointerMove, passiveOpts);
  canvas.addEventListener("pointerup",    handlePointerUp,   passiveOpts);
  canvas.addEventListener("pointercancel",handlePointerUp,   passiveOpts);

  window.addEventListener("keydown",handleKey);
  window.addEventListener("resize",resize);
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.screen==="playing")pauseGame();});

  if("serviceWorker"in navigator&&location.protocol.startsWith("http"))
    navigator.serviceWorker.register("sw.js").catch(()=>{});

  ensureLiveSystems();
  resize();
  persist();
  updateHud();
  menuGhost.active=true;
  requestAnimationFrame(loop);
})();
