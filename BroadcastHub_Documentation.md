# BroadcastHub: Complete Project Documentation

## 1. Project Overview
**BroadcastHub** is a secure, scalable, and responsive broadcast communication platform. It was designed to allow an Administrator to manage a large roster of users, organize them into groups, and send targeted messages (including text and file attachments). Users have a clean, focused interface to receive these messages in their inbox.

## 2. Technology Stack & Why We Chose It
To build a modern, high-performance platform, we utilized the following technologies:

### Frontend
- **React.js & Vite**: We used React for building a dynamic, component-based user interface. Vite was chosen as the build tool because it is incredibly fast and provides instant server starts during development.
- **Lucide React**: Used for sleek, modern SVG icons (like the Dashboard, Messages, and Notification icons).
- **Custom CSS**: We used custom CSS to create a beautiful, glassmorphic Day/Night mode UI that is fully responsive on both Desktop and Mobile.

### Backend & Infrastructure (Firebase)
Initially, the project started with a local Node.js and SQLite backend. However, to deploy it globally and make it accessible from any phone, we migrated to **Google Firebase**:
- **Firebase Authentication**: Handles secure login using Email/Password and Phone Number (OTP). It removes the burden of manually hashing passwords and managing login sessions.
- **Cloud Firestore**: A NoSQL real-time database. It stores our Users, Groups, and Messages. We chose this because it scales automatically and syncs data to the app instantly.
- **Firebase Hosting**: Used to deploy the React web application to the internet securely (`broadcasthub-v1-akhil.web.app`).

### Mobile App Wrapping
- **Ionic Capacitor**: A cross-platform runtime that takes our React website and wraps it into a native Android application (`.apk`). We chose Capacitor because it allows us to maintain a single codebase for both the Web and the Android app.
- **Android Studio**: Used to compile the Capacitor project into the final installable `app-debug.apk` file.

## 3. What We Built (Key Features)

### Admin Features
1. **Dashboard**: A high-level overview showing total users, groups, and recent messages.
2. **User Management**: Admins can add new users, assign roles, and delete users.
3. **Group Management**: Admins can create targeted groups (e.g., "Team A", "Management") and add specific users to them.
4. **Broadcast Messaging**: Admins can select specific groups or all users, attach files, and broadcast messages. 

### User Features
1. **Inbox**: A clean interface where users can read messages sent by the admin and download attachments.
2. **Notifications**: Alerts for new messages.

### Mobile Responsiveness
We implemented a purely CSS-based mobile layout. On a computer, the app shows a standard left-hand sidebar. On a mobile phone, it automatically transforms into a native-feeling app with a **Bottom Navigation Bar** and a sleek top header.

## 4. How We Did It (The Development Process)

**Phase 1: Foundation & UI**
We built the React frontend with dummy data to perfect the user interface, including the Dark Mode switch and responsive grids.

**Phase 2: Firebase Migration**
We connected the app to Firebase. We wrote code to fetch users from Firestore instead of local memory. We implemented Firebase Authentication so the Admin and Users could actually log in.

**Phase 3: Messaging & File Uploads**
We built the broadcast logic. When an admin sends a message, it writes a document to Firestore. We integrated file uploads using Firebase Storage, and optimized it to use `Promise.all` so multiple files upload in parallel (drastically reducing wait times).

**Phase 4: Mobile App Deployment**
We ran `npx cap init` and `npx cap add android` to generate an Android project. We then used Android Studio to build the `.apk`. 

**Phase 5: "Live Web Mode"**
To avoid needing to rebuild the APK every time we change a color or fix a bug, we updated `capacitor.config.ts` with a `server` block. Now, the Android app acts as a browser pointing to the live Firebase website. If the web code is updated via `firebase deploy`, the Android app updates instantly.

## 5. How It Is Deployed
1. **Web Deployment**: 
   - We run `npm run build` to package the React code.
   - We run `firebase deploy --only hosting` to upload the packaged code to Google's servers.
2. **Mobile Deployment**:
   - The `.apk` file is generated in Android Studio.
   - Because of Firebase Free Tier restrictions, the `.apk` cannot be hosted directly on the Firebase website.
   - The `.apk` is distributed to users via Google Drive or direct messaging (WhatsApp/Email).

## 6. Pending / Next Steps
- **Cloudinary Integration**: Because Firebase Storage has regional restrictions on its free tier, the system is prepped to migrate file storage to Cloudinary to ensure 100% free, unrestricted file uploads.
- **Push Notifications (FCM)**: Implementing Firebase Cloud Messaging to send push notifications to users' phones when a new message is broadcasted.
