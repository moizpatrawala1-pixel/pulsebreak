(() => {
  "use strict";

  const STORAGE_KEY = "pulsebreak.save.v1";
  const AD_UNITS = {
    banner: "REPLACE_WITH_ADMOB_BANNER_ID",
    interstitial: "REPLACE_WITH_ADMOB_INTERSTITIAL_ID",
    rewarded: "REPLACE_WITH_ADMOB_REWARDED_ID"
  };

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const els = {
    hud: document.getElementById("hud"),
    menu: document.getElementById("menuScreen"),
    pause: document.getElementById("pauseScreen"),
    gameOver: document.getElementById("gameOverScreen"),
    score: document.getElementById("scoreText"),
    best: document.getElementById("bestText"),
    energy: document.getElementById("energyFill"),
    menuBest: document.getElementById("menuBest"),
    coins: document.getElementById("coinText"),
    runs: document.getElementById("runText"),
    skinGrid: document.getElementById("skinGrid"),
    missionList: document.getElementById("missionList"),
    finalScore: document.getElementById("finalScore"),
    earnedCoins: document.getElementById("earnedCoins"),
    finalShards: document.getElementById("finalShards"),
    finalCombo: document.getElementById("finalCombo"),
    runMode: document.getElementById("runModeText"),
    revive: document.getElementById("reviveBtn"),
    boost: document.getElementById("boostBtn"),
    toast: document.getElementById("toast"),
    adModal: document.getElementById("adModal"),
    adMeter: document.getElementById("adMeterFill"),
    adDone: document.getElementById("adDoneBtn"),
    sound: document.getElementById("soundBtn"),
    haptics: document.getElementById("hapticsBtn")
  };

  const SKINS = [
    { id: "volt", name: "Volt", color: "#37f4ff", accent: "#ffd166", cost: 0 },
    { id: "ember", name: "Ember", color: "#ff5a72", accent: "#ffd166", cost: 160 },
    { id: "mint", name: "Mint", color: "#50f2a5", accent: "#37f4ff", cost: 240 },
    { id: "royal", name: "Royal", color: "#a476ff", accent: "#ff5a72", cost: 360 },
    { id: "sunset", name: "Sunset", color: "#ffd166", accent: "#ff7f50", cost: 520 },
    { id: "mono", name: "Mono", color: "#f7f7fb", accent: "#37f4ff", cost: 740 }
  ];

  const MISSION_BANK = [
    { id: "shards30", label: "Grab 30 shards", metric: "shards", target: 30, reward: 60 },
    { id: "boost2", label: "Fire 2 boosts", metric: "boosts", target: 2, reward: 80 },
    { id: "score600", label: "Score 600", metric: "score", target: 600, reward: 90 },
    { id: "near16", label: "Clip 16 close calls", metric: "nearMisses", target: 16, reward: 110 },
    { id: "combo10", label: "Hit 10x combo", metric: "maxCombo", target: 10, reward: 130 },
    { id: "distance900", label: "Drift 900m", metric: "meters", target: 900, reward: 150 }
  ];

  const DEFAULT_SAVE = {
    best: 0,
    coins: 0,
    runs: 0,
    selectedSkin: "volt",
    unlocked: { volt: true },
    sound: true,
    haptics: true,
    missionDay: "",
    missions: []
  };

  const save = loadSave();
  const state = {
    screen: "menu",
    mode: "classic",
    lanes: 5,
    dpr: 1,
    w: 0,
    h: 0,
    trackX: 0,
    trackW: 0,
    laneW: 0,
    playerY: 0,
    playerX: 0,
    targetLane: 2,
    pointerId: null,
    score: 0,
    displayedScore: 0,
    speed: 330,
    time: 0,
    meters: 0,
    energy: 0,
    combo: 1,
    comboTimer: 0,
    overdrive: 0,
    invincible: 0,
    reviveUsed: false,
    runEnded: false,
    spawnTimer: 0,
    obstacles: [],
    shards: [],
    particles: [],
    sparks: [],
    messages: [],
    shake: 0,
    rng: Math.random,
    run: freshRunStats()
  };

  let audioCtx = null;
  let lastFrame = performance.now();
  let toastTimer = 0;

  function loadSave() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        ...DEFAULT_SAVE,
        ...parsed,
        unlocked: { ...DEFAULT_SAVE.unlocked, ...(parsed.unlocked || {}) }
      };
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    updateMenu();
  }

  function freshRunStats() {
    return {
      score: 0,
      shards: 0,
      boosts: 0,
      nearMisses: 0,
      maxCombo: 1,
      meters: 0,
      earnedCoins: 0
    };
  }

  function dayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function ensureDailyMissions() {
    const key = dayKey();
    if (save.missionDay === key && Array.isArray(save.missions) && save.missions.length === 3) {
      return;
    }
    const rng = mulberry32(hashString(`missions-${key}`));
    const pool = [...MISSION_BANK].sort(() => rng() - 0.5);
    save.missionDay = key;
    save.missions = pool.slice(0, 3).map((mission) => ({ ...mission, progress: 0, done: false }));
    persist();
  }

  function hashString(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    return function rng() {
      let t = seed += 0x6d2b79f5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function selectedSkin() {
    return SKINS.find((skin) => skin.id === save.selectedSkin) || SKINS[0];
  }

  function resize() {
    state.dpr = Math.min(2, window.devicePixelRatio || 1);
    state.w = Math.max(320, window.innerWidth);
    state.h = Math.max(520, window.innerHeight);
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    canvas.style.width = `${state.w}px`;
    canvas.style.height = `${state.h}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    state.trackW = Math.min(state.w * (state.w < 680 ? 0.9 : 0.54), 520);
    state.trackX = (state.w - state.trackW) / 2;
    state.laneW = state.trackW / state.lanes;
    state.playerY = Math.min(state.h * 0.78, state.h - 122);
    state.playerX = laneCenter(state.targetLane);
  }

  function laneCenter(lane) {
    return state.trackX + state.laneW * (lane + 0.5);
  }

  function laneFromX(x) {
    return clamp(Math.floor((x - state.trackX) / state.laneW), 0, state.lanes - 1);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setScreen(screen) {
    state.screen = screen;
    els.menu.classList.toggle("active", screen === "menu");
    els.pause.classList.toggle("active", screen === "pause");
    els.gameOver.classList.toggle("active", screen === "gameover");
    els.hud.classList.toggle("visible", screen === "playing");
    els.boost.classList.toggle("visible", screen === "playing");
    if (screen === "menu") {
      updateMenu();
    }
  }

  function updateMenu() {
    ensureDailyMissions();
    els.menuBest.textContent = Math.floor(save.best).toLocaleString();
    els.best.textContent = Math.floor(save.best).toLocaleString();
    els.coins.textContent = Math.floor(save.coins).toLocaleString();
    els.runs.textContent = save.runs.toLocaleString();
    els.sound.textContent = save.sound ? "Sound On" : "Sound Off";
    els.haptics.textContent = save.haptics ? "Haptics On" : "Haptics Off";
    els.sound.classList.toggle("on", save.sound);
    els.haptics.classList.toggle("on", save.haptics);
    renderSkins();
    renderMissions();
  }

  function renderSkins() {
    els.skinGrid.replaceChildren();
    SKINS.forEach((skin) => {
      const unlocked = Boolean(save.unlocked[skin.id]);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `skin-button${save.selectedSkin === skin.id ? " selected" : ""}`;
      button.style.setProperty("--skin", skin.color);
      button.innerHTML = `
        <span class="skin-dot" aria-hidden="true"></span>
        <span>
          <span class="skin-name">${skin.name}</span>
          <span class="skin-cost">${unlocked ? "Owned" : `${skin.cost} coins`}</span>
        </span>
      `;
      button.addEventListener("click", () => {
        if (unlocked) {
          save.selectedSkin = skin.id;
          persist();
          playSound("select");
          toast(`${skin.name} ready`);
          return;
        }
        if (save.coins >= skin.cost) {
          save.coins -= skin.cost;
          save.unlocked[skin.id] = true;
          save.selectedSkin = skin.id;
          persist();
          playSound("buy");
          toast(`${skin.name} unlocked`);
        } else {
          playSound("error");
          toast("More coins needed");
        }
      });
      els.skinGrid.append(button);
    });
  }

  function renderMissions() {
    els.missionList.replaceChildren();
    save.missions.forEach((mission) => {
      const item = document.createElement("div");
      item.className = `mission-item${mission.done ? " done" : ""}`;
      const progress = Math.min(mission.target, Math.floor(mission.progress || 0));
      item.innerHTML = `
        <span class="mission-copy">${mission.label} <span class="muted">${progress}/${mission.target}</span></span>
        <span class="mission-reward">${mission.done ? "Done" : `+${mission.reward}`}</span>
      `;
      els.missionList.append(item);
    });
  }

  function startRun(mode = "classic") {
    ensureAudio();
    state.mode = mode;
    state.targetLane = 2;
    state.playerX = laneCenter(2);
    state.score = 0;
    state.displayedScore = 0;
    state.speed = 330;
    state.time = 0;
    state.meters = 0;
    state.energy = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.overdrive = 0;
    state.invincible = 1.2;
    state.reviveUsed = false;
    state.runEnded = false;
    state.spawnTimer = 0.8;
    state.obstacles = [];
    state.shards = [];
    state.particles = [];
    state.sparks = [];
    state.messages = [];
    state.shake = 0;
    state.run = freshRunStats();
    state.rng = mode === "daily"
      ? mulberry32(hashString(`pulsebreak-${dayKey()}`))
      : mulberry32(Math.floor(Math.random() * 2 ** 32));
    setScreen("playing");
    updateHud();
    playSound("start");
    vibrate(20);
  }

  function pauseGame() {
    if (state.screen !== "playing") return;
    setScreen("pause");
    playSound("select");
  }

  function resumeGame() {
    if (state.screen !== "pause") return;
    lastFrame = performance.now();
    setScreen("playing");
    playSound("start");
  }

  function endRun() {
    if (state.runEnded) return;
    state.runEnded = true;
    save.runs += 1;
    const finalScore = Math.floor(state.score);
    const coinBase = Math.floor(finalScore / 120) + state.run.shards;
    const earned = Math.max(1, coinBase);
    state.run.earnedCoins = earned;
    state.run.score = finalScore;
    state.run.meters = Math.floor(state.meters);
    save.coins += earned;
    if (finalScore > save.best) {
      save.best = finalScore;
      toast("New best");
    }
    resolveMissions();
    persist();

    els.runMode.textContent = state.mode === "daily" ? "Daily run" : "Run complete";
    els.finalScore.textContent = finalScore.toLocaleString();
    els.earnedCoins.textContent = earned.toLocaleString();
    els.finalShards.textContent = state.run.shards.toLocaleString();
    els.finalCombo.textContent = `${state.run.maxCombo}x`;
    els.revive.disabled = state.reviveUsed || finalScore < 80;
    setScreen("gameover");
    playSound("crash");
    vibrate([40, 40, 80]);

    if (save.runs > 1 && save.runs % 4 === 0) {
      window.setTimeout(() => AdBridge.showInterstitial(), 650);
    }
  }

  function resolveMissions() {
    let completed = 0;
    save.missions = save.missions.map((mission) => {
      if (mission.done) return mission;
      const progress = Math.max(mission.progress || 0, state.run[mission.metric] || 0);
      if (progress >= mission.target) {
        completed += 1;
        save.coins += mission.reward;
        return { ...mission, progress, done: true };
      }
      return { ...mission, progress };
    });
    if (completed) {
      toast(`${completed} mission${completed > 1 ? "s" : ""} cashed`);
    }
  }

  async function reviveRun() {
    if (state.screen !== "gameover" || state.reviveUsed) return;
    els.revive.disabled = true;
    const rewarded = await AdBridge.showRewarded("revive");
    if (!rewarded) {
      els.revive.disabled = false;
      return;
    }
    state.reviveUsed = true;
    state.runEnded = false;
    state.invincible = 2.6;
    state.overdrive = 1.4;
    state.energy = Math.max(state.energy, 55);
    state.obstacles = state.obstacles.filter((ob) => ob.y < state.playerY - 160);
    burst(state.playerX, state.playerY, selectedSkin().color, 34, 8);
    setScreen("playing");
    playSound("boost");
    vibrate(45);
  }

  function triggerBoost() {
    if (state.screen !== "playing" || state.energy < 100) return;
    state.energy = 0;
    state.overdrive = 3.6;
    state.combo = Math.max(state.combo, 3);
    state.run.boosts += 1;
    state.run.maxCombo = Math.max(state.run.maxCombo, state.combo);
    state.shake = 10;
    burst(state.playerX, state.playerY, selectedSkin().accent, 52, 12);
    addMessage("Boost", state.playerX, state.playerY - 60, selectedSkin().accent);
    playSound("boost");
    vibrate(35);
  }

  function update(dt) {
    if (state.screen !== "playing") {
      updateParticles(dt);
      return;
    }

    state.time += dt;
    state.speed = 330 + Math.min(360, state.time * 10 + state.score * 0.09);
    state.meters += state.speed * dt * 0.03;
    state.run.meters = Math.floor(state.meters);
    state.score += dt * (11 + state.speed * 0.025) * (state.overdrive > 0 ? 1.8 : 1) * Math.min(8, 1 + state.combo * 0.09);
    state.run.score = Math.floor(state.score);
    state.displayedScore += (state.score - state.displayedScore) * Math.min(1, dt * 12);
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer === 0 && state.combo > 1) {
      state.combo = Math.max(1, state.combo - dt * 1.6);
    }
    state.overdrive = Math.max(0, state.overdrive - dt);
    state.invincible = Math.max(0, state.invincible - dt);
    state.shake = Math.max(0, state.shake - dt * 24);

    state.playerX += (laneCenter(state.targetLane) - state.playerX) * Math.min(1, dt * 16);
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnPattern();
      const pressure = Math.min(0.56, state.time * 0.006);
      state.spawnTimer = 0.86 - pressure + state.rng() * 0.24;
    }

    updateObstacles(dt);
    updateShards(dt);
    updateParticles(dt);
    maybeAddSpeedSparks(dt);
    updateHud();
  }

  function spawnPattern() {
    const roll = state.rng();
    if (roll < 0.48) {
      spawnWall();
    } else if (roll < 0.78) {
      spawnDouble();
    } else {
      spawnStagger();
    }
  }

  function spawnWall() {
    const gap = Math.floor(state.rng() * state.lanes);
    const lanes = [];
    for (let i = 0; i < state.lanes; i += 1) {
      if (i !== gap) lanes.push(i);
    }
    state.obstacles.push({ lanes, y: -48, h: 30, kind: "wall", passed: false, hit: false });
    if (state.rng() > 0.18) spawnShard(gap, -112);
  }

  function spawnDouble() {
    const first = Math.floor(state.rng() * state.lanes);
    let second = Math.floor(state.rng() * state.lanes);
    if (second === first) second = (second + 2) % state.lanes;
    state.obstacles.push({ lanes: [first, second], y: -44, h: 34, kind: "double", passed: false, hit: false });
    const safe = [0, 1, 2, 3, 4].filter((lane) => lane !== first && lane !== second);
    spawnShard(safe[Math.floor(state.rng() * safe.length)], -116);
  }

  function spawnStagger() {
    const lane = Math.floor(state.rng() * state.lanes);
    const dir = state.rng() > 0.5 ? 1 : -1;
    for (let i = 0; i < 3; i += 1) {
      state.obstacles.push({
        lanes: [clamp(lane + i * dir, 0, state.lanes - 1)],
        y: -56 - i * 72,
        h: 30,
        kind: "stagger",
        passed: false,
        hit: false
      });
    }
    if (state.rng() > 0.25) {
      spawnShard(clamp(lane - dir, 0, state.lanes - 1), -250);
    }
  }

  function spawnShard(lane, y) {
    state.shards.push({
      lane,
      y,
      pulse: state.rng() * Math.PI * 2,
      value: state.overdrive > 0 ? 2 : 1
    });
  }

  function updateObstacles(dt) {
    const playerLane = laneFromX(state.playerX);
    for (const ob of state.obstacles) {
      ob.y += state.speed * dt;
      if (!ob.passed && ob.y > state.playerY + 38) {
        ob.passed = true;
        const close = ob.lanes.some((lane) => Math.abs(lane - playerLane) === 1);
        if (close) {
          state.run.nearMisses += 1;
          gainCombo(1);
          state.energy = Math.min(100, state.energy + 4);
          addMessage("Close", laneCenter(playerLane), state.playerY - 46, "#37f4ff");
        }
      }
      if (ob.hit) continue;
      if (ob.lanes.includes(playerLane) && Math.abs(ob.y - state.playerY) < 34) {
        if (state.overdrive > 0 || state.invincible > 0) {
          ob.hit = true;
          state.score += 35 * Math.max(1, state.combo);
          state.energy = Math.min(100, state.energy + 2);
          burst(laneCenter(playerLane), ob.y, selectedSkin().accent, 18, 7);
          playSound("break");
        } else {
          state.shake = 16;
          endRun();
          return;
        }
      }
    }
    state.obstacles = state.obstacles.filter((ob) => ob.y < state.h + 96 && !ob.hit);
  }

  function updateShards(dt) {
    const playerLane = laneFromX(state.playerX);
    for (const shard of state.shards) {
      shard.y += state.speed * dt;
      shard.pulse += dt * 8;
      if (!shard.collected && shard.lane === playerLane && Math.abs(shard.y - state.playerY) < 38) {
        shard.collected = true;
        state.run.shards += shard.value;
        state.energy = Math.min(100, state.energy + 11 * shard.value);
        state.score += 42 * shard.value * Math.max(1, state.combo * 0.5);
        gainCombo(1);
        burst(laneCenter(shard.lane), shard.y, "#ffd166", 14, 6);
        playSound("shard");
      }
    }
    state.shards = state.shards.filter((shard) => shard.y < state.h + 60 && !shard.collected);
  }

  function gainCombo(amount) {
    state.combo = Math.min(20, Math.floor(state.combo + amount));
    state.comboTimer = 2.2;
    state.run.maxCombo = Math.max(state.run.maxCombo, state.combo);
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 90 * dt;
      particle.life -= dt;
    }
    for (const spark of state.sparks) {
      spark.y += spark.vy * dt;
      spark.life -= dt;
    }
    for (const message of state.messages) {
      message.y -= 30 * dt;
      message.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    state.sparks = state.sparks.filter((s) => s.life > 0);
    state.messages = state.messages.filter((m) => m.life > 0);
  }

  function maybeAddSpeedSparks(dt) {
    if (state.rng() > dt * 24) return;
    state.sparks.push({
      x: state.trackX + state.rng() * state.trackW,
      y: -20,
      vy: state.speed * (0.8 + state.rng() * 0.5),
      life: 0.5 + state.rng() * 0.7,
      color: state.rng() > 0.5 ? "#37f4ff" : "#ffd166"
    });
  }

  function burst(x, y, color, count, power) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = (40 + Math.random() * 120) * power * 0.14;
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.32 + Math.random() * 0.42,
        size: 2 + Math.random() * 5,
        color
      });
    }
  }

  function addMessage(text, x, y, color) {
    state.messages.push({ text, x, y, color, life: 0.8 });
  }

  function draw(now) {
    const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawBackground(now);
    drawTrack(now);
    drawSparks();
    drawShards();
    drawObstacles(now);
    drawPlayer(now);
    drawParticles();
    drawMessages();
    ctx.restore();
  }

  function drawBackground(now) {
    const gradient = ctx.createLinearGradient(0, 0, state.w, state.h);
    gradient.addColorStop(0, "#07070c");
    gradient.addColorStop(0.5, "#11111b");
    gradient.addColorStop(1, "#07070c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.w, state.h);

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    const spacing = 46;
    const offset = ((state.time * state.speed * 0.18) % spacing + spacing) % spacing;
    for (let y = -spacing; y < state.h + spacing; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y + offset);
      ctx.lineTo(state.w, y + offset + 28);
      ctx.stroke();
    }
    ctx.restore();

    const pulse = 0.5 + Math.sin(now * 1.5) * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.14 + pulse * 0.07;
    ctx.fillStyle = "#37f4ff";
    ctx.beginPath();
    ctx.arc(state.trackX + state.trackW * 0.12, state.h * 0.18, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(state.trackX + state.trackW * 0.82, state.h * 0.86, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTrack(now) {
    const x = state.trackX;
    const w = state.trackW;
    const bottom = state.h + 40;
    const top = -40;
    ctx.save();
    ctx.fillStyle = "rgba(5, 6, 12, 0.62)";
    roundRect(ctx, x, top, w, bottom - top, 8);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    for (let i = 1; i < state.lanes; i += 1) {
      const lx = x + i * state.laneW;
      ctx.setLineDash([10, 18]);
      ctx.lineDashOffset = -state.time * state.speed * 0.05;
      ctx.beginPath();
      ctx.moveTo(lx, top);
      ctx.lineTo(lx, bottom);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.globalAlpha = state.overdrive > 0 ? 0.42 : 0.18;
    ctx.strokeStyle = selectedSkin().color;
    ctx.lineWidth = state.overdrive > 0 ? 3 : 1.5;
    roundRect(ctx, x + 4, top + 4, w - 8, bottom - top - 8, 8);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const scanY = ((now * 160) % (state.h + 160)) - 80;
    const scan = ctx.createLinearGradient(0, scanY - 80, 0, scanY + 80);
    scan.addColorStop(0, "rgba(55,244,255,0)");
    scan.addColorStop(0.5, "rgba(55,244,255,0.14)");
    scan.addColorStop(1, "rgba(55,244,255,0)");
    ctx.fillStyle = scan;
    ctx.fillRect(x, scanY - 80, w, 160);
    ctx.restore();
  }

  function drawObstacles(now) {
    for (const ob of state.obstacles) {
      const color = ob.kind === "wall" ? "#ff5a72" : ob.kind === "double" ? "#a476ff" : "#ff8a55";
      for (const lane of ob.lanes) {
        const x = state.trackX + lane * state.laneW + 7;
        const y = ob.y - ob.h / 2;
        const w = state.laneW - 14;
        const glow = 0.45 + Math.sin(now * 6 + lane) * 0.15;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 18 * glow;
        const grad = ctx.createLinearGradient(x, y, x + w, y + ob.h);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "#23070c");
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, w, ob.h, 7);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 8, y + 6, w - 16, 3);
        ctx.restore();
      }
    }
  }

  function drawShards() {
    for (const shard of state.shards) {
      const x = laneCenter(shard.lane);
      const r = 9 + Math.sin(shard.pulse) * 2;
      ctx.save();
      ctx.translate(x, shard.y);
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = "#ffd166";
      ctx.shadowBlur = 20;
      ctx.fillStyle = shard.value > 1 ? "#ffffff" : "#ffd166";
      roundRect(ctx, -r, -r, r * 2, r * 2, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#ff5a72";
      ctx.fillRect(-2, -r, 4, r * 2);
      ctx.restore();
    }
  }

  function drawPlayer(now) {
    const skin = selectedSkin();
    const bob = Math.sin(now * 8) * 2;
    const x = state.playerX;
    const y = state.playerY + bob;
    const inv = state.invincible > 0 && Math.floor(now * 16) % 2 === 0;
    if (inv) ctx.globalAlpha = 0.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = state.overdrive > 0 ? skin.accent : skin.color;
    ctx.shadowBlur = state.overdrive > 0 ? 42 : 24;

    const trail = ctx.createLinearGradient(0, 18, 0, 86);
    trail.addColorStop(0, `${skin.color}aa`);
    trail.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.moveTo(-12, 12);
    ctx.lineTo(0, 92 + Math.sin(now * 12) * 12);
    ctx.lineTo(12, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = skin.color;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(22, 10);
    ctx.lineTo(0, 24);
    ctx.lineTo(-22, 10);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(8, 7);
    ctx.lineTo(0, 14);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = skin.accent;
    ctx.fillRect(-4, 4, 8, 12);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    for (const particle of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life * 2.2);
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawSparks() {
    for (const spark of state.sparks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, spark.life);
      ctx.strokeStyle = spark.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x, spark.y + 22);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawMessages() {
    ctx.save();
    ctx.font = "900 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const message of state.messages) {
      ctx.globalAlpha = Math.max(0, Math.min(1, message.life * 2));
      ctx.fillStyle = message.color;
      ctx.shadowColor = message.color;
      ctx.shadowBlur = 14;
      ctx.fillText(message.text, message.x, message.y);
    }
    ctx.restore();
  }

  function roundRect(context, x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }

  function updateHud() {
    els.score.textContent = Math.floor(state.displayedScore).toLocaleString();
    els.best.textContent = Math.floor(Math.max(save.best, state.score)).toLocaleString();
    els.energy.style.width = `${Math.floor(state.energy)}%`;
    els.boost.classList.toggle("ready", state.energy >= 100);
  }

  function toast(text) {
    els.toast.textContent = text;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 1600);
  }

  function ensureAudio() {
    if (!save.sound || audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();
  }

  function playSound(type) {
    if (!save.sound || !audioCtx) return;
    const map = {
      start: [220, 360, 0.09],
      select: [420, 560, 0.04],
      buy: [360, 720, 0.12],
      shard: [660, 940, 0.06],
      boost: [140, 680, 0.18],
      break: [120, 80, 0.08],
      crash: [90, 42, 0.2],
      error: [160, 120, 0.1]
    };
    const [from, to, duration] = map[type] || map.select;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    osc.type = type === "crash" ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(type === "boost" ? 0.16 : 0.07, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function vibrate(pattern) {
    if (save.haptics && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  const AdBridge = {
    async showRewarded(placement) {
      const admob = window.Capacitor?.Plugins?.AdMob;
      const unit = window.PULSEBREAK_AD_UNITS?.rewarded || AD_UNITS.rewarded;
      if (admob && unit && !unit.startsWith("REPLACE_")) {
        try {
          if (typeof admob.prepareRewardVideoAd === "function") {
            await admob.prepareRewardVideoAd({ adId: unit, isTesting: false });
          }
          if (typeof admob.showRewardVideoAd === "function") {
            await admob.showRewardVideoAd();
            return true;
          }
        } catch (error) {
          console.warn("Rewarded ad failed", placement, error);
        }
      }
      return showPreviewAd("Rewarded revive");
    },
    async showInterstitial() {
      const admob = window.Capacitor?.Plugins?.AdMob;
      const unit = window.PULSEBREAK_AD_UNITS?.interstitial || AD_UNITS.interstitial;
      if (!admob || !unit || unit.startsWith("REPLACE_")) return false;
      try {
        if (typeof admob.prepareInterstitial === "function") {
          await admob.prepareInterstitial({ adId: unit, isTesting: false });
        }
        if (typeof admob.showInterstitial === "function") {
          await admob.showInterstitial();
          return true;
        }
      } catch (error) {
        console.warn("Interstitial ad failed", error);
      }
      return false;
    }
  };

  function showPreviewAd(title) {
    return new Promise((resolve) => {
      let start = performance.now();
      let done = false;
      els.adModal.classList.add("active");
      els.adModal.setAttribute("aria-hidden", "false");
      els.adDone.disabled = true;
      document.getElementById("adTitle").textContent = title;
      els.adMeter.style.width = "0%";

      function tick(now) {
        if (done) return;
        const pct = clamp((now - start) / 1800, 0, 1);
        els.adMeter.style.width = `${pct * 100}%`;
        if (pct >= 1) {
          els.adDone.disabled = false;
          els.adDone.focus();
          return;
        }
        requestAnimationFrame(tick);
      }

      const finish = () => {
        if (done || els.adDone.disabled) return;
        done = true;
        els.adModal.classList.remove("active");
        els.adModal.setAttribute("aria-hidden", "true");
        els.adDone.removeEventListener("click", finish);
        resolve(true);
      };

      els.adDone.addEventListener("click", finish);
      requestAnimationFrame(tick);
    });
  }

  function handlePointerDown(event) {
    if (state.screen !== "playing") return;
    ensureAudio();
    state.pointerId = event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    state.targetLane = laneFromX(event.clientX);
  }

  function handlePointerMove(event) {
    if (state.screen !== "playing") return;
    if (state.pointerId !== null && event.pointerId !== state.pointerId) return;
    state.targetLane = laneFromX(event.clientX);
  }

  function handlePointerUp(event) {
    if (event.pointerId === state.pointerId) {
      state.pointerId = null;
    }
  }

  function handleKey(event) {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      state.targetLane = clamp(state.targetLane - 1, 0, state.lanes - 1);
    }
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      state.targetLane = clamp(state.targetLane + 1, 0, state.lanes - 1);
    }
    if (event.key === " " || event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
      event.preventDefault();
      triggerBoost();
    }
    if (event.key === "Escape") {
      state.screen === "playing" ? pauseGame() : resumeGame();
    }
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastFrame) / 1000 || 0);
    lastFrame = now;
    update(dt);
    draw(now / 1000);
    requestAnimationFrame(loop);
  }

  document.getElementById("playBtn").addEventListener("click", () => startRun("classic"));
  document.getElementById("dailyBtn").addEventListener("click", () => startRun("daily"));
  document.getElementById("pauseBtn").addEventListener("click", pauseGame);
  document.getElementById("resumeBtn").addEventListener("click", resumeGame);
  document.getElementById("pauseMenuBtn").addEventListener("click", () => setScreen("menu"));
  document.getElementById("restartBtn").addEventListener("click", () => startRun(state.mode));
  document.getElementById("gameOverMenuBtn").addEventListener("click", () => setScreen("menu"));
  document.getElementById("reviveBtn").addEventListener("click", reviveRun);
  els.boost.addEventListener("click", triggerBoost);
  els.sound.addEventListener("click", () => {
    save.sound = !save.sound;
    if (!save.sound && audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    persist();
  });
  els.haptics.addEventListener("click", () => {
    save.haptics = !save.haptics;
    persist();
  });

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  window.addEventListener("keydown", handleKey);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.screen === "playing") pauseGame();
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  ensureDailyMissions();
  resize();
  updateMenu();
  updateHud();
  requestAnimationFrame(loop);
})();
