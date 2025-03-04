import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

const NotificationScreen = ({ navigation }) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date());
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [weeklyReminder, setWeeklyReminder] = useState(false);

  useEffect(() => {
    // Load saved notification settings
    const loadSettings = async () => {
      try {
        const timeStr = await AsyncStorage.getItem('notificationTime');
        const dateStr = await AsyncStorage.getItem('reminderDate');
        const daily = await AsyncStorage.getItem('dailyReminder');
        const weekly = await AsyncStorage.getItem('weeklyReminder');
        
        if (timeStr) setNotificationTime(new Date(timeStr));
        if (dateStr) setReminderDate(new Date(dateStr));
        if (daily) setDailyReminder(daily === 'true');
        if (weekly) setWeeklyReminder(weekly === 'true');
      } catch (error) {
        console.error("Error loading notification settings:", error);
      }
    };
    
    loadSettings();
  }, []);

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('notificationTime', notificationTime.toISOString());
      await AsyncStorage.setItem('reminderDate', reminderDate.toISOString());
      await AsyncStorage.setItem('dailyReminder', dailyReminder.toString());
      await AsyncStorage.setItem('weeklyReminder', weeklyReminder.toString());
      
      Alert.alert("Success", "Notification settings saved successfully");
    } catch (error) {
      console.error("Error saving notification settings:", error);
      Alert.alert("Error", "Failed to save notification settings");
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setNotificationTime(selectedTime);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setReminderDate(selectedDate);
    }
  };

  const formatTime = (time) => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const formatDate = (date) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Notification Settings</Text>
          <Text style={styles.subtitle}>
            Configure how and when you receive reminders about your bills
          </Text>
        </View>

        <View style={styles.settingsContainer}>
          {/* Notification Time */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowTimePicker(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Notification Time</Text>
              <Text style={styles.settingValue}>{formatTime(notificationTime)}</Text>
            </View>
            <Ionicons name="time" size={24} color="#2B478B" />
          </TouchableOpacity>
          
          {/* Reminder Date */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Reminder Date</Text>
              <Text style={styles.settingValue}>{formatDate(reminderDate)}</Text>
            </View>
            <Ionicons name="calendar" size={24} color="#2B478B" />
          </TouchableOpacity>
          
          {/* Daily Reminder */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Daily Reminder</Text>
              <Text style={styles.settingDescription}>
                Get daily reminders for overdue bills
              </Text>
            </View>
            <Switch
              value={dailyReminder}
              onValueChange={setDailyReminder}
              trackColor={{ false: "#ccc", true: "#2B478B" }}
              thumbColor="#fff"
            />
          </View>
          
          {/* Weekly Reminder */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Weekly Reminder</Text>
              <Text style={styles.settingDescription}>
                Get weekly summary of upcoming and overdue bills
              </Text>
            </View>
            <Switch
              value={weeklyReminder}
              onValueChange={setWeeklyReminder}
              trackColor={{ false: "#ccc", true: "#2B478B" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
        >
          <Text style={styles.saveButtonText}>Save Reminder</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate('Reminder')}
        >
          <Ionicons name="list" size={20} color="#2B478B" />
          <Text style={styles.viewButtonText}>View All Reminders</Text>
        </TouchableOpacity>
      </View>

      {/* Time Picker Modal for iOS */}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showTimePicker}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={notificationTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker Modal for iOS */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={reminderDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Pickers */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={notificationTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={reminderDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2B478B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#777',
  },
  settingValue: {
    fontSize: 14,
    color: '#777',
  },
  saveButton: {
    backgroundColor: '#2B478B',
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  viewButtonText: {
    color: '#2B478B',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    color: '#999',
    fontSize: 16,
  },
  doneButton: {
    color: '#2B478B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  picker: {
    height: 200,
  },
});

export default NotificationScreen;