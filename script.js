import { chooseBotCard, trackPlayerMove, BOT_TYPES } from "./botPersonalities.js";

// ---- Game Config ----
const COLORS = ["red", "blue", "green", "yellow"];
const START_HAND_SIZE = 5;

const RULE_ICONS = {
  any: "★",
  match_color: "🎨",
  match_number: "#",
  higher: "↑",
};

const RULE_LABELS = {
  any: "Any",
  match_color: "Match colour",
  match_number: "Match number",
  higher: "Higher",
};

// ---- Audio ----
const sfx = {
  play: new Audio("sounds/play.wav"),
  draw: new Audio("sounds/draw.wav"),
  win: new Audio("sounds/win.wav"),
  lose: new Audio("sounds/lose.wav"),
  error: new Audio("sounds/error.wav"),
};

const bgMusic = document.getElementById("bg-music");

let soundEnabled = true;
let musicEnabled = true;

// ---- State ----
let deck = [];
let playerHand = [];
let botHand = [];
let centerCard = null;
let currentRule = "any";
let playerTurn = true; // player starts
let difficulty = "medium";

let gameSeed = null;
let rngSeed = 1; // internal RNG state

let turnCount = 0;
let playerDraws = 0;
let botDraws = 0;

let undoAvailable = true;
let undoState = null;

// Track bot behaviour so it can’t spam Match number
let lastBotRuleType = null;

// ---- Stats in localStorage ----
const STATS_KEY = "mindshift_stats_v1";

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw)
      return {
        total: 0,
        playerWins: 0,
        botWins: 0,
        byDifficulty: { easy: 0, medium: 0, hard: 0 },
        history: [],
      };
    return JSON.parse(raw);
  } catch {
    return {
      total: 0,
      playerWins: 0,
      botWins: 0,
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      history: [],
    };
  }
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function recordGameResult(winner) {
  const stats = loadStats();
  stats.total += 1;
  if (winner === "player") stats.playerWins += 1;
  if (winner === "bot") stats.botWins += 1;

  if (!stats.byDifficulty[difficulty]) stats.byDifficulty[difficulty] = 0;
  stats.byDifficulty[difficulty] += 1;

  const entry = {
    date: new Date().toLocaleString(),
    winner,
    difficulty,
    seed: gameSeed || "",
    turns: turnCount,
    playerDraws,
    botDraws,
  };

  stats.history.unshift(entry);
  if (stats.history.length > 20) stats.history.length = 20;

  saveStats(stats);
}

// ---- Achievements Storage ----
const ACH_KEY = "mindshift_achievements";

function loadAchievements() {
  return JSON.parse(localStorage.getItem(ACH_KEY) || "{}");
}

function saveAchievements(a) {
  localStorage.setItem(ACH_KEY, JSON.stringify(a));
}

function unlockAchievement(key) {
  const ach = loadAchievements();
  if (!ach[key]) {
    ach[key] = true;
    saveAchievements(ach);
  }
}

// All achievements we want to show
const ALL_ACHIEVEMENTS = {
  first_win: {
    title: "First Win",
    description: "Win your first game.",
  },
  match_10_colors: {
    title: "Colour Lover",
    description: "Play a Match colour card.",
  },
};

function renderAchievementsList() {
  const ach = loadAchievements();
  const rows = Object.entries(ALL_ACHIEVEMENTS)
    .map(([key, meta]) => {
      const unlocked = !!ach[key];
      return `
        <div class="achievement-row ${unlocked ? "unlocked" : "locked"}">
          <div class="achievement-title">
            ${unlocked ? "✅" : "🔒"} ${meta.title}
          </div>
          <div class="achievement-desc">${meta.description}</div>
        </div>
      `;
    })
    .join("");

  achievementsList.innerHTML = rows || "<p>No achievements defined yet.</p>";
}

function renderStatsModal() {
  const stats = loadStats();
  statsTotalSpan.textContent = stats.total;
  statsPlayerWinsSpan.textContent = stats.playerWins;
  statsBotWinsSpan.textContent = stats.botWins;

  statsEasySpan.textContent = stats.byDifficulty.easy || 0;
  statsMediumSpan.textContent = stats.byDifficulty.medium || 0;
  statsHardSpan.textContent = stats.byDifficulty.hard || 0;

  if (!stats.history.length) {
    statsHistoryDiv.innerHTML = "<p>No games played yet.</p>";
  } else {
    const rows = stats.history
      .map(
        (g) =>
          `<div style="margin-bottom:4px;">
             <strong>${g.winner === "player" ? "You" : "Bot"}</strong> · ${
               g.difficulty
             } ·
             turns: ${g.turns}, draws: ${g.playerDraws}/${g.botDraws}
             ${g.seed ? `· seed: <code>${g.seed}</code>` : ""}
             <br/><span style="opacity:0.7">${g.date}</span>
           </div>`
      )
      .join("");
    statsHistoryDiv.innerHTML = rows;
  }
}

// ---- DOM ----
const playerHandDiv = document.getElementById("player-hand");
const botHandCountSpan = document.getElementById("bot-hand-count");
const centerCardDiv = document.getElementById("center-card");
const currentRuleSpan = document.getElementById("current-rule");
const deckCountSpan = document.getElementById("deck-count");
const messageDiv = document.getElementById("message");
const drawBtn = document.getElementById("draw-btn");
const restartBtn = document.getElementById("restart-btn");
const youArea = document.querySelector(".you-area");
const botArea = document.querySelector(".bot-area");

const startSeedInput = document.getElementById("start-seed");

const statsModal = document.getElementById("stats-modal");
const statsBtn = document.getElementById("stats-btn");
const statsTotalSpan = document.getElementById("stats-total");
const statsPlayerWinsSpan = document.getElementById("stats-player-wins");
const statsBotWinsSpan = document.getElementById("stats-bot-wins");
const statsEasySpan = document.getElementById("stats-easy");
const statsMediumSpan = document.getElementById("stats-medium");
const statsHardSpan = document.getElementById("stats-hard");
const statsHistoryDiv = document.getElementById("stats-history");
const statsResetBtn = document.getElementById("stats-reset-btn");
const statsCloseBtn = document.getElementById("stats-close-btn");

// Start & settings elements
const startScreen = document.getElementById("start-screen");
const gameShell = document.getElementById("game-shell");
const startPlayBtn = document.getElementById("start-play-btn");
const startHowtoBtn = document.getElementById("start-howto-btn");
const startDifficultySel = document.getElementById("start-difficulty");
const startThemeSel = document.getElementById("start-theme");
const startSfxChk = document.getElementById("start-sfx");
const startMusicChk = document.getElementById("start-music");

const howtoModal = document.getElementById("howto-modal");
const howtoBtn = document.getElementById("howto-btn");
const howtoCloseBtn = document.getElementById("howto-close-btn");

const settingsModal = document.getElementById("settings-modal");
const settingsBtn = document.getElementById("settings-btn");
const settingsDifficultySel = document.getElementById("settings-difficulty");
const settingsThemeSel = document.getElementById("settings-theme");
const settingsSfxChk = document.getElementById("settings-sfx");
const settingsMusicChk = document.getElementById("settings-music");
const settingsSaveBtn = document.getElementById("settings-save-btn");
const settingsCloseBtn = document.getElementById("settings-close-btn");

// Tutorial elements
const tutorialModal = document.getElementById("tutorial-modal");
const tutorialOpenBtn = document.getElementById("tutorial-open-btn");
const tutorialCaption = document.getElementById("tutorial-caption");
const tutorialBoard = document.getElementById("tutorial-board");
const tutorialDots = document.getElementById("tutorial-dots");
const tutorialPrevBtn = document.getElementById("tutorial-prev-btn");
const tutorialNextBtn = document.getElementById("tutorial-next-btn");
const tutorialSkipBtn = document.getElementById("tutorial-skip-btn");

// Achievements elements
const achievementsModal = document.getElementById("achievements-modal");
const achievementsBtn = document.getElementById("achievements-btn");
const achievementsList = document.getElementById("achievements-list");
const achievementsCloseBtn = document.getElementById("achievements-close");

// ---- Helpers: Audio & Theme ----
function playSound(name) {
  if (!soundEnabled) return;
  const sound = sfx[name];
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function updateMusic() {
  if (!bgMusic) return;
  if (musicEnabled) {
    bgMusic.volume = 0.18;
    bgMusic.play().catch(() => {});
  } else {
    bgMusic.pause();
  }
}

function applyTheme(theme) {
  const link = document.getElementById("theme-link");
  if (!link) return;
  link.href = `themes/${theme}.css`;
}

// ---- Deterministic RNG (Lehmer) ----
function setSeedFromString(str) {
  if (!str || str.trim() === "") {
    rngSeed = (Date.now() % 2147483646) + 1;
    return;
  }
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  if (h === 0) h = 1;
  rngSeed = (h % 2147483646) + 1;
}

function seededRandom() {
  rngSeed = (rngSeed * 16807) % 2147483647;
  return (rngSeed - 1) / 2147483646;
}

// ---- Deck & Cards ----
function createDeck() {
  const newDeck = [];
  COLORS.forEach((color) => {
    for (let value = 0; value <= 9; value++) {
      let ruleType;
      if (value === 0 || value === 5) ruleType = "any";
      else if (value === 1 || value === 6) ruleType = "match_color";
      else if (value === 2 || value === 7) ruleType = "match_number";
      else ruleType = "higher";

      newDeck.push({ color, value, ruleType });
    }
  });
  return newDeck;
}

// Fisher–Yates shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function drawCardFromDeck() {
  if (deck.length === 0) return null;
  return deck.pop();
}

function cardToHTML(card) {
  const div = document.createElement("div");
  div.classList.add("card", card.color);
  div.dataset.color = card.color;
  div.dataset.value = card.value;
  div.dataset.ruleType = card.ruleType;

  div.innerHTML = `
    <div class="card-value">${card.value}</div>
    <div class="card-rule-line">
      <span class="card-icon">${RULE_ICONS[card.ruleType]}</span>
      <span class="small">${RULE_LABELS[card.ruleType]}</span>
    </div>
  `;
  return div;
}

function renderCenterCard() {
  if (!centerCard) {
    centerCardDiv.className = "card placeholder";
    centerCardDiv.textContent = "No card";
    return;
  }
  centerCardDiv.className = `card ${centerCard.color}`;
  centerCardDiv.innerHTML = `
    <div class="card-value">${centerCard.value}</div>
    <div class="card-rule-line">
      <span class="card-icon">${RULE_ICONS[centerCard.ruleType]}</span>
      <span class="small">${RULE_LABELS[centerCard.ruleType]}</span>
    </div>
  `;
}

// sparkles around center card
function spawnSparkles(count = 8) {
  const container = document.querySelector(".center-area");
  if (!container) return;

  for (let i = 0; i < count; i++) {
    const spark = document.createElement("div");
    spark.className = "sparkle";

    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 30;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    spark.style.left = `calc(50% + ${x}px)`;
    spark.style.top = `calc(50% + ${y}px)`;

    container.appendChild(spark);
    setTimeout(() => spark.remove(), 700);
  }
}

// small animation hook
function animateCenterCard(source = "player") {
  centerCardDiv.classList.remove("from-player", "from-bot", "flip");
  void centerCardDiv.offsetWidth;

  const cls = source === "bot" ? "from-bot" : "from-player";
  centerCardDiv.classList.add(cls, "flip");

  setTimeout(() => {
    centerCardDiv.classList.remove(cls, "flip");
  }, 400);

  currentRuleSpan.classList.add("rule-pulse");
  setTimeout(() => currentRuleSpan.classList.remove("rule-pulse"), 280);

  spawnSparkles(8);
}

function renderHands() {
  playerHandDiv.innerHTML = "";
  playerHand.forEach((card, index) => {
    const playable = isCardPlayable(card);
    const cardDiv = cardToHTML(card);
    if (!playable || !playerTurn) {
      cardDiv.classList.add("unplayable");
    } else {
      cardDiv.addEventListener("click", () => onPlayerCardClick(index));
    }
    playerHandDiv.appendChild(cardDiv);
  });

  botHandCountSpan.textContent = botHand.length;
}

function updateStatus() {
  currentRuleSpan.textContent = RULE_LABELS[currentRule] || currentRule;
  deckCountSpan.textContent = deck.length;
}

function isCardPlayable(card) {
  if (!centerCard || currentRule === "any") return true;

  if (currentRule === "match_color") {
    return card.color === centerCard.color;
  } else if (currentRule === "match_number") {
    return card.value === centerCard.value;
  } else if (currentRule === "higher") {
    return card.value > centerCard.value;
  }
  return true;
}

function setMessage(text) {
  messageDiv.textContent = text;
}

function updateTurnGlow() {
  if (playerTurn) {
    youArea?.classList.add("turn-glow");
    botArea?.classList.remove("bot-turn-glow");
  } else {
    youArea?.classList.remove("turn-glow");
    botArea?.classList.add("bot-turn-glow");
  }
}

// ---- Game Flow ----
function initGame() {
  deck = createDeck();
  shuffle(deck);

  playerHand = [];
  botHand = [];
  centerCard = null;
  currentRule = "any";
  playerTurn = true;

  turnCount = 0;
  playerDraws = 0;
  botDraws = 0;

  undoAvailable = difficulty === "easy";
  undoState = null;
  lastBotRuleType = null;
  undoBtn.classList.add("hidden");

  setMessage("Your turn. Play any card to set the first task.");

  for (let i = 0; i < START_HAND_SIZE; i++) {
    playerHand.push(drawCardFromDeck());
    botHand.push(drawCardFromDeck());
  }

  centerCard = drawCardFromDeck();
  currentRule = "any";

  renderCenterCard();
  renderHands();
  updateStatus();
  updateTurnGlow();
}

function endGame(message) {
  setMessage(message);
  playerTurn = false;
  drawBtn.disabled = true;
  updateTurnGlow();
}

function checkWin() {
  if (playerHand.length === 0) {
    playSound("win");
    recordGameResult("player");
    unlockAchievement("first_win");
    endGame("You emptied your hand. You win! 🎉");
    return true;
  }
  if (botHand.length === 0) {
    playSound("lose");
    recordGameResult("bot");
    endGame("Computer emptied its hand. Computer wins! 🤖");
    return true;
  }
  return false;
}

// ---- Difficulty / bot personality logic ----
function chooseBotCardIndex(indices) {
  if (!indices || indices.length === 0) return null;

  if (difficulty === "easy") {
    const roll = seededRandom();
    if (roll < 0.35) {
      return indices[Math.floor(seededRandom() * indices.length)];
    }
  }

  let bestIndex = indices[0];
  let bestScore = -Infinity;

  indices.forEach((idx) => {
    const card = botHand[idx];
    let score = 0;

    if (card.ruleType === "higher") score += 3;
    else if (card.ruleType === "match_number") score += 2;
    else if (card.ruleType === "match_color") score += 1;

    score += card.value * 0.2;

    if (card.ruleType === "match_number") {
      const playerHasSameNumber = playerHand.some((c) => c.value === card.value);
      if (!playerHasSameNumber && deck.length <= 6) {
        score -= 4;
      }
    }

    if (difficulty === "hard") {
      if (card.ruleType === "any") score -= 1;
      const sameColorCount = botHand.filter((c) => c.color === card.color).length;
      score -= sameColorCount * 0.1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = idx;
    }
  });

  return bestIndex;
}

// ---- Player actions ----
function onPlayerCardClick(index) {
  if (!playerTurn) return;
  turnCount += 1;

  const card = playerHand[index];

  if (!isCardPlayable(card)) {
    playSound("error");
    return;
  }

  playSound("play");
  centerCard = card;
  trackPlayerMove(card);
  currentRule = card.ruleType;
  playerHand.splice(index, 1);

  if (card.ruleType === "match_color") {
    unlockAchievement("match_10_colors");
  }

  renderCenterCard();
  animateCenterCard("player");
  renderHands();
  updateStatus();

  if (checkWin()) return;

  playerTurn = false;
  updateTurnGlow();
  setMessage("Computer's turn...");
  drawBtn.disabled = true;

  setTimeout(botTurn, 900);
}

// Draw button
drawBtn.addEventListener("click", () => {
  if (!playerTurn) return;
  const card = drawCardFromDeck();
  if (card) {
    playerHand.push(card);
    playerDraws += 1;
    playSound("draw");
    setMessage("You drew a card. Try to play if possible.");
  } else {
    playSound("error");
    setMessage("Deck is empty. If you can't play, you pass.");
  }
  renderHands();
  updateStatus();
});

// ---- Bot logic ----
function botTurn() {
  turnCount += 1;

  if (difficulty === "easy" && undoAvailable) {
    undoState = {
      playerHand: structuredClone(playerHand),
      botHand: structuredClone(botHand),
      centerCard: structuredClone(centerCard),
      currentRule,
      deck: structuredClone(deck),
    };
  }

  let playable = [];
  botHand.forEach((card, i) => {
    if (isCardPlayable(card)) playable.push(i);
  });

  // HARD RULE: bot is NOT allowed to use Match number twice in a row.
  if (lastBotRuleType === "match_number") {
    const filtered = playable.filter(
      (i) => botHand[i].ruleType !== "match_number"
    );
    if (filtered.length > 0) {
      playable = filtered;
    } else {
      // Treat as if it cannot play any card this turn (will draw instead)
      playable = [];
    }
  }

  // 2. If bot cannot play → DRAW
  if (playable.length === 0) {
    const card = drawCardFromDeck();
    if (card) {
      botHand.push(card);
      botDraws += 1;

      const canPlayAfterDraw = [];
      botHand.forEach((c, i) => {
        if (isCardPlayable(c)) canPlayAfterDraw.push(i);
      });

      // After drawing, still respect the no-double-Match rule
      if (lastBotRuleType === "match_number") {
        const filtered = canPlayAfterDraw.filter(
          (i) => botHand[i].ruleType !== "match_number"
        );
        if (filtered.length > 0) {
          canPlayAfterDraw.splice(0, canPlayAfterDraw.length, ...filtered);
        } else {
          canPlayAfterDraw.length = 0;
        }
      }

      if (canPlayAfterDraw.length === 0) {
        setMessage("Computer drew a card but still can’t play. Your turn.");
        finishBotTurn();
        return;
      }

      botChooseAndPlay(canPlayAfterDraw);
      return;
    } else {
      setMessage("Computer can't draw or play. Your turn.");
      finishBotTurn();
      return;
    }
  }

  botChooseAndPlay(playable);
}

// Helper for choosing + playing based on BOT TYPES
function botChooseAndPlay(playableIndices) {
  if (!playableIndices || !playableIndices.length) {
    finishBotTurn();
    return;
  }

  // extra fairness guard vs trap Match number when deck is almost empty
  let safe = playableIndices.filter((i) => {
    const c = botHand[i];
    if (c.ruleType !== "match_number") return true;

    const playerHasSameNumber = playerHand.some((p) => p.value === c.value);
    const deckLow = deck.length <= 6;

    if (!playerHasSameNumber && deckLow && playableIndices.length > 1) {
      return false;
    }
    return true;
  });

  if (safe.length) {
    playableIndices = safe;
  }

  const botType =
    difficulty === "easy"
      ? BOT_TYPES.BOLT
      : difficulty === "medium"
      ? BOT_TYPES.MIMIC
      : BOT_TYPES.ATHENA;

  let idx = null;

  try {
    const chosenCard = chooseBotCard(
      botType,
      botHand,
      currentRule,
      centerCard
    );

    if (chosenCard) {
      const foundIndex = botHand.indexOf(chosenCard);
      if (foundIndex !== -1 && playableIndices.includes(foundIndex)) {
        idx = foundIndex;
      }
    }
  } catch (e) {
    console.warn("Bot personality error, using fallback:", e);
  }

  if (idx === null) {
    idx = chooseBotCardIndex(playableIndices);
  }

  if (idx === null || !playableIndices.includes(idx)) {
    idx = playableIndices[Math.floor(seededRandom() * playableIndices.length)];
  }

  playBotCard(idx);
}

function playBotCard(index) {
  const card = botHand[index];
  botHand.splice(index, 1);
  centerCard = card;
  currentRule = card.ruleType;

  // remember what rule the bot just used
  lastBotRuleType = card.ruleType;

  playSound("play");
  setMessage(
    `Computer played ${card.color} ${card.value} (${RULE_LABELS[card.ruleType]}).`
  );
  renderCenterCard();
  animateCenterCard("bot");
  renderHands();
  updateStatus();

  if (checkWin()) return;
  finishBotTurn();
}

function finishBotTurn() {
  playerTurn = true;
  drawBtn.disabled = false;
  updateTurnGlow();
  if (currentRule === "any") {
    setMessage("Your turn. You can play any card.");
  } else {
    setMessage(`Your turn. Current task: ${RULE_LABELS[currentRule]}.`);
  }

  if (difficulty === "easy" && undoAvailable) {
    undoBtn.classList.remove("hidden");
  }
}

// ---- Restart ----
restartBtn.addEventListener("click", () => {
  drawBtn.disabled = false;
  setSeedFromString(gameSeed || "random");
  initGame();
});

// ---- Undo ----
const undoBtn = document.getElementById("undo-btn");

undoBtn.addEventListener("click", () => {
  if (!undoAvailable || !undoState) return;

  playerHand = structuredClone(undoState.playerHand);
  botHand = structuredClone(undoState.botHand);
  centerCard = structuredClone(undoState.centerCard);
  currentRule = undoState.currentRule;
  deck = structuredClone(undoState.deck);

  undoAvailable = false;
  undoBtn.classList.add("hidden");

  renderCenterCard();
  renderHands();
  updateStatus();
});

// ---- Start screen & modals ----
function openHowTo() {
  howtoModal.classList.remove("hidden");
}

function closeHowTo() {
  howtoModal.classList.add("hidden");
}

function openSettings() {
  settingsDifficultySel.value = difficulty;
  settingsThemeSel.value = document.body.getAttribute("data-theme") || "neon";
  settingsSfxChk.checked = soundEnabled;
  settingsMusicChk.checked = musicEnabled;
  settingsModal.classList.remove("hidden");
}

function closeSettings() {
  settingsModal.classList.add("hidden");
}

// Stats modal helpers
function openStats() {
  renderStatsModal();
  statsModal.classList.remove("hidden");
}

function closeStats() {
  statsModal.classList.add("hidden");
}

// Achievements modal helpers
function openAchievements() {
  renderAchievementsList();
  achievementsModal.classList.remove("hidden");
}

function closeAchievements() {
  achievementsModal.classList.add("hidden");
}

// ---- Tutorial mini-round ----
const tutorialSteps = [
  {
    title: "Turn 1 – Any: you choose the first task",
    caption:
      "Task is Any. You can play any card. Here we choose blue 4 with Match colour to force the bot to match blue.",
    taskRule: "any",
    centerCard: { color: "yellow", value: 0, ruleType: "any" },
    playerCards: [
      { color: "blue", value: 4, ruleType: "match_color", highlight: true },
      { color: "red", value: 7, ruleType: "higher" },
    ],
    arrowText:
      "Playing blue 4 satisfies Any and sets “Match colour” for the bot next turn.",
  },
  {
    title: "Turn 2 – Bot must match colour",
    caption:
      "Now the task is Match colour. The bot has to play a blue card. It plays blue 6 with Higher, making life harder for you.",
    taskRule: "match_color",
    centerCard: { color: "blue", value: 4, ruleType: "match_color" },
    playerCards: [
      { color: "blue", value: 6, ruleType: "higher", highlight: true },
      { color: "green", value: 2, ruleType: "any" },
    ],
    arrowText:
      "By picking a Higher task, the bot says: you must now play a bigger number than 6.",
  },
  {
    title: "Turn 3 – You answer with Higher",
    caption:
      "Task is Higher. You can respond with any colour, as long as the number is higher than 6. Here we choose yellow 9 with Any to reset the task.",
    taskRule: "higher",
    centerCard: { color: "blue", value: 6, ruleType: "higher" },
    playerCards: [
      { color: "yellow", value: 9, ruleType: "any", highlight: true },
      { color: "red", value: 3, ruleType: "match_number" },
    ],
    arrowText:
      "Yellow 9 is > 6, so it works. Its Any icon gives the bot a completely open task again.",
  },
];

let tutorialStepIndex = 0;

function renderTutorialStep() {
  const step = tutorialSteps[tutorialStepIndex];
  if (!step) return;

  tutorialCaption.textContent = step.caption;

  const taskLabel = RULE_LABELS[step.taskRule] || "Any";

  const centerCardHtml = cardToHTML(step.centerCard);
  centerCardHtml.classList.add("tutorial-center-card");

  const playerRow = document.createElement("div");
  playerRow.className = "tutorial-card-row";
  step.playerCards.forEach((c) => {
    const div = cardToHTML(c);
    if (c.highlight) div.classList.add("tutorial-highlight");
    playerRow.appendChild(div);
  });

  tutorialBoard.innerHTML = `
    <div class="tutorial-col">
      <div class="tutorial-column-title">Current task</div>
      <div>${taskLabel}</div>
    </div>
    <div class="tutorial-col">
      <div class="tutorial-column-title">Center card</div>
      ${centerCardHtml.outerHTML}
    </div>
    <div class="tutorial-col">
      <div class="tutorial-column-title">Your choice</div>
      ${playerRow.outerHTML}
      <div class="tutorial-arrow-box">${step.arrowText}</div>
    </div>
  `;

  const dots = tutorialSteps
    .map((_, i) =>
      i === tutorialStepIndex
        ? `<span class="tutorial-dot tutorial-dot-active">●</span>`
        : `<span class="tutorial-dot">○</span>`
    )
    .join(" ");
  tutorialDots.innerHTML = dots;

  tutorialPrevBtn.disabled = tutorialStepIndex === 0;
  tutorialNextBtn.textContent =
    tutorialStepIndex === tutorialSteps.length - 1 ? "Finish" : "Next";
}

function openTutorial() {
  tutorialStepIndex = 0;
  renderTutorialStep();
  tutorialModal.classList.remove("hidden");
}

function closeTutorial() {
  tutorialModal.classList.add("hidden");
}

// ---- Start button ----
startPlayBtn.addEventListener("click", () => {
  difficulty = startDifficultySel.value;
  soundEnabled = startSfxChk.checked;
  musicEnabled = startMusicChk.checked;
  applyTheme(startThemeSel.value);
  updateMusic();

  gameSeed = startSeedInput.value.trim() || "";
  setSeedFromString(gameSeed || "random");

  startScreen.classList.add("hidden");
  gameShell.classList.remove("hidden");
  initGame();
});

// Start screen how-to
startHowtoBtn.addEventListener("click", openHowTo);

// Header buttons
howtoBtn.addEventListener("click", openHowTo);
howtoCloseBtn.addEventListener("click", closeHowTo);

settingsBtn.addEventListener("click", openSettings);
settingsCloseBtn.addEventListener("click", closeSettings);

settingsSaveBtn.addEventListener("click", () => {
  difficulty = settingsDifficultySel.value;
  soundEnabled = settingsSfxChk.checked;
  musicEnabled = settingsMusicChk.checked;
  applyTheme(settingsThemeSel.value);
  updateMusic();
  closeSettings();
});

// Stats events
statsBtn.addEventListener("click", openStats);
statsCloseBtn.addEventListener("click", closeStats);

statsResetBtn.addEventListener("click", () => {
  localStorage.removeItem(STATS_KEY);
  renderStatsModal();
});

// Achievements events
achievementsBtn.addEventListener("click", openAchievements);
achievementsCloseBtn.addEventListener("click", closeAchievements);

// Tutorial events
if (tutorialOpenBtn) {
  tutorialOpenBtn.addEventListener("click", () => {
    howtoModal.classList.add("hidden");
    openTutorial();
  });
}

tutorialPrevBtn.addEventListener("click", () => {
  if (tutorialStepIndex > 0) {
    tutorialStepIndex -= 1;
    renderTutorialStep();
  }
});

tutorialNextBtn.addEventListener("click", () => {
  if (tutorialStepIndex < tutorialSteps.length - 1) {
    tutorialStepIndex += 1;
    renderTutorialStep();
  } else {
    closeTutorial();
  }
});

tutorialSkipBtn.addEventListener("click", closeTutorial);

// Close modals on backdrop click
[howtoModal, settingsModal, statsModal, tutorialModal, achievementsModal].forEach(
  (modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-backdrop")) {
        modal.classList.add("hidden");
      }
    });
  }
);

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (startScreen && !startScreen.classList.contains("hidden")) return;
  if (document.querySelector(".modal:not(.hidden)")) return;
  if (!playerTurn) return;

  if (e.key === "d" || e.key === "D") {
    drawBtn.click();
    return;
  }

  const num = parseInt(e.key, 10);
  if (!isNaN(num) && num >= 1 && num <= playerHand.length) {
    onPlayerCardClick(num - 1);
  }
});

// ---- Initial ----
// Game starts after Start Game click.
