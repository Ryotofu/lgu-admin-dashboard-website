import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

const app = initializeApp(firebaseConfig);

// Export Auth and Firestore services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;