import { 
    collection, 
    addDoc, 
    updateDoc, 
    getDoc,
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
  
  // Request payment from user
  export const requestPayment = async (billId, payerId, ownerId, amount) => {
    try {
      const billRef = doc(db, "bills", billId);
      
      // Get current bill data
      const billDoc = await getDoc(billRef);
      if (!billDoc.exists()) {
        return { success: false, error: "Bill not found" };
      }
      
      const billData = billDoc.data();
      
      // Update the payments object
      const updatedPayments = billData.payments || {};
      
      // Create or update payment request
      updatedPayments[`request_${payerId}`] = {
        amount: amount,
        requestedBy: ownerId,
        requestedAt: Timestamp.now(),
        status: 'requested'
      };
      
      // Update the bill
      await updateDoc(billRef, {
        payments: updatedPayments
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error requesting payment:", error);
      return { success: false, error: error.message };
    }
  };
  
  // Confirm payment by payer
  export const confirmPayment = async (billId, payerId, ownerId, amount, paymentDetails = {}) => {
    try {
      const billRef = doc(db, "bills", billId);
      
      // Get current bill data
      const billDoc = await getDoc(billRef);
      if (!billDoc.exists()) {
        return { success: false, error: "Bill not found" };
      }
      
      const billData = billDoc.data();
      
      // Update the payments object
      const updatedPayments = billData.payments || {};
      
      // Record that the debtor (payer) has paid
      updatedPayments[payerId] = {
        amount: amount,
        paidAt: Timestamp.now(),
        paidTo: ownerId,
        details: paymentDetails,
        status: 'confirmed'
      };
      
      // Record the confirmation in the shared record
      updatedPayments[`${payerId}_${ownerId}`] = {
        amount: amount,
        confirmedAt: Timestamp.now(),
        details: paymentDetails,
        status: 'confirmed'
      };
      
      // Update request status if it exists
      if (updatedPayments[`request_${payerId}`]) {
        updatedPayments[`request_${payerId}`].status = 'completed';
        updatedPayments[`request_${payerId}`].completedAt = Timestamp.now();
      }
      
      // Update the bill
      await updateDoc(billRef, {
        payments: updatedPayments
      });
      
      // Check if all payments are complete and update bill status if needed
      const allParticipantsPaid = billData.participants.every(participantId => {
        // Skip the bill owner
        if (participantId === billData.paidBy) return true;
        
        // Check if participant has confirmed payment
        return updatedPayments[participantId] && 
               updatedPayments[participantId].status === 'confirmed';
      });
      
      if (allParticipantsPaid) {
        await updateDoc(billRef, {
          status: 'settled',
          settledAt: Timestamp.now()
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error confirming payment:", error);
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
        if (!data.payments || !data.payments[userId] || data.payments[userId].status !== 'confirmed') {
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
        if (!data.payments || !data.payments[userId] || data.payments[userId].status !== 'confirmed') {
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
  export const updateBill = async (billId, updatedData) => {
    try {
      const billRef = doc(db, "bills", billId);
      
      // Get current bill data to preserve other fields
      const billDoc = await getDoc(billRef);
      if (!billDoc.exists()) {
        return { success: false, error: "Bill not found" };
      }
      
      // Update the bill document with new data
      await updateDoc(billRef, {
        ...updatedData,
        updatedAt: Timestamp.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error updating bill:", error);
      return { success: false, error: error.message };
    }
  };