# Mindshift 🧠🃏  
A tactical, rule-shifting 1v1 card game built with **vanilla HTML, CSS, JavaScript**.

Every card you play sets a *new task* for the opponent.  
Survive the bot's strategy and empty your hand first to win.

## 🎮 Gameplay Rules

Each card has:
- A **colour**
- A **number (0-9)**
- A **rule icon** that forces the next move:

| Icon | Rule | Meaning |
|------|------|----------|
| ★ | Any | Opponent can play anything |
| 🎨 | Match colour | Must match your card’s colour |
| # | Match number | Must match your card’s number |
| ↑ | Higher | Must play a higher number |

If you can't play → **draw a card**.

### 🤖 Fair Bot  
The bot has 3 personalities (Lite, Tactical, Tactical+).  
A safety rule prevents cheating:  
**The bot is NOT allowed to play “Match number” two turns in a row.**

## 🌈 Features
- Difficulty modes  
- Undo (Lite mode)  
- Themes: Neon, Glass, Paper, Cyberpunk, Forest, Pastel, Pixel  
- Achievements  
- Stats history  
- Deterministic seed option  

## ▶️ Run locally
Just open **index.html** in any browser.

## 🚀 Future improvements
- Mobile layout  
- More rule types  
- Achievements expansion  
- Online multiplayer  
