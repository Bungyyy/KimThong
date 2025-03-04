import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { joinGroupWithCode } from '../services/groups';

const JoinGroupScreen = ({ navigation }) => {
  const [groupCode, setGroupCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      Alert.alert("Error", "Please enter a group code");
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinGroupWithCode(groupCode.trim().toUpperCase(), auth.currentUser.uid);
      
      if (result.success) {
        Alert.alert(
          "Success", 
          "You've successfully joined the group!",
          [
            { text: "OK", onPress: () => navigation.goBack() }
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to join group. Please check the code and try again.");
      }
    } catch (error) {
      console.error("Error joining group:", error);
      Alert.alert("Error", "Failed to join group");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="people" size={80} color="#2B478B" />
        </View>
        
        <Text style={styles.title}>Join a Group</Text>
        <Text style={styles.description}>
          Enter the 6-character group code to join an existing group and start splitting bills with friends
        </Text>
        
        <View style={styles.codeInputContainer}>
          <TextInput
            style={styles.codeInput}
            value={groupCode}
            onChangeText={(text) => setGroupCode(text.toUpperCase())}
            placeholder="Enter group code"
            placeholderTextColor="#999"
            autoCapitalize="characters"
            maxLength={6}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.joinButton, isJoining && styles.disabledButton]}
          onPress={handleJoinGroup}
          disabled={isJoining}
        >
          {isJoining ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.joinButtonText}>Join Group</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Text style={styles.createButtonText}>Create a New Group</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2B478B',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  codeInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
  },
  joinButton: {
    backgroundColor: '#2B478B',
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    padding: 10,
  },
  createButtonText: {
    color: '#2B478B',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default JoinGroupScreen;