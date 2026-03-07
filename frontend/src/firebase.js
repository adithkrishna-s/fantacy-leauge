// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyATtZ6Dut0G6djapiuvP0X95Y7C9upzOKo",
    authDomain: "fantacyleague-d5ff9.firebaseapp.com",
    projectId: "fantacyleague-d5ff9",
    storageBucket: "fantacyleague-d5ff9.firebasestorage.app",
    messagingSenderId: "838019150886",
    appId: "1:838019150886:web:529b871c3a7525661362e7",
    measurementId: "G-KRJJVJS78F",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
