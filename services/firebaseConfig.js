import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
const firebaseConfig = {
    apiKey: "AIzaSyDjJbKgk_ly0aq4eHygZ-Kw7e21lGbAzug",
    authDomain: "splitbill-71401.firebaseapp.com",
    projectId: "splitbill-71401",
    storageBucket: "splitbill-71401.firebasestorage.app",
    messagingSenderId: "833405791130",
    appId: "1:833405791130:web:8c618ec328d5a6800a6823",
    measurementId: "G-T0GT96FW6N"
  };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };