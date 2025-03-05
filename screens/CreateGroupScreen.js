import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../services/firebaseConfig';
import { createGroup } from '../services/groups';
import { collection, getDocs } from 'firebase/firestore';

const CreateGroupScreen = ({ navigation }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [userSelectModalVisible, setUserSelectModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = [];
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (doc.id !== auth.currentUser.uid) {
          usersData.push({
            id: doc.id,
            name: userData.displayName,
            email: userData.email,
          });
        }
      });
      
      setUsersList(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = (user) => {
    if (selectedUsers.some(u => u.id === user.id)) {
      Alert.alert("Error", "This user is already added to the group");
      return;
    }
    
    setSelectedUsers([...selectedUsers, user]);
    setUserSelectModalVisible(false);
  };

  const handleRemoveUser = (userId) => {
    const newSelectedUsers = selectedUsers.filter(u => u.id !== userId);
    setSelectedUsers(newSelectedUsers);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    setIsCreating(true);
    try {
      const memberIds = selectedUsers.map(user => user.id);

      const result = await createGroup(groupName, auth.currentUser.uid);
      
      if (result.success) {
        Alert.alert(
          "Success", 
          `Group "${groupName}" created successfully! Share this code with friends to join: ${result.groupCode}`,
          [
            { text: "OK", onPress: () => navigation.goBack() }
          ]
        );
      } else {
        Alert.alert("Error", result.error);
      }
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert("Error", "Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Group Name</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter group name"
          />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Members</Text>
            <TouchableOpacity
              onPress={() => setUserSelectModalVisible(true)}
              style={styles.addUserButton}
            >
              <Ionicons name="person-add" size={20} color="#2B478B" />
              <Text style={styles.addUserText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.participantsContainer}>
            <View style={styles.participantItem}>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{auth.currentUser.displayName} (You)</Text>
                <Text style={styles.participantEmail}>{auth.currentUser.email}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            </View>

            {selectedUsers.map(user => (
              <View key={user.id} style={styles.participantItem}>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{user.name}</Text>
                  <Text style={styles.participantEmail}>{user.email}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveUser(user.id)}>
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, isCreating && styles.disabledButton]}
          onPress={handleCreateGroup}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.createButtonText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* User Selection Modal */}
      <Modal
        visible={userSelectModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUserSelectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Members</Text>
              <TouchableOpacity onPress={() => setUserSelectModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2B478B" />
                <Text style={styles.loadingText}>Loading users...</Text>
              </View>
            ) : usersList.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No users found</Text>
              </View>
            ) : (
              <FlatList
                data={usersList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userListItem}
                    onPress={() => handleAddUser(item)}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userInitial}>{item.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color="#2B478B" />
                  </TouchableOpacity>
                )}
              />
            )}
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
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addUserText: {
    marginLeft: 5,
    color: '#2B478B',
    fontWeight: 'bold',
  },
  participantsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 3,
  },
  participantEmail: {
    color: '#777',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#2B478B',
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F5F0E8',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2B478B',
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B478B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  userInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  userEmail: {
    color: '#777',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#777',
    marginTop: 10,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#777',
  },
});

export default CreateGroupScreen;