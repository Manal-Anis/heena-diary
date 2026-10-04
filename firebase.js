import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyDRZ9TpZZHhqvElfV5eMTPRHPZoG3UpIC8",
    authDomain: "heenas-diary.firebaseapp.com",
    projectId: "heenas-diary",
    storageBucket: "heenas-diary.firebasestorage.app",
    messagingSenderId: "33231894821",
    appId: "1:33231894821:web:829aff858b6888ea6542cc",
    measurementId: "G-1FF7V9WHJH"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();


export { app, auth, db, googleProvider };