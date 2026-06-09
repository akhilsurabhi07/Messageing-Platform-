💬 Communication Platform (Glassmorphic PWA)
A modern, highly secure, and instant real-time communication platform built with React and Firebase. This application is a fully installable Progressive Web App (PWA) featuring a premium glassmorphic dark-mode interface, Two-Factor Authentication, real-time chat, and Peer-to-Peer video meetings.

🚀 Live Demo: https://commplat-app-akhil.web.app

✨ Key Features
Custom 2FA OTP Authentication: Bypasses standard email links in favor of a custom 6-digit OTP code sent via EmailJS during login and signup to prevent spam accounts.
Progressive Web App (PWA): Fully installable on iOS, Android, and Desktop natively from the browser. Supports background updates via Service Workers.
Real-Time Chat: Utilizes Firebase WebSockets (onSnapshot) for millisecond-latency messaging.
Peer-to-Peer Video Meetings: Built-in video conferencing using WebRTC. Bypasses expensive central servers by using Firestore purely as a signaling server to exchange SDP offers/answers and ICE candidates.
Glassmorphic UI: A sleek, modern dark mode interface built with custom CSS and Lucide-React icons.
Role-Based Access Control: Secure Firestore rules and admin/employee roles to restrict meeting creation and app features.
🛠 Technology Stack
Frontend
React 19 (UI Framework)
Vite (Build Tool & Dev Server)
React Router v7 (Client-side routing)
Lucide-React (Premium vector icons)
Vite PWA Plugin (Service workers & manifest generation)
Backend & Services (Serverless)
Google Firebase SDK
Firebase Authentication (Secure user sessions)
Firebase Firestore (NoSQL Real-time database)
Firebase Storage (File and media uploads)
Firebase Hosting (Global CDN deployment)
EmailJS (Custom transactional emails for OTP verification)
WebRTC API (Native browser API for P2P video streaming)
📸 Screenshots
(Note: Drag and drop your screenshots into the GitHub editor to replace these placeholders!)

Login & OTP Verification [Insert Image Here]
Real-Time Dashboard & Chat [Insert Image Here]
WebRTC Video Meetings [Insert Image Here]
🚀 How to Run Locally
Prerequisites
Node.js installed on your machine.
Your own Firebase Project and EmailJS account if you intend to fork the database.
Installation
Clone the repository:

bash

git clone https://github.com/akhilsurabhi07/Messageing-Platform-.git
cd Messageing-Platform-/Communication.Plat
Install dependencies:

bash

npm install
Start the development server:

bash

npm run dev
Open http://localhost:5173 in your browser.

☁️ Deployment
This project is deployed to Google's CDN via Firebase Hosting.

To compile and deploy a new version:

bash

# 1. Compile the React code into optimized static files
cd Communication.Plat
npm run build
# 2. Go back to the root folder
cd ..
# 3. Deploy to Firebase
firebase deploy --only hosting
🧠 Architectural Highlights
Backend-less Design: By utilizing the Firebase Client SDK and strictly configuring firestore.rules, we eliminate the need to host a traditional Node.js/Express server. React talks directly to the database securely.
WebRTC Signaling: Video meetings do not use external APIs like Zoom or Daily.co. We manually implemented the WebRTC protocol, using Firestore to exchange Session Description Protocol (SDP) objects to establish direct Peer-to-Peer tunnels.
Optimized Caching: The Vite PWA plugin hashes file names upon every build. The Service Worker silently checks for these hash changes in the background, downloads updates without interrupting the user, and swaps to the new code upon the next app launch.
