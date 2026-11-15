# ⇄ Swap n Add! (`x + y = y + x`)

A fast, tactile, visual addition game designed for children to explore and master the **commutative property of addition** (`x + y = y + x`).

Featuring an **interactive handwriting recognition box** where children can write their answer directly on screen with a finger or Apple Pencil, and the iPad automatically recognizes the number and scores it!

Built entirely with pure **HTML5, CSS3, and JavaScript** — zero frameworks, zero external dependencies, zero backend required. Optimized for **10.2-inch iPads in horizontal (landscape) mode** and modern web browsers.

---

## 🚀 How to Publish on GitHub Pages

Because this repository contains only static web files (`index.html`, `styles.css`, `game.js`), it can be published directly to GitHub Pages in seconds:

1. Push your changes to your GitHub repository (branch `master` or `main`):
   ```bash
   git push origin master
   ```
2. Go to your repository on GitHub and click **Settings** (tab at the top).
3. In the left sidebar, click **Pages**.
4. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`
   - **Branch**: Select `master` (or `main`) and folder `/(root)`
   - Click **Save**.
5. Wait 30–60 seconds. Your game is live at:
   `https://<your-username>.github.io/<repo-name>/`
   *(e.g., `https://docapt-max.github.io/additionGame/`)*

> [!TIP]
> The repository includes `.nojekyll` to bypass Jekyll build steps, ensuring instant and seamless deployment on GitHub Pages.

---

## 📱 Playing on iPad (10.2" Horizontal Mode)

1. Open your GitHub Pages link in **Safari** on your iPad.
2. Hold your iPad in **horizontal (landscape) mode**.
3. **Optional (Full-Screen App Experience):**
   - Tap Safari's **Share** button (the square with an arrow pointing up).
   - Tap **"Add to Home Screen"**.
   - Tap **Add**.
   - Launch the game from your Home Screen icon to play in immersive full-screen without any browser address bar!

---

## 🎮 How to Play

Each game consists of **10 distinct addition rounds**:

1. **Step 1:** Look at the two numbers (e.g., `3 + 5`). Write your answer in the **handwriting box** using your finger or Apple Pencil (e.g., write `8`).
2. **Recognition Preview:** The iPad instantly recognizes the number, shows `Recognized: 8`, and puts it in the answer slot. Tap **Check Answer** (or press Enter).
3. **The Swap Animation:** When correct, the cards animate in an arc and swap places (`3 + 5` becomes `5 + 3`), visually demonstrating that order does not change the sum.
4. **Step 2:** The canvas clears automatically. Write the answer again for the swapped equation and tap **Check Answer**.
5. **Score & Feedback:**
   - Correct answers earn a green tick (`✓`), celebration confetti, a thumbs-up smiley, and chime sounds.
   - Mistakes trigger gentle feedback (`✗`) with a recap.
6. **Round 10 Summary:** Review your score out of 10 and all 10 equations. Tap **"Play Another 10 Rounds"** to play again with a fresh set of shuffled numbers!

---

## 🕹️ Controls & Features

- **✏️ Handwriting Box (Default):**
  - Draw numbers with your finger or stylus on the canvas.
  - Supports both single digits (e.g., `8`) and two-digit numbers (e.g., `12`, `15`) with automatic stroke clustering.
  - **`Clear`** button: Erase and redraw anytime.
  - **`Check Answer`** button: Evaluates your answer.
- **🔢 Keypad Mode:** Tap the `🔢 Keypad` toggle switch at any time if you prefer an on-screen number pad.
- **⌨️ Keyboard (iPad Magic Keyboard / Desktop):**
  - Digits: `0` – `9`
  - Backspace: `Backspace`
  - Submit: `Enter`
  - Quick Restart on game-over: `Space`
- **🔊 Sound Toggle:** Tap the speaker icon in the top header to mute or unmute sound effects.

---

## 📂 Project Structure

```text
├── index.html           # Semantic web page with handwriting canvas & PWA tags
├── styles.css           # Responsive layout optimized for iPad 10.2" landscape
├── game.js              # Pure client-side game engine & handwriting recognizer
├── icon.svg             # Vector app icon & touch icon
├── manifest.webmanifest # PWA configuration for iPad Home Screen
├── .nojekyll            # Ensures direct static hosting on GitHub Pages
└── .gitignore           # Prevents OS or editor clutter
```
