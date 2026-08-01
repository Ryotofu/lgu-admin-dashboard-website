// 1. You MUST have these two imports at the top:
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; 

// 2. Your keys stay exactly the same:
const firebaseConfig = {
  apiKey: "AIzaSyBSe66yhHCeMol8G3kaOhpwaBig293iz0E",
  authDomain: "ireport-mataasnakahoy.firebaseapp.com",
  projectId: "ireport-mataasnakahoy",
  storageBucket: "ireport-mataasnakahoy.firebasestorage.app",
  messagingSenderId: "1012159203170",
  appId: "1:1012159203170:web:6c866f429dbc1b25724e3b"
};

// 3. You MUST have these two lines at the very bottom:
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);