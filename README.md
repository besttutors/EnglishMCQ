# 📐 GrammarQuest v5.0

> **English Grammar Quiz — Wren & Martin based**
> 500+ questions · 5 Themes · Google Sheets powered · Production Ready

![Version](https://img.shields.io/badge/version-5.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![HTML](https://img.shields.io/badge/HTML-Single%20File-orange)
![No Build](https://img.shields.io/badge/build-none%20required-brightgreen)

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 📚 **500+ Questions** | Wren & Martin based — Parts of Speech, Tenses, Articles, Modals, Conditionals, Idioms & more |
| 🎨 **5 Themes** | Solar Paper · Cosmic Dark · Neon Jungle · Sakura · Brutalist |
| 📊 **Google Sheets DB** | Questions live in your Sheet — update Sheet, quiz auto-updates |
| ⚡ **Power-Ups** | 50/50, +15s Timer, Hint |
| 🏆 **Leaderboard** | Local + Google Sheets leaderboard |
| 📈 **Analytics** | Topic-wise performance, time per question, wrong answers |
| 🔥 **Streak System** | XP, combo bonuses, streak counter |
| ⚙️ **Quiz Settings** | Questions count, topic filter, difficulty, timer, negative marking |
| ⏸ **Pause / Resume** | Auto-pause on tab switch |
| 🚩 **Flag Questions** | Bookmark for review |
| 📤 **Share & Print** | Share result, print result card |
| ♿ **Accessible** | WCAG AA, ARIA labels, keyboard shortcuts |
| 📱 **Mobile Ready** | Responsive, touch-friendly, 44px+ touch targets |
| 🔒 **Secure** | XSS protected, input sanitized |

---

## 🚀 Quick Start

### Option 1 — Direct Use (No Setup)
```bash
# Just open the file
open index.html
```
Works with 20 built-in fallback questions. No internet needed.

### Option 2 — With Google Sheets (Full Power)
Follow the 5-step setup below.

---

## ⚙️ Google Sheets Setup (5 Steps)

### Step 1 — Create Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new spreadsheet
3. Copy the **Spreadsheet ID** from URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_ID]/edit
   ```

### Step 2 — Add Apps Script
1. In your Sheet: **Extensions → Apps Script**
2. Delete default code
3. Paste entire content of `Code.gs`
4. Replace `YOUR_SPREADSHEET_ID_HERE` with your ID
5. Save (Ctrl+S)

### Step 3 — Setup Sheet Structure
1. In Apps Script editor, select `setupSheet` from dropdown
2. Click ▶️ **Run**
3. Allow permissions when asked
4. ✅ Sheet structure + 30 sample questions created!

### Step 4 — Deploy as Web App
1. Click **Deploy → New Deployment**
2. Settings:
   - Type: `Web App`
   - Execute as: `Me`
   - Who has access: `Anyone`
3. Click **Deploy**
4. **Copy the Web App URL** ✅

### Step 5 — Connect to Quiz
1. Open `index.html` in any text editor
2. Find this line:
   ```javascript
   const SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
3. Replace with your URL:
   ```javascript
   const SCRIPT_URL = 'https://script.google.com/macros/s/ABC.../exec';
   ```
4. Save → Open in browser → **Done!** 🎉

---

## 📋 Sheet Column Structure

| Column | Field | Example |
|--------|-------|---------|
| A | ID | 1 |
| B | Question (English) | Which is a noun? |
| C | Hindi Translation | कौन सा संज्ञा है? |
| D | Option A | Run |
| E | Option B | Beautiful |
| F | Option C | Happiness |
| G | Option D | Quickly |
| H | Correct (A/B/C/D) | C |
| I | Explanation | Happiness is an abstract noun |
| J | Hint | It names a feeling |
| K | Category | Parts of Speech |
| L | Active (TRUE/FALSE) | TRUE |
| M | Difficulty (Easy/Medium/Hard) | Easy |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` `2` `3` `4` | Select answer option |
| `P` | Pause / Resume quiz |
| `Escape` | Close theme panel |
| `Enter` | Start quiz (name field) |

---

## 🎨 Theme Switcher

Click the floating button (bottom-right corner) to switch themes:

- ☀️ **Solar Paper** — Warm cream, editorial feel
- 🌌 **Cosmic Dark** — Deep space, aurora glow
- ⚡ **Neon Jungle** — Electric green/pink
- 🌸 **Sakura** — Soft pink, elegant
- 🔥 **Brutalist** — Raw, sharp, bold

Theme preference is saved automatically.

---

## 📁 Project Structure

```
grammarquest/
├── index.html          # Complete quiz (single file)
├── Code.gs             # Google Apps Script backend
├── package.json        # Project metadata
├── README.md           # This file
├── LICENSE             # MIT License
└── .github/
    └── ISSUE_TEMPLATE/ # Bug report templates
```

---

## 🔧 Configuration

In `index.html`, find the CONFIG section:

```javascript
const SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
const CACHE_TTL  = 10 * 60 * 1000;  // 10 minutes cache
const QPC        = 20;               // Questions per quiz (default)
const TPQ        = 30;               // Timer per question (seconds)
```

---

## 📊 Scoring System

| Action | Points | XP |
|--------|--------|----|
| ✅ Correct answer | +2 | +10 |
| ❌ Wrong answer | 0 | 0 |
| ❌ Wrong (negative marking ON) | −1 | 0 |
| 🔥 3× Streak bonus | — | +15 |
| ⚡ 5× Streak bonus | — | +25 |
| 🌟 10× Streak bonus | — | +50 |

---

## 🌍 Browser Support

| Browser | Support |
|---------|---------|
| Chrome 90+ | ✅ Full |
| Firefox 88+ | ✅ Full |
| Safari 14+ | ✅ Full |
| Edge 90+ | ✅ Full |
| Mobile Chrome | ✅ Full |
| Mobile Safari | ✅ Full |

---

## 📄 License

MIT License — Free to use, modify, distribute.

---

## 🙏 Credits

- Questions based on **Wren & Martin — English Grammar**
- Built with vanilla HTML, CSS, JavaScript — no frameworks
- Google Fonts: Fraunces, DM Sans, Space Grotesk, Unbounded, Crimson Pro
- Powered by Google Sheets + Apps Script
