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
  export const addBill = async (billData) => {
    try {
      const billWithStatus = {
        ...billData,
        createdAt: Timestamp.now(),
        status: 'active'
      };
      
      const docRef = await addDoc(collection(db, "bills"), billWithStatus);
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
  export const requestPayment = async (billId, payerId, ownerId, amount) => {
    try {
      const billRef = doc(db, "bills", billId);
      const billDoc = await getDoc(billRef);
      if (!billDoc.exists()) {
        return { success: false, error: "Bill not found" };
      }
      
      const billData = billDoc.data();
      const updatedPayments = billData.payments || {};
      updatedPayments[`request_${payerId}`] = {
        amount: amount,
        requestedBy: ownerId,
        requestedAt: Timestamp.now(),
        status: 'requested'
      };

      await updateDoc(billRef, {
        payments: updatedPayments
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error requesting payment:", error);
      return { success: false, error: error.message };
    }
  };

  export const confirmPayment = async (billId, payerId, ownerId, amount, paymentDetails = {}) => {
    try {
      const billRef = doc(db, "bills", billId);
      const billDoc = await getDoc(billRef);
      if (!billDoc.exists()) {
        return { success: false, error: "Bill not found" };
      }
      
      const billData = billDoc.data();
      const updatedPayments = billData.payments || {};

      updatedPayments[payerId] = {
        amount: amount,
        paidAt: Timestamp.now(),
        paidTo: ownerId,
        details: paymentDetails,
        status: 'confirmed'
      };

      updatedPayments[`${payerId}_${ownerId}`] = {
        amount: amount,
        confirmedAt: Timestamp.now(),
        details: paymentDetails,
        status: 'confirmed'
      };
      
      if (updatedPayments[`request_${payerId}`]) {
        updatedPayments[`request_${payerId}`].status = 'completed';
        updatedPayments[`request_${payerId}`].completedAt = Timestamp.now();
      }

      await updateDoc(billRef, {
        payments: updatedPayments
      });
      
      const allParticipantsPaid = billData.participants.every(participantId => {

        if (participantId === billData.paidBy) return true;
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
      const billDoc = await getDoc(billRef);
      if (!billDoc.exists()) {
        return { success: false, error: "Bill not found" };
      }
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