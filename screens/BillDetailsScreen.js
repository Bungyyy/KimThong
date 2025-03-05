import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { formatDate } from '../utils/dateFormatter';

const BillDetailsScreen = ({ route, navigation }) => {
  const { billId } = route.params;
  
  const [bill, setBill] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [billOwner, setBillOwner] = useState(null);
  const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);
  
  useEffect(() => {
    fetchBillDetails();
  }, []);
  
  const fetchBillDetails = async () => {
    setIsLoading(true);
    try {
      // Get bill details
      const billDoc = await getDoc(doc(db, "bills", billId));
      if (!billDoc.exists()) {
        Alert.alert("Error", "Bill not found");
        navigation.goBack();
        return;
      }
      
      const billData = billDoc.data();
      setBill(billData);
      
      // Check if current user is bill owner
      const currentUserId = auth.currentUser.uid;
      setIsCurrentUserOwner(currentUserId === billData.paidBy);
      
      // Get menu items
      if (billData.menuItems) {
        setMenuItems(billData.menuItems);
      }
      
      // Get all users for name mapping
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = {};
      const participantsList = [];
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        usersData[doc.id] = {
          name: userData.displayName,
          email: userData.email,
          qrPayment: userData.qrPayment || null
        };
        
        // Add to participants list if in bill
        if (billData.participants.includes(doc.id)) {
          participantsList.push({
            id: doc.id,
            name: userData.displayName,
            email: userData.email,
            qrPayment: userData.qrPayment || null,
            amount: billData.splitAmounts[doc.id] || 0
          });
        }
        
        // Set bill owner
        if (doc.id === billData.paidBy) {
          setBillOwner({
            id: doc.id,
            name: userData.displayName,
            email: userData.email,
            qrPayment: userData.qrPayment || null
          });
        }
      });
      
      setUserMap(usersData);
      setParticipants(participantsList);
      
      // Process payment status - using the same currentUserId from above
      const paymentsList = [];
      
      // For each participant
      billData.participants.forEach(participantId => {
        if (participantId !== billData.paidBy) { // Skip the bill owner
          const amount = billData.splitAmounts[participantId] || 0;
          const paidAmount = billData.payments && billData.payments[participantId] ? 
                           billData.payments[participantId].amount : 0;
          
          // Check confirmation status
          const isConfirmed = billData.payments && 
                            billData.payments[participantId] &&
                            billData.payments[participantId].status === 'confirmed';
                            
          const isPending = billData.payments && 
                          billData.payments[participantId] && 
                          !isConfirmed;
          
          // Check if payment was requested
          const isRequested = billData.payments && 
                            billData.payments[`request_${participantId}`] &&
                            billData.payments[`request_${participantId}`].status === 'requested';
          
          const status = isConfirmed ? 'confirmed' : 
                       isPending ? 'pending' : 
                       isRequested ? 'requested' : 'unpaid';
          
          paymentsList.push({
            id: `${billId}_${participantId}`,
            userId: participantId,
            ownerId: billData.paidBy,
            amount: amount,
            paidAmount: paidAmount,
            remainingAmount: amount - paidAmount,
            status: status,
            name: usersData[participantId]?.name || 'Unknown',
            billId: billId
          });
        }
      });
      
      setPaymentStatus(paymentsList);
      
    } catch (error) {
      console.error("Error fetching bill details:", error);
      Alert.alert("Error", "Failed to load bill details");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePaymentAction = (payment) => {
    const currentUserId = auth.currentUser.uid;
    
    // If current user is the payer (regardless of request status)
    if (currentUserId === payment.userId) {
      if (payment.status === 'confirmed') {
        Alert.alert("Payment Confirmed", "This payment has been completed and confirmed.");
      } else {
        // Allow direct payment without requiring request
        navigation.navigate('ConfirmPayment', {
          billId: billId,
          payerId: payment.userId,
          ownerId: payment.ownerId,
          amount: payment.amount
        });
      }
    }
    // If current user is the bill owner
    else if (currentUserId === payment.ownerId) {
      if (payment.status === 'confirmed') {
        Alert.alert("Payment Confirmed", "This payment has been completed and confirmed.");
      } else if (payment.status === 'pending') {
        Alert.alert("Payment Pending", `${payment.name} has claimed to have paid. Please check your account.`);
      } else {
        // Owner wants to request payment
        navigation.navigate('RequestPayment', {
          billId: billId,
          payerId: payment.userId,
          ownerId: payment.ownerId,
          amount: payment.amount
        });
      }
    }
    // If current user is neither owner nor payer
    else {
      Alert.alert("Payment Status", `This payment is currently ${payment.status}.`);
    }
  };
  
  const handleEditBill = () => {
    // Only allow bill owner to edit
    if (!isCurrentUserOwner) {
      Alert.alert("Not Authorized", "Only the bill owner can edit this bill.");
      return;
    }
    
    navigation.navigate('EditBill', { billId: billId, bill: bill });
  };
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed':
        return <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />;
      case 'pending':
        return <Ionicons name="time" size={24} color="#FF9800" />;
      case 'requested':
        return <Ionicons name="arrow-forward-circle" size={24} color="#2196F3" />;
      case 'unpaid':
      default:
        return <Ionicons name="alert-circle" size={24} color="#FF5722" />;
    }
  };
  
  const getStatusText = (status) => {
    switch(status) {
      case 'confirmed':
        return "Confirmed";
      case 'pending':
        return "Pending Confirmation";
      case 'requested':
        return "Payment Requested";
      case 'unpaid':
      default:
        return "Unpaid";
    }
  };
  
  const getActionText = (payment, isCurrentUserOwner) => {
    const status = payment.status;
    
    if (isCurrentUserOwner) {
      if (status === 'unpaid' || status === 'requested') {
        return 'Request Payment';
      }
    } else {
      if (status !== 'confirmed') {
        return 'Make Payment';
      }
    }
    
    return null;
  };
  
  const renderPaymentItem = ({ item }) => {
    const currentUserId = auth.currentUser.uid;
    const isCurrentUserPayer = currentUserId === item.userId;
    
    const actionText = getActionText(item, isCurrentUserOwner);
    
    return (
      <TouchableOpacity
        style={[styles.paymentItem, 
          item.status === 'confirmed' ? styles.confirmedItem : 
          item.status === 'pending' ? styles.pendingItem : 
          item.status === 'requested' ? styles.requestedItem :
          styles.unpaidItem
        ]}
        onPress={() => handlePaymentAction(item)}
        disabled={item.status === 'confirmed'}
      >
        <View style={styles.paymentHeader}>
          <Text style={styles.personName}>{item.name}</Text>
          <Text style={styles.paymentAmount}>{item.amount.toFixed(2)} THB</Text>
        </View>
        
        <View style={styles.paymentStatus}>
          {getStatusIcon(item.status)}
          <Text style={[
            styles.statusText,
            item.status === 'confirmed' ? styles.confirmedText : 
            item.status === 'pending' ? styles.pendingText : 
            item.status === 'requested' ? styles.requestedText :
            styles.unpaidText
          ]}>
            {getStatusText(item.status)}
          </Text>
        </View>
        
        {actionText && (
          <TouchableOpacity 
            style={[
              styles.actionButton,
              isCurrentUserOwner ? styles.requestButton : styles.payButton
            ]}
            onPress={() => handlePaymentAction(item)}
          >
            <Text style={styles.actionButtonText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };
  
  const renderMenuItem = ({ item }) => {
    const consumerNames = item.consumers.map(userId => {
      const user = userMap[userId];
      return user ? user.name : 'Unknown';
    }).join(', ');
    
    return (
      <View style={styles.menuItem}>
        <View style={styles.menuItemHeader}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          <Text style={styles.menuItemPrice}>{parseFloat(item.price).toFixed(2)} THB</Text>
        </View>
        <Text style={styles.menuItemConsumers}>Consumers: {consumerNames}</Text>
      </View>
    );
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B478B" />
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.billSummary}>
        <View style={styles.restaurantContainer}>
          <Text style={styles.restaurantName}>{bill.restaurant}</Text>
          <Text style={styles.billDate}>
            {bill.createdAt ? formatDate(bill.createdAt) : 'Unknown date'}
          </Text>
        </View>
        
        <View style={styles.amountContainer}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>{bill.totalAmount.toFixed(2)} THB</Text>
        </View>
        
        <View style={styles.paidByContainer}>
          <Text style={styles.paidByLabel}>Paid by</Text>
          <Text style={styles.paidByName}>{billOwner?.name || 'Unknown'}</Text>
        </View>
        
        {isCurrentUserOwner && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={handleEditBill}
          >
            <Ionicons name="pencil" size={16} color="#fff" />
            <Text style={styles.editButtonText}>Edit Bill</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payment Status</Text>
      </View>
      
      <FlatList
        data={paymentStatus}
        renderItem={renderPaymentItem}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.paymentsList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No payments required</Text>
        }
      />
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Menu Items</Text>
      </View>
      
      {menuItems.length > 0 ? (
        <FlatList
          data={menuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item, index) => `menu-${index}`}
          scrollEnabled={false}
          contentContainerStyle={styles.menuList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No menu items found</Text>
        </View>
      )}
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Participants</Text>
      </View>
      
      <View style={styles.participantsList}>
        {participants.map(participant => (
          <View key={participant.id} style={styles.participantItem}>
            <View style={styles.participantAvatar}>
              <Text style={styles.participantInitial}>{participant.name.charAt(0)}</Text>
            </View>
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>{participant.name}</Text>
              <Text style={styles.participantAmount}>
                {participant.amount.toFixed(2)} THB
              </Text>
            </View>
          </View>
        ))}
      </View>
      
      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billSummary: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantContainer: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  billDate: {
    fontSize: 14,
    color: '#666',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2B478B',
  },
  paidByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  paidByLabel: {
    fontSize: 16,
    color: '#666',
  },
  paidByName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B478B',
    padding: 10,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F0E8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2B478B',
  },
  paymentsList: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  paymentItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  confirmedItem: {
    backgroundColor: '#E8F5E9',
  },
  pendingItem: {
    backgroundColor: '#FFF8E1',
  },
  requestedItem: {
    backgroundColor: '#E3F2FD',  
  },
  unpaidItem: {
    backgroundColor: '#FFF',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  personName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  confirmedText: {
    color: '#4CAF50',
  },
  pendingText: {
    color: '#FF9800',
  },
  requestedText: {
    color: '#2196F3',
  },
  unpaidText: {
    color: '#FF5722',
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  requestButton: {
    backgroundColor: '#2B478B',
  },
  payButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  menuList: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B478B',
  },
  menuItemConsumers: {
    fontSize: 14,
    color: '#666',
  },
  participantsList: {
    backgroundColor: '#fff',
    padding: 16,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B478B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  participantAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B478B',
  },
  emptyContainer: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  footer: {
    height: 40,
  },
});

export default BillDetailsScreen;