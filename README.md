# TailorVoice 🧵🎙️

**TailorVoice** is a professional-grade, voice-controlled measurement tool designed specifically for fashion designers and tailors. It allows designers to record body measurements using their voice, eliminating the need for manual record-keeping while working with fabric.

## ✨ Key Features

- **🎙️ Real-time Voice Transcription**: Powered by the Web Speech API for low-latency feedback.
- **🧠 Intelligent Parsing**: Automatically extracts measurements (e.g., "waist 32", "chest 40") from natural speech.
- **✍️ Manual Overrides**: Quick-edit any value by simply tapping on it in the table.
- **👤 Customer Profiles**: Assign measurements to specific clients for better organization.
- **📏 Unit Toggle**: Seamlessly switch between Inches (in) and Centimeters (cm).
- **💾 Auto-Persistence**: Automatically saves your session to `localStorage` so you never lose data on refresh.
- **💎 Premium UX**: A sleek, dark-mode interface designed for professional environments.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A modern browser (Chrome or Edge recommended for best voice support)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/tailor-measurement.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🛠️ Tech Stack
- **Frontend**: React (v19) + TypeScript
- **Styling**: Tailwind CSS (v4)
- **Voice Engine**: Web Speech API

## 🗺️ Roadmap
- [ ] Go Backend implementation
- [ ] MongoDB storage for permanent records
- [ ] PDF Export for measurement sheets
- [ ] Multi-user sync

## 📄 License
MIT
