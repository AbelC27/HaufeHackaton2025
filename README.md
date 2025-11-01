# AI-Powered Code Review Assistant (Haufe Hackathon 2025)

This repository contains the source code for an AI-Powered Code Review Assistant, built for the 2025 Internship Hackathon.

The core product is a **Next.js web application** that provides the main user interface and application logic. It connects to two key services:
1.  **Supabase:** A Postgres database used for all data, including user accounts and review history.
2.  **Django AI Service:** A lightweight backend whose *sole purpose* is to act as a bridge to a **locally hosted Large Language Model (LLM)** (Ollama).

This architecture satisfies the hackathon's core requirements: a **"Functioning Implementation" (1,000 pts)** and **"Uses Local LLM" (5,000 pts)**.

---

## 🚀 Impressive Features ("Wow" Factor)

### ✅ Feature 1: The "Auto-Fix" Button (IMPLEMENTED) 

**Status:** ✅ **COMPLETE** - This feature directly targets the **"Automatic Fixes" (500 pts)** stretch goal.

* **The Idea:** Instead of just *showing* the review, the LLM also provides the full, corrected code.
* **Implementation:**
    1.  ✅ **Next.js (Frontend)** sends the user's code to the Django AI service with `auto_fix: true` flag.
    2.  ✅ **Django (AI Service)** prompts the LLM to return a JSON object containing both `review` and `fixed_code`.
    3.  ✅ **Next.js (Frontend)** receives this JSON and displays the review with a glowing **"✨ Apply Fix"** button.
    4.  ✅ **The "Wow":** When a user clicks this button, the code in their editor instantly replaces itself with the AI-generated fix, providing a magical, "self-healing" experience.

**How to Use:**
1. Write or paste your code
2. Click the green **"✨ Auto-Fix"** button
3. Wait for AI to generate both review and fixed code
4. Click the animated **"✨ Apply Fix"** button that appears
5. Your code is instantly updated with the fixes!

### ✅ Feature 2: Git Pre-Commit Hook (IMPLEMENTED)

**Status:** ✅ **COMPLETE** - This feature is a real-world developer tool and directly hits the **"Pre-commit Evaluation" (500 pts)** stretch goal.

* **The Idea:** A script that developers can use as a Git hook to automatically review code *before* it can be committed.
* **Implementation:**
    1.  ✅ **Python Script** (`pre-commit-hook.py`) runs on `git commit`.
    2.  ✅ **The Logic:** Gets all staged code, sends each file to Django AI service (`/api/review/`), and analyzes the response.
    3.  ✅ **The Result:** If the AI review finds HIGH severity issues, the script prints detailed errors and **blocks the commit**. If the code is good, the commit proceeds.

**Installation:**

**Windows:**
```powershell
# Run the installer
.\install-hook.bat

# Or manually:
copy pre-commit-hook.py .git\hooks\pre-commit
```

**Linux/Mac:**
```bash
# Run the installer
chmod +x install-hook.sh
./install-hook.sh

# Or manually:
cp pre-commit-hook.py .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**How It Works:**
1. You make code changes and run `git add`
2. You run `git commit -m "message"`
3. The hook automatically reviews all staged code files
4. If critical issues found → commit is BLOCKED ❌
5. If code is clean → commit proceeds ✅
6. To bypass: `git commit --no-verify`

---

## 🎯 Additional Features Implemented

### 18+ Major Features:
- ✅ **User Authentication** (Supabase Auth)
- ✅ **Multi-Language Support** (10+ languages)
- ✅ **Review Focus Areas** (5 types)
- ✅ **Analytics Dashboard** (Charts & Statistics)
- ✅ **Keyboard Shortcuts** (Power user features)
- ✅ **Auto-Save Drafts** (Never lose work)
- ✅ **Toast Notifications** (Visual feedback)
- ✅ **Tags System** (Organize reviews)
- ✅ **Advanced Search** (Find anything)
- ✅ **Download as Markdown** (Export reports)
- ✅ **Code Comparison** (Diff viewer)
- ✅ **GitHub Gist Import** (Load code)
- ✅ **Share Reviews** (Collaborative)
- ✅ **Review History** (Track progress)
- ✅ **Theme Toggle** (Dark/Light mode)
- ✅ **Responsive UI** (Mobile-friendly)
- ✅ **Auto-Fix** (Magic button!)
- ✅ **Pre-Commit Hook** (Git integration)

---

## 🛠 Tech Stack

* **Frontend & App Logic:** **Next.js 16** (React 19, TypeScript, Tailwind CSS, Recharts)
* **Database & Auth:** **Supabase** (Postgres, Auth)
* **AI Microservice:** **Django 5.2** (Python, Django REST Framework)
* **Local LLM Host:** **Ollama** (serving the `codellama` model)
* **Charts:** **Recharts** (Analytics visualization)
* **Syntax Highlighting:** **React Syntax Highlighter** (VSCode theme)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Ollama with CodeLlama model
- Supabase account

### Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

### Frontend Setup
```powershell
cd frontend/frontend
npm install
npm run dev
```

### Ollama Setup
```powershell
ollama pull codellama
ollama serve
```

Visit `http://localhost:3000` and start reviewing code!

---

## 📊 Hackathon Points Checklist

- ✅ **Functioning Implementation** (1,000 pts)
- ✅ **Uses Local LLM** (5,000 pts)
- ✅ **Automatic Fixes** (500 pts) - Auto-Fix feature
- ✅ **Pre-commit Evaluation** (500 pts) - Git hook
- ✅ **"Wow" Factor** - 18+ polished features, charts, animations
- ✅ **Innovation** - Unique combination of features
- ✅ **Completeness** - Full product with docs, tests, installer

**Total Potential:** 7,000+ points

---

## 📝 Documentation

- `FEATURES.md` - Complete feature list with descriptions
- `TESTING.md` - Testing guide and checklist
- `SETUP.md` - Detailed setup instructions
- `DEMO.md` - Demo scenarios and use cases
- `IMPLEMENTATION.md` - Technical implementation details

---

## 🎨 Screenshots

### Main Review Interface
- Code editor with syntax highlighting
- Dual-pane layout (code + review)
- **✨ Auto-Fix button** with instant code replacement

### Auto-Fix in Action
1. Click "✨ Auto-Fix"
2. AI generates review + fixed code
3. Glowing "Apply Fix" button appears
4. Click to instantly update your code!

### Pre-Commit Hook
- Automatic code review before commit
- Blocks commits with critical issues
- Detailed terminal output
- Easy installation script

---

## 🏆 Why This Wins

1. **Complete Product** - Not just a demo, but a fully functional tool
2. **Real-World Value** - Developers can use this today
3. **High "Wow" Factor** - Auto-fix and pre-commit hooks are magical
4. **Polished UX** - Animations, notifications, keyboard shortcuts
5. **Comprehensive** - 18+ features, full documentation
6. **Innovation** - Unique combination of review + auto-fix + git integration
7. **Scale** - 5000+ lines of code, professional architecture

---

## 👥 Team

Built with ❤️ for the Haufe Hackathon 2025