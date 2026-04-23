

---

###markdown
# 🚀 Vision.12 | 12-Week Year Productivity Dashboard

**Vision.12** is a high-performance productivity system built to help individuals bridge the gap between "knowing" and "doing". Inspired by the **"12 Week Year"** methodology, this app compresses your annual goals into intense 12-week execution cycles.

---

## ✨ Features
- **Bento Grid UI:** A sleek, modern dashboard layout for a bird's-eye view of your progress.
- **Strategic Alignment:** Directly link long-term visions to weekly tactical tasks.
- **Dynamic Progress Tracking:** Visual indicators and progress bars that update in real-time.
- **Local-First Architecture:** All data is stored securely in your browser's `LocalStorage`.
- **Gamification:** Earn achievement badges and maintain streaks to stay motivated.

## 🛠️ Tech Stack
- **Frontend:** React.js (TypeScript)
- **Styling:** Tailwind CSS v4 (Glassmorphism & Modern UI)
- **Icons:** Lucide-React
- **Storage:** Browser LocalStorage API

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone [https://github.com/your-username/vision.12.git](https://github.com/your-username/vision.12.git)
cd vision.12
npm install
```

### 2. Development
Run the app in development mode:
```bash
npm run dev
```

---

## 🔧 Troubleshooting

If you encounter issues during the initial setup, specifically regarding **TypeScript types** or **React definitions** (e.g., errors saying *'React' refers to a UMD global*), please run the following command to manually install the necessary type definitions:

```bash
npm install --save-dev @types/react @types/react-dom
```

*This ensures that the development environment correctly recognizes React components and DOM elements within the TypeScript compiler.*

---

## 📸 Project Structure
- `src/components`: Reusable UI widgets (Bento cards, Progress bars).
- `src/hooks`: Custom hooks for managing LocalStorage and 12-week logic.
- `src/data`: Mock data and initial state templates.

## 💡 Philosophy
The core of this project is **Execution**. By focusing on a 12-week horizon, the "end-of-year" urgency is always present, driving consistent action and measurable results.

---




