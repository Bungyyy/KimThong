import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserGroups } from '../services/groups';
import { getUserBills } from '../services/bills';
import { auth } from '../services/firebaseConfig';
import { formatDate } from '../utils/dateFormatter';

const HomeScreen = ({ navigation }) => {
  const [groups, setGroups] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userId = auth.currentUser.uid;
      
      // Get user's groups
      const groupsResult = await getUserGroups(userId);
      if (groupsResult.success) {
        setGroups(groupsResult.groups);
      }
      
      // Get user's recent bills
      const billsResult = await getUserBills(userId);
      if (billsResult.success) {
        // Sort by date, newest first
        const sortedBills = billsResult.bills.sort((a, b) => 
          new Date(b.createdAt.seconds * 1000) - new Date(a.createdAt.seconds * 1000)
        );
        // Get only the 5 most recent bills
        setRecentBills(sortedBills.slice(0, 5));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
      console.error(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh data when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });

    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.groupItem}
      onPress={() => {
        // Navigate to group details or bills listing for this group
        // This would be implemented in a real app
        Alert.alert('Group Selected', `Group: ${item.name}`);
      }}
    >
      <View style={styles.groupIcon}>
        <Text style={styles.groupInitial}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupMeta}>
          {item.members.length} members • {item.bills.length} bills
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderBillItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.billItem}
      onPress={() => {
        // Navigate to bill details
        // This would be implemented in a real app
        Alert.alert('Bill Selected', `Restaurant: ${item.restaurant}`);
      }}
    >
      <View style={styles.billInfo}>
        <Text style={styles.billName}>{item.restaurant}</Text>
        <Text style={styles.billDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={styles.billAmount}>
        <Text style={styles.billTotal}>{item.totalAmount} THB</Text>
        <Text style={styles.billStatus}>
          {item.status === 'active' ? 'Active' : 'Settled'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={recentBills}
        renderItem={renderBillItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.welcomeText}>
                Welcome, {auth.currentUser?.displayName || 'User'}
              </Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => navigation.navigate('MyQR')}
                >
                  <Ionicons name="qr-code" size={24} color="#2B478B" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => navigation.navigate('Reminder')}
                >
                  <Ionicons name="notifications" size={24} color="#2B478B" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('AddBill')}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Add Bill</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('CreateGroup')}
              >
                <Ionicons name="people" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Create Group</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('JoinGroup')}
              >
                <Ionicons name="enter" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Join Group</Text>
              </TouchableOpacity>
            </View>

            {groups.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Your Groups</Text>
                <FlatList
                  data={groups}
                  renderItem={renderGroupItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.groupList}
                />
              </View>
            )}

            {recentBills.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Recent Bills</Text>
              </View>
            )}
          </>
        }
        ListFooterComponent={
          recentBills.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#999" />
              <Text style={styles.emptyStateText}>No bills yet</Text>
              <Text style={styles.emptyStateSubText}>
                Add your first bill to get started
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2B478B',
    flexShrink: 1,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  actionButton: {
    backgroundColor: '#2B478B',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  groupList: {
    paddingRight: 20,
  },
  groupItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginRight: 15,
    flexDirection: 'row',
    alignItems: 'center',
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B478B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  groupInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  groupMeta: {
    fontSize: 12,
    color: '#666',
  },
  billItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 12,
    color: '#666',
  },
  billAmount: {
    alignItems: 'flex-end',
  },
  billTotal: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  billStatus: {
    fontSize: 12,
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
    marginTop: 10,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
});

export default HomeScreen;