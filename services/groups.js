import { 
    collection, 
    addDoc, 
    updateDoc, 
    getDoc, 
    getDocs,
    doc, 
    query, 
    where, 
    arrayUnion 
  } from 'firebase/firestore';
  import { db } from './firebaseConfig';
  import { generateGroupCode } from '../utils/codeGenerator';
  
  // Create a new group
  export const createGroup = async (name, creatorId) => {
    try {
      // Generate a unique 6-character code for the group
      const groupCode = generateGroupCode();
      
      const groupData = {
        name,
        creator: creatorId,
        members: [creatorId],
        bills: [],
        groupCode,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, "groups"), groupData);
      
      // Add group reference to user
      const userRef = doc(db, "users", creatorId);
      await updateDoc(userRef, {
        groups: arrayUnion(docRef.id)
      });
      
      return { success: true, groupId: docRef.id, groupCode };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Join a group with code
  export const joinGroupWithCode = async (groupCode, userId) => {
    try {
      // Find group with the provided code
      const q = query(
        collection(db, "groups"),
        where("groupCode", "==", groupCode)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: "Invalid group code" };
      }
      
      // Get the first (and should be only) document
      const groupDoc = querySnapshot.docs[0];
      const groupId = groupDoc.id;
      
      // Add user to group members
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(userId)
      });
      
      // Add group to user's groups
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        groups: arrayUnion(groupId)
      });
      
      return { success: true, groupId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Get user's groups
  export const getUserGroups = async (userId) => {
    try {
      const q = query(
        collection(db, "groups"),
        where("members", "array-contains", userId)
      );
      
      const querySnapshot = await getDocs(q);
      const groups = [];
      
      querySnapshot.forEach((doc) => {
        groups.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, groups };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Get group details
  export const getGroupDetails = async (groupId) => {
    try {
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      
      if (!groupDoc.exists()) {
        return { success: false, error: "Group not found" };
      }
      
      return { 
        success: true, 
        group: {
          id: groupDoc.id,
          ...groupDoc.data()
        } 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };