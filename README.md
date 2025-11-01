# DEVCOR - AI Code Review Platform


DEVCOR is an intelligent, AI-powered platform designed to help developers write better code. It's not just a static review tool; it's an interactive learning environment built for the 2025 Internship Hackathon.

Our architecture is modern and scalable:
* **Next.js (Frontend & API):** A single, powerful Next.js application handles the entire user interface, API routes, and application logic.
* **Django (AI Microservice):** A dedicated, lightweight Python server whose *sole purpose* is to act as a bridge to a locally-hosted Large Language Model (LLM).
* **Supabase (Database):** Handles all data, including user accounts, saved reviews, and the new coding exercises.
* **Ollama (Local LLM):** Runs powerful models like `codellama` locally on the user's GPU, ensuring 100% privacy and high-speed performance.

---

## 🚀 Core Features

### 1. AI-Powered Code Review
The core of the platform. Users can paste their code, and our local AI provides a detailed analysis, checking for bugs, style violations, and potential improvements.

### 2. Instant "Auto-Fix"
A "wow" feature that directly hits the **"Automatic Fixes" (500 pts)** stretch goal [cite: deeagabor/internship-hackathon-2025/internship-hackathon-2025-ecf828a021b2cdc6ef64b1700097bbe9875e133f/README.md]. The AI doesn't just find problems; it provides the *corrected code*. A single click on the "Auto-Fix" button [cite: image_d58078.jpg] instantly heals the user's code.

### 3. NEW! Interactive "Learn-to-Code" Exercises
This is what makes DEVCOR a true product.
* **Exercise Library:** A new "Exercises" button in the navbar [cite: image_d58078.jpg] leads to a dedicated learning zone. Users can select from a list of coding challenges (e.g., "Write a function to sort a list," "Solve FizzBuzz").
* **AI Scoring & Review:** After a user submits their solution, our Django AI service doesn't just give feedback. It provides a comprehensive **review** of their solution *and* a **score** (e.g., 85/100) based on correctness, efficiency, and style.
* **Personalized Learning:** This transforms the platform from a simple reviewer into a personal coding tutor, helping users learn and track their progress.

---

## 🛠 Tech Stack & Architecture

* **Frontend & Main API:** **Next.js** (TypeScript, React, Tailwind CSS)
    * Handles all user-facing pages, API routes, and state management.
    * Communicates with Supabase for data and the Django service for AI.
* **Database:** **Supabase** (Postgres)
    * Stores user accounts, saved review history, and the new `exercises` and `solutions` tables.
* **AI Microservice:** **Django** (Python, Django REST Framework)
    * A dedicated server that receives requests from the Next.js API.
    * Its only job is to format complex prompts (for reviews, fixes, or exercise scoring) and query the local LLM.
* **Local LLM Host:** **Ollama**
    * Runs the `codellama` model locally, satisfying the **"Uses Local LLM" (5,000 pts)** core requirement [cite: deeagabor/internship-hackathon-2025/internship-hackathon-2025-ecf828a021b2cdc6ef64b1700097bbe9875e133f/README.md] and ensuring total data privacy.

---

## 🎯 Hackathon Goals Met

* ✅ **Functioning Implementation (1,000 pts)**
* ✅ **Uses Local LLM (5,000 pts)**
* ✅ **Product Look & Feel (2,000 pts):** [cite: image_d58078.jpg]
* ✅ **Automatic Fixes (500 pts)**
* ✅ **Ease of Use (500 pts)**
* ✅ **Documentation for Findings (500 pts)**