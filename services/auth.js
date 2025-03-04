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
  
  // Register a new user
  export const registerUser = async (email, password, displayName, qrDetails) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update the user profile with display name
      await updateProfile(user, {
        displayName: displayName
      });
      
      // Create a user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        username: displayName.toLowerCase().replace(/\s+/g, ''), // Create a username from displayName
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
  
  // Login user with email
  export const loginUser = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Login with username
  export const loginWithUsername = async (username, password) => {
    try {
      // Query Firestore to find the user with this username
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: "Username not found" };
      }
      
      // We should have only one user with this username
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Now that we have the email, we can use it to login
      return await loginUser(userData.email, password);
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Forgot password
  export const sendPasswordReset = async (emailOrUsername) => {
    try {
      let email = emailOrUsername;
      
      // Check if the input is an email or username
      if (!emailOrUsername.includes('@')) {
        // It's a username, so we need to find the corresponding email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", emailOrUsername.toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          return { success: false, error: "Username not found" };
        }
        
        // Get the email from the user document
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        email = userData.email;
      } else {
        // It's an email, let's check if it exists
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length === 0) {
          return { success: false, error: "Email not found" };
        }
      }
      
      // Send password reset email
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Logout user
  export const logoutUser = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Update user QR payment details
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