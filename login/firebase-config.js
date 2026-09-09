import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAwXP9KUEUdiu0836CE20HCX-lBrGmiqjI",
  authDomain: "youomni-7d0d6.firebaseapp.com",
  projectId: "youomni-7d0d6",
  storageBucket: "youomni-7d0d6.firebasestorage.app",
  messagingSenderId: "604663505682",
  appId: "1:604663505682:web:4132d3f7f5c908b31409cb"
};

const APP = initializeApp(FIREBASE_CONFIG);
export const AUTH = getAuth(APP);
export const DB = getFirestore(APP);