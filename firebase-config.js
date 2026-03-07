// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAzwlCAE9Bm0F8RtHO1LLis6fAJv6yYNaU",
  authDomain: "momento-service.firebaseapp.com",
  projectId: "momento-service",
  storageBucket: "momento-service.firebasestorage.app",
  messagingSenderId: "394755743488",
  appId: "1:394755743488:web:55bfdd92c2bbada5cf1de5",
  measurementId: "G-3X4SKR6QZ2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// 추후 연결 예정
export const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY';
export const TOSS_CLIENT_KEY = 'YOUR_TOSS_CLIENT_KEY';
