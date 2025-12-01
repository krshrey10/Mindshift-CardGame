// botPersonalities.js

export const BOT_TYPES = {
  ATHENA: "ATHENA",
  BOLT: "BOLT",
  MIMIC: "MIMIC",
};

// --- Simple player history for Mimic ---
const PLAYER_HISTORY_LIMIT = 3;
const playerHistory = [];

// Called from script.js when player plays a card
export function trackPlayerMove(card) {
  if (!card) return;
  playerHistory.push({ color: card.color, ruleType: card.ruleType });
  if (playerHistory.length > PLAYER_HISTORY_LIMIT) {
    playerHistory.shift();
  }
}

// Local helper – SAME logic as your isCardPlayable() in script.js
function cardSatisfiesTask(card, currentRule, centerCard) {
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

// Athena = smart / tactical
function chooseAthenaCard(hand, currentRule, centerCard) {
  const playable = hand.filter((c) =>
    cardSatisfiesTask(c, currentRule, centerCard)
  );
  if (!playable.length) return null;

  let best = playable[0];
  let bestScore = -Infinity;

  for (const card of playable) {
    let score = 0;

    // prefers restrictive tasks
    if (card.ruleType === "higher") score += 3;
    else if (card.ruleType === "match_number") score += 2;
    else if (card.ruleType === "match_color") score += 1;

    // slightly prefer higher numbers for “higher”
    score += card.value * 0.25;

    // tiny penalty for Any
    if (card.ruleType === "any") score -= 1;

    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

// Bolt = first-playable / impulsive with small randomness
function chooseBoltCard(hand, currentRule, centerCard) {
  const playable = hand.filter((c) =>
    cardSatisfiesTask(c, currentRule, centerCard)
  );
  if (!playable.length) return null;

  // sometimes just pick completely random playable
  if (Math.random() < 0.3) {
    return playable[Math.floor(Math.random() * playable.length)];
  }

  // usually: first playable card
  return playable[0];
}

// Mimic = adapts a bit to your recent colours
function chooseMimicCard(hand, currentRule, centerCard) {
  const playable = hand.filter((c) =>
    cardSatisfiesTask(c, currentRule, centerCard)
  );
  if (!playable.length) return null;

  // find favourite color from your last 3 moves
  let favColor = null;
  if (playerHistory.length) {
    const counts = {};
    for (const h of playerHistory) {
      counts[h.color] = (counts[h.color] || 0) + 1;
    }
    favColor = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  // if we know a fav colour, try to counter it a bit
  if (favColor) {
    const antiFav = playable.filter((c) => c.color !== favColor);
    if (antiFav.length && Math.random() < 0.7) {
      return antiFav[Math.floor(Math.random() * antiFav.length)];
    }
  }

  // otherwise just a mild random choice
  return playable[Math.floor(Math.random() * playable.length)];
}

// Main entry
export function chooseBotCard(botType, hand, currentRule, centerCard) {
  if (!Array.isArray(hand) || !hand.length) return null;

  switch (botType) {
    case BOT_TYPES.BOLT:
      return chooseBoltCard(hand, currentRule, centerCard);
    case BOT_TYPES.MIMIC:
      return chooseMimicCard(hand, currentRule, centerCard);
    case BOT_TYPES.ATHENA:
    default:
      return chooseAthenaCard(hand, currentRule, centerCard);
  }
}
