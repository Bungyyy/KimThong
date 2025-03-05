import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { getOverdueBills, getUpcomingBills } from '../services/bills';
import { formatDate } from '../utils/dateFormatter';

const ReminderScreen = ({ navigation }) => {
  const [overdueBills, setOverdueBills] = useState([]);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overdue');

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      const userId = auth.currentUser.uid;
      const overdueResult = await getOverdueBills(userId);
      if (overdueResult.success) {
        setOverdueBills(overdueResult.bills);
      }

      const upcomingResult = await getUpcomingBills(userId);
      if (upcomingResult.success) {
        setUpcomingBills(upcomingResult.bills);
      }
    } catch (error) {
      console.error("Error fetching bills:", error);
      Alert.alert("Error", "Failed to load bills");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBills();
  };

  const renderBillItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.billItem}
      onPress={() => {
        Alert.alert("Bill Details", `You owe ${item.splitAmounts[auth.currentUser.uid]} THB for ${item.restaurant}`);
      }}
    >
      <View style={styles.billInfo}>
        <Text style={styles.billName}>{item.restaurant}</Text>
        <Text style={styles.billDate}>Due: {formatDate(item.dueDate)}</Text>
      </View>
      <View style={styles.billAmount}>
        <Text style={styles.billTotal}>{item.splitAmounts[auth.currentUser.uid]} THB</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overdue' && styles.activeTab]}
          onPress={() => setSelectedTab('overdue')}
        >
          <Text style={[styles.tabText, selectedTab === 'overdue' && styles.activeTabText]}>
            Overdue ({overdueBills.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'upcoming' && styles.activeTab]}
          onPress={() => setSelectedTab('upcoming')}
        >
          <Text style={[styles.tabText, selectedTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingBills.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B478B" />
        </View>
      ) : (
        <FlatList
          data={selectedTab === 'overdue' ? overdueBills : upcomingBills}
          renderItem={renderBillItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons 
                name={selectedTab === 'overdue' ? 'checkmark-circle' : 'calendar'} 
                size={60} 
                color="#999"
              />
              <Text style={styles.emptyStateText}>
                {selectedTab === 'overdue' 
                  ? "No overdue bills" 
                  : "No upcoming bills"}
              </Text>
              <Text style={styles.emptyStateSubText}>
                {selectedTab === 'overdue' 
                  ? "You're all caught up" 
                  : "All your bills are up to date"}
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
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 20,
    marginVertical: 15,
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
    paddingTop: 5,
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  billInfo: {
    flex: 1,
  },
  billName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  billDate: {
    fontSize: 14,
    color: '#666',
  },
  billAmount: {
    alignItems: 'flex-end',
  },
  billTotal: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2B478B',
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

export default ReminderScreen;