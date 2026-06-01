import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAls6knQHjScbxJPB8NjMU3V_QmiPCRGrE',
  authDomain: 'novelle-17dd7.firebaseapp.com',
  projectId: 'novelle-17dd7',
  storageBucket: 'novelle-17dd7.firebasestorage.app',
  messagingSenderId: '615247814349',
  appId: '1:615247814349:web:5d81e2bc8fe7c24757d384',
  measurementId: 'G-BCKDLVJSJD',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account',
});
