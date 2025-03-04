import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    query, 
    where, 
    getDocs, 
    arrayUnion, 
    Timestamp 
  } from 'firebase/firestore';
  import { db } from './firebaseConfig';
  
  // Add a new bill
  export const addBill = async (billData) => {
    try {
      // Create bill with status
      const billWithStatus = {
        ...billData,
        createdAt: Timestamp.now(),
        status: 'active'
      };
      
      const docRef = await addDoc(collection(db, "bills"), billWithStatus);
      
      // Update group with bill reference if it belongs to a group
      if (billData.groupId) {
        const groupDocRef = doc(db, "groups", billData.groupId);
        await updateDoc(groupDocRef, {
          bills: arrayUnion(docRef.id)
        });
      }
      
      return { success: true, billId: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Update bill payment status
  export const updatePaymentStatus = async (billId, userId, amount) => {
    try {
      const billRef = doc(db, "bills", billId);
      
      await updateDoc(billRef, {
        [`payments.${userId}`]: {
          amount,
          paidAt: Timestamp.now()
        }
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Get user's bills (where they are a participant)
  export const getUserBills = async (userId) => {
    try {
      const q = query(
        collection(db, "bills"),
        where("participants", "array-contains", userId)
      );
      
      const querySnapshot = await getDocs(q);
      const bills = [];
      
      querySnapshot.forEach((doc) => {
        bills.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, bills };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Get bills for a specific group
  export const getGroupBills = async (groupId) => {
    try {
      const q = query(
        collection(db, "bills"),
        where("groupId", "==", groupId)
      );
      
      const querySnapshot = await getDocs(q);
      const bills = [];
      
      querySnapshot.forEach((doc) => {
        bills.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, bills };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Get overdue bills
  export const getOverdueBills = async (userId) => {
    try {
      const today = new Date();
      const q = query(
        collection(db, "bills"),
        where("participants", "array-contains", userId),
        where("dueDate", "<", today),
        where("status", "==", "active")
      );
      
      const querySnapshot = await getDocs(q);
      const bills = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include if this user hasn't paid yet
        if (!data.payments || !data.payments[userId]) {
          bills.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      return { success: true, bills };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  // Get upcoming bills
  export const getUpcomingBills = async (userId) => {
    try {
      const today = new Date();
      const q = query(
        collection(db, "bills"),
        where("participants", "array-contains", userId),
        where("dueDate", ">=", today),
        where("status", "==", "active")
      );
      
      const querySnapshot = await getDocs(q);
      const bills = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include if this user hasn't paid yet
        if (!data.payments || !data.payments[userId]) {
          bills.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      return { success: true, bills };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };