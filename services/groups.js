import { 
    collection, 
    addDoc, 
    updateDoc, 
    getDoc, 
    getDocs,
    doc, 
    query, 
    where, 
    arrayUnion,
    arrayRemove,
    deleteDoc
  } from 'firebase/firestore';
  import { db } from './firebaseConfig';
  import { generateGroupCode } from '../utils/codeGenerator';
  export const createGroup = async (name, creatorId) => {
    try {
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
      const userRef = doc(db, "users", creatorId);
      await updateDoc(userRef, {
        groups: arrayUnion(docRef.id)
      });
      
      return { success: true, groupId: docRef.id, groupCode };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  export const joinGroupWithCode = async (groupCode, userId) => {
    try {
      const q = query(
        collection(db, "groups"),
        where("groupCode", "==", groupCode)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: "Invalid group code" };
      }
      const groupDoc = querySnapshot.docs[0];
      const groupId = groupDoc.id;
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(userId)
      });
      
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        groups: arrayUnion(groupId)
      });
      
      return { success: true, groupId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

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

  export const deleteGroup = async (groupId) => {
    try {
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      
      if (!groupDoc.exists()) {
        return { success: false, error: "Group not found" };
      }
      
      const groupData = groupDoc.data();
      const members = groupData.members || [];

      for (const memberId of members) {
        const userRef = doc(db, "users", memberId);
        await updateDoc(userRef, {
          groups: arrayRemove(groupId)
        });
      }

      await deleteDoc(doc(db, "groups", groupId));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };