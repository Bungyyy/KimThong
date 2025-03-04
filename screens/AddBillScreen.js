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
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { getUserGroups } from '../services/groups';

const AddBillScreen = ({ navigation }) => {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noGroupsFound, setNoGroupsFound] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const result = await getUserGroups(auth.currentUser.uid);
      
      if (result.success) {
        setGroups(result.groups);
        setNoGroupsFound(result.groups.length === 0);
      } else {
        Alert.alert("Error", "Failed to load groups");
        setNoGroupsFound(true);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      Alert.alert("Error", "Failed to load groups");
      setNoGroupsFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGroup = (group) => {
    navigation.navigate('AddBillForm', { group });
  };

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() => handleSelectGroup(item)}
    >
      <View style={styles.groupIcon}>
        <Text style={styles.groupInitial}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupMembers}>
          {item.members.length} members
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#2B478B" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B478B" />
      </View>
    );
  }

  if (noGroupsFound) {
    return (
      <ScrollView contentContainerStyle={styles.noGroupsContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="people-circle" size={100} color="#2B478B" />
        </View>
        <Text style={styles.noGroupsTitle}>No Groups Found</Text>
        <Text style={styles.noGroupsText}>
          You need to create or join a group before adding a bill. Groups help you organize and split bills with specific people.
        </Text>
        
        <View style={styles.groupButtonsContainer}>
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <Ionicons name="people" size={24} color="#fff" />
            <Text style={styles.createGroupText}>Create Group</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.joinGroupButton}
            onPress={() => navigation.navigate('JoinGroup')}
          >
            <Ionicons name="enter" size={24} color="#2B478B" />
            <Text style={styles.joinGroupText}>Join Group</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Select a Group</Text>
        <Text style={styles.headerSubtitle}>
          Choose which group this bill belongs to
        </Text>
      </View>
      
      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.groupList}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      
      <TouchableOpacity
        style={styles.createNewButton}
        onPress={() => navigation.navigate('CreateGroup')}
      >
        <Ionicons name="add-circle" size={20} color="#2B478B" />
        <Text style={styles.createNewText}>Create New Group</Text>
      </TouchableOpacity>
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
    backgroundColor: '#F5F0E8',
  },
  headerContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2B478B',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  groupList: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  groupIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2B478B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  groupInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 20,
    backgroundColor: '#E6EAF2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2B478B',
    borderStyle: 'dashed',
  },
  createNewText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B478B',
    marginLeft: 10,
  },
  noGroupsContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F5F0E8',
  },
  iconContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noGroupsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2B478B',
    marginBottom: 15,
    textAlign: 'center',
  },
  noGroupsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  groupButtonsContainer: {
    width: '100%',
    marginTop: 10,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B478B',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  createGroupText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  joinGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6EAF2',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2B478B',
  },
  joinGroupText: {
    color: '#2B478B',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default AddBillScreen;