🎴 Mindshift – Tactical Rule-Shifting Card Game

Mindshift is a fast, strategic 1v1 card game built with vanilla JavaScript, where
every card you play sets a new rule for your opponent.

The bot adapts to your gameplay, avoids abusive moves, and uses different “personalities”
(Bolt, Mimic, Athena) depending on difficulty.

Goal: Empty your hand before the opponent — while surviving their tactics.

🌐 Live Demo

Play the game here: https://krshrey10.github.io/Mindshift-CardGame/

🚀 Features
🎮 Core Gameplay

40-card deck with colors & rule types

Every card changes the task:

Any

Match Colour

Match Number

Higher

Win by emptying your hand first

🤖 Smart Bot AI (3 personalities)

Bolt (Easy) → random, clumsy, allows undo

Mimic (Medium) → mirrors the player

Athena (Hard) → strategic scoring AI

♟ Fairness system (unique)

Bot cannot use Match Number twice in a row

Bot avoids “trap moves” if the deck is too small

Player gets undo option on Easy mode

✨ UX & Polish

Card glow indicators

Animations & sparkles

Themes: Neon, Pixel, Cyberpunk, Pastel, Paper, Forest, Glass

Sound effects + background music

📁 Project Structure

/sounds          → Game SFX
/themes          → UI themes
index.html       → Game board
script.js        → Game logic + AI + animations
style.css        → Layout / base styling
botPersonalities.js → AI logic

🛣 Roadmap

 Multiplayer mode

 New cards & rule types

 Mobile optimizations

 Difficulty-balanced deck seeding

 New bot personality: “Oracle”

 Ranked mode (ELO)

 Achievements expansion

 Daily challenges

 🧠 Tech Stack

HTML5

CSS3

JavaScript (Vanilla)

LocalStorage for stats + achievements

Deterministic PRNG (for seeded gameplay)

👩‍💻 Author

Shreya K. Rajeeva
Developer · Data Science · AI · UI/UX
GitHub: https://github.com/krshrey10

A full tutorial

Achievements & Stats tracking
