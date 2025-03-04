import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { logoutUser } from '../services/auth';

const SettingsScreen = ({ navigation }) => {
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              const result = await logoutUser();
              if (!result.success) {
                Alert.alert("Error", result.error);
              }
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>
                {auth.currentUser?.displayName?.charAt(0) || "U"}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{auth.currentUser?.displayName || "User"}</Text>
              <Text style={styles.userEmail}>{auth.currentUser?.email || ""}</Text>
            </View>
          </View>
        </View>

        <View style={styles.settingsContainer}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('MyQR')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="qr-code" size={24} color="#2B478B" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>My QR Payment</Text>
              <Text style={styles.settingDescription}>Manage your payment details</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Reminder')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="notifications" size={24} color="#2B478B" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Reminders</Text>
              <Text style={styles.settingDescription}>Manage bill reminders</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('JoinGroup')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="people" size={24} color="#2B478B" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Join Group</Text>
              <Text style={styles.settingDescription}>Join an existing group with a code</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.lastItem]}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="people-circle" size={24} color="#2B478B" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Create Group</Text>
              <Text style={styles.settingDescription}>Create a new group for bill splitting</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutItem}
            onPress={handleLogout}
          >
            <View style={styles.logoutIcon}>
              <Ionicons name="log-out" size={24} color="#FF6B6B" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.logoutTitle}>Logout</Text>
              <Text style={styles.settingDescription}>Sign out of your account</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Split Bill v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2023 Split Bill App</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  header: {
    padding: 20,
    paddingTop: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2B478B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  userInitial: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 16,
    color: '#777',
  },
  logoutContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  logoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  logoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 40,
  },
  appVersion: {
    fontSize: 16,
    color: '#999',
    marginBottom: 5,
  },
  appCopyright: {
    fontSize: 14,
    color: '#999',
  },
});

export default SettingsScreen;