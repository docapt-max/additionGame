# Swap & Add! (`x + y = y + x`)

An interactive addition game designed to help children understand the commutative property of addition (`x + y = y + x`) through visual swapping animations and a 10-round tick/cross scoreboard.

## How to Start

Double-click **`play.bat`** (recommended — starts a local server at http://127.0.0.1:8765/ so your browser enables Gamepad support), or open `index.html` directly if playing with keyboard/mouse only.

## Controls

Each of the **10 rounds** works in two quick steps:

1. **Swap the two numbers** (`x + y` animates smoothly into `y + x`):
   - Keyboard: **`Space`**
   - Gamepad: **`RT`** (Right Trigger) or **`RB`** (Right Bumper)
2. **Score the child's answer**:
   - **Correct (`✓`)**: **`Space`** on keyboard, or **`RT`** / **`RB`** on gamepad
   - **Incorrect (`✗`)**: **`X`** key on keyboard, or **`B`** button on gamepad

## Features

- 10 distinct single-digit addition rounds (`1–9`, `x ≠ y`) per game
- Color-coded number cards with visual counting dots that travel together during the swap animation
- 10-round scoreboard tracking every round with green tick (`✓`) and red cross (`✗`) marks
- End-of-game summary showing all 10 equations and total score
- Toggleable counting dots (`Dots: On/Off`) and synthesized sound effects (`Sound: On/Off`)

