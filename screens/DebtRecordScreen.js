import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../services/firebaseConfig';
import { getUserBills } from '../services/bills';
import { collection, getDocs } from 'firebase/firestore';
import { formatDate } from '../utils/dateFormatter';

const DebtRecordScreen = ({ navigation }) => {
  const [debts, setDebts] = useState([]);
  const [credits, setCredits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userMap, setUserMap] = useState({});
  const [totalDebt, setTotalDebt] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [selectedTab, setSelectedTab] = useState('debt');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userId = auth.currentUser.uid;
      
      // Get all users for name mapping
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = {};
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        usersData[doc.id] = {
          name: userData.displayName,
          email: userData.email,
        };
      });
      
      setUserMap(usersData);
      
      // Get bills where user is a participant
      const billsResult = await getUserBills(userId);
      
      if (billsResult.success) {
        const myDebts = [];
        const myCredits = [];
        let debtTotal = 0;
        let creditTotal = 0;
        
        billsResult.bills.forEach(bill => {
          // You owe someone
          if (bill.paidBy !== userId && bill.participants.includes(userId)) {
            const debtAmount = bill.splitAmounts[userId] || 0;
            const paidAmount = bill.payments && bill.payments[userId] ? bill.payments[userId].amount : 0;
            const remainingDebt = debtAmount - paidAmount;
            
            if (remainingDebt > 0) {
              myDebts.push({
                id: bill.id,
                amount: remainingDebt,
                to: bill.paidBy,
                restaurant: bill.restaurant,
                date: bill.createdAt,
                dueDate: bill.dueDate,
                billId: bill.id
              });
              
              debtTotal += remainingDebt;
            }
          }
          
          // Someone owes you
          if (bill.paidBy === userId) {
            bill.participants.forEach(participantId => {
              if (participantId !== userId) {
                const creditAmount = bill.splitAmounts[participantId] || 0;
                const paidAmount = bill.payments && bill.payments[participantId] ? bill.payments[participantId].amount : 0;
                const remainingCredit = creditAmount - paidAmount;
                
                if (remainingCredit > 0) {
                  myCredits.push({
                    id: `${bill.id}_${participantId}`,
                    amount: remainingCredit,
                    from: participantId,
                    restaurant: bill.restaurant,
                    date: bill.createdAt,
                    dueDate: bill.dueDate,
                    billId: bill.id
                  });
                  
                  creditTotal += remainingCredit;
                }
              }
            });
          }
        });
        
        // Sort by date, newest first
        myDebts.sort((a, b) => new Date(b.date.seconds * 1000) - new Date(a.date.seconds * 1000));
        myCredits.sort((a, b) => new Date(b.date.seconds * 1000) - new Date(a.date.seconds * 1000));
        
        setDebts(myDebts);
        setCredits(myCredits);
        setTotalDebt(debtTotal);
        setTotalCredit(creditTotal);
      }
    } catch (error) {
      console.error("Error fetching debt records:", error);
      Alert.alert("Error", "Failed to load debt records");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderDebtItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.debtItem}
      onPress={() => {
        // Navigate to bill details would be implemented in a real app
        Alert.alert("Debt Details", `You owe ${userMap[item.to]?.name || 'Unknown'} ${item.amount} THB for ${item.restaurant}`);
      }}
    >
      <View style={styles.debtItemHeader}>
        <Text style={styles.debtItemTitle}>{item.restaurant}</Text>
        <Text style={styles.debtItemAmount}>{item.amount.toFixed(2)} THB</Text>
      </View>
      
      <View style={styles.debtItemDetails}>
        <Text style={styles.debtItemDate}>Due: {formatDate(item.dueDate)}</Text>
        <Text style={styles.debtItemPerson}>
          To: {userMap[item.to]?.name || 'Unknown'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderCreditItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.creditItem}
      onPress={() => {
        // Navigate to bill details would be implemented in a real app
        Alert.alert("Credit Details", `${userMap[item.from]?.name || 'Unknown'} owes you ${item.amount} THB for ${item.restaurant}`);
      }}
    >
      <View style={styles.debtItemHeader}>
        <Text style={styles.debtItemTitle}>{item.restaurant}</Text>
        <Text style={styles.creditItemAmount}>{item.amount.toFixed(2)} THB</Text>
      </View>
      
      <View style={styles.debtItemDetails}>
        <Text style={styles.debtItemDate}>Due: {formatDate(item.dueDate)}</Text>
        <Text style={styles.debtItemPerson}>
          From: {userMap[item.from]?.name || 'Unknown'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Total Debt</Text>
          <Text style={styles.summaryAmount}>{totalDebt.toFixed(2)} THB</Text>
        </View>
        
        <View style={styles.summaryDivider} />
        
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Total Credit</Text>
          <Text style={[styles.summaryAmount, styles.creditAmount]}>{totalCredit.toFixed(2)} THB</Text>
        </View>
      </View>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'debt' && styles.activeTab]}
          onPress={() => setSelectedTab('debt')}
        >
          <Text style={[styles.tabText, selectedTab === 'debt' && styles.activeTabText]}>
            You Owe ({debts.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'credit' && styles.activeTab]}
          onPress={() => setSelectedTab('credit')}
        >
          <Text style={[styles.tabText, selectedTab === 'credit' && styles.activeTabText]}>
            Owed to You ({credits.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B478B" />
        </View>
      ) : (
        <FlatList
          data={selectedTab === 'debt' ? debts : credits}
          renderItem={selectedTab === 'debt' ? renderDebtItem : renderCreditItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons 
                name={selectedTab === 'debt' ? 'cash-outline' : 'wallet-outline'} 
                size={60} 
                color="#999"
              />
              <Text style={styles.emptyStateText}>
                {selectedTab === 'debt' 
                  ? "No debts" 
                  : "No credits"}
              </Text>
              <Text style={styles.emptyStateSubText}>
                {selectedTab === 'debt' 
                  ? "You don't owe anyone" 
                  : "No one owes you money"}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5F0E8',
      paddingTop: 20, // Add this line
    },
    summaryContainer: {
      flexDirection: 'row',
      backgroundColor: '#fff',
      margin: 20,
      marginTop: 40, // Increase this value from 20 to 40
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
  summaryBox: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#777',
    marginBottom: 5,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  creditAmount: {
    color: '#4CAF50',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#2B478B',
  },
  tabText: {
    fontWeight: 'bold',
    color: '#555',
  },
  activeTabText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  debtItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  creditItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  debtItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  debtItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  debtItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  creditItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  debtItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  debtItemDate: {
    fontSize: 14,
    color: '#777',
  },
  debtItemPerson: {
    fontSize: 14,
    color: '#555',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 15,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
});

export default DebtRecordScreen;