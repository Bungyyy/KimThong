import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    updateProfile,
    sendPasswordResetEmail,
    fetchSignInMethodsForEmail
  } from 'firebase/auth';
  import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
  import { auth, db } from './firebaseConfig';

  export const registerUser = async (email, password, displayName, qrDetails) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: displayName
      });

      await setDoc(doc(db, "users", user.uid), {
        email: email,
        username: displayName.toLowerCase().replace(/\s+/g, ''),
        displayName: displayName,
        createdAt: new Date(),
        qrPayment: qrDetails || null,
        groups: []
      });
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  export const loginUser = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  export const loginWithUsername = async (username, password) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: "Username not found" };
      }
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      return await loginUser(userData.email, password);
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  export const sendPasswordReset = async (emailOrUsername) => {
    try {
      let email = emailOrUsername;
      if (!emailOrUsername.includes('@')) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", emailOrUsername.toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          return { success: false, error: "Username not found" };
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        email = userData.email;
      } else {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length === 0) {
          return { success: false, error: "Email not found" };
        }
      }

      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  export const logoutUser = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  export const updateQRPayment = async (userId, qrDetails) => {
    try {
      await setDoc(doc(db, "users", userId), {
        qrPayment: qrDetails
      }, { merge: true });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };