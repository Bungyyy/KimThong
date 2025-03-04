import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../services/firebaseConfig';
import { getGroupDetails, deleteGroup } from '../services/groups';
import { getGroupBills } from '../services/bills';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

const GroupDetailsScreen = ({ route, navigation }) => {
  const { groupId } = route.params;
  const [groupDetails, setGroupDetails] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupBills, setGroupBills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  
  useEffect(() => {
    fetchGroupDetails();
  }, []);

  const fetchGroupDetails = async () => {
    setIsLoading(true);
    try {
      // Get group details
      const result = await getGroupDetails(groupId);
      
      if (result.success) {
        setGroupDetails(result.group);
        
        // Check if current user is creator
        setIsCreator(result.group.creator === auth.currentUser.uid);
        
        // Get group members
        const memberIds = result.group.members;
        const usersSnapshot = await getDocs(collection(db, "users"));
        const membersData = [];
        
        usersSnapshot.forEach(doc => {
          if (memberIds.includes(doc.id)) {
            const userData = doc.data();
            membersData.push({
              id: doc.id,
              name: userData.displayName,
              email: userData.email,
              isCreator: doc.id === result.group.creator
            });
          }
        });
        
        setGroupMembers(membersData);
        
        // Get group bills
        const billsResult = await getGroupBills(groupId);
        if (billsResult.success) {
          setGroupBills(billsResult.bills);
        }
      } else {
        Alert.alert("Error", "Failed to load group details");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error loading group details:", error);
      Alert.alert("Error", "Failed to load group details");
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const shareGroupCode = async () => {
    try {
      const result = await Share.share({
        message: `Join my group "${groupDetails.name}" on Split Bill app! Group code: ${groupDetails.groupCode}`,
        title: "Share Group Code"
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share group code");
    }
  };

  const handleDeleteGroup = async () => {
    if (!isCreator) {
      Alert.alert("Error", "Only the group creator can delete this group");
      return;
    }
    
    setDeleteModalVisible(true);
  };

  const confirmDeleteGroup = async () => {
    setIsLoading(true);
    try {
      const result = await deleteGroup(groupId);
      
      if (result.success) {
        Alert.alert("Success", "Group deleted successfully");
        navigation.goBack();
      } else {
        Alert.alert("Error", result.error || "Failed to delete group");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      Alert.alert("Error", "Failed to delete group");
    } finally {
      setIsLoading(false);
      setDeleteModalVisible(false);
    }
  };

  const renderMemberItem = ({ item }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.name} {item.isCreator && '(Creator)'}
        </Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>
    </View>
  );

  const renderBillItem = ({ item }) => (
    <TouchableOpacity
      style={styles.billItem}
      onPress={() => {
        // Navigate to bill details (would be implemented in a real app)
        Alert.alert("Bill Details", `Restaurant: ${item.restaurant}, Total: ${item.totalAmount} THB`);
      }}
    >
      <View style={styles.billInfo}>
        <Text style={styles.billName}>{item.restaurant}</Text>
        <Text style={styles.billDate}>
          Created: {new Date(item.createdAt.seconds * 1000).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.billAmount}>{item.totalAmount} THB</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B478B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.groupInfoContainer}>
        <View style={styles.groupHeader}>
          <View style={styles.groupIcon}>
            <Text style={styles.groupInitial}>
              {groupDetails?.name.charAt(0) || 'G'}
            </Text>
          </View>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{groupDetails?.name}</Text>
            <Text style={styles.groupMeta}>
              {groupMembers.length} members • {groupBills.length} bills
            </Text>
          </View>
        </View>
        
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Group Code:</Text>
          <View style={styles.codeWrapper}>
            <Text style={styles.codeText}>{groupDetails?.groupCode}</Text>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={shareGroupCode}
            >
              <Ionicons name="share-outline" size={20} color="#2B478B" />
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.codeHelper}>
            Share this code with friends so they can join your group
          </Text>
        </View>
      </View>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Members ({groupMembers.length})</Text>
      </View>
      
      <FlatList
        data={groupMembers}
        renderItem={renderMemberItem}
        keyExtractor={(item) => item.id}
        style={styles.membersList}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No members found</Text>
        }
      />
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Bills</Text>
      </View>
      
      <FlatList
        data={groupBills.slice(0, 3)} // Show only 3 most recent bills
        renderItem={renderBillItem}
        keyExtractor={(item) => item.id}
        style={styles.billsList}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No bills in this group yet</Text>
        }
      />
      
      {isCreator && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteGroup}
        >
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete Group</Text>
        </TouchableOpacity>
      )}
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete Group</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this group? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmDeleteGroup}
              >
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  groupInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  groupIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2B478B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  groupInitial: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  groupMeta: {
    fontSize: 14,
    color: '#666',
  },
  codeContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 15,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  codeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  codeText: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#2B478B',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0f8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  shareText: {
    color: '#2B478B',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  codeHelper: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#F5F0E8',
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  membersList: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B478B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  memberInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#777',
  },
  billsList: {
    backgroundColor: '#fff',
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  billDate: {
    fontSize: 12,
    color: '#777',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B478B',
  },
  emptyText: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 15,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FF6B6B',
  },
  modalMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default GroupDetailsScreen;