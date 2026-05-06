import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDGyJrDLiCyt2e0MrVBy85Izdd90sKkuRA",
  authDomain: "geshogar-45e9f.firebaseapp.com",
  projectId: "geshogar-45e9f",
  storageBucket: "geshogar-45e9f.firebasestorage.app",
  messagingSenderId: "827275718560",
  appId: "1:827275718560:web:aa704696c8a904fe8a3ec5",
  measurementId: "G-FLC6XBY3PT"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
