import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebaseConfig';

import LoginScreen from './screens/LoginScreen.js';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import AddBillScreen from './screens/AddBillScreen';
import AddBillFormScreen from './screens/AddBillFormScreen';
import DebtRecordScreen from './screens/DebtRecordScreen';
import MyQRScreen from './screens/MyQRScreen';
import ReminderScreen from './screens/ReminderScreen';
import NotificationScreen from './screens/NotificationScreen';
import CreateGroupScreen from './screens/CreateGroupScreen';
import JoinGroupScreen from './screens/JoinGroupScreen';
import SettingsScreen from './screens/SettingsScreen';
import GroupDetailsScreen from './screens/GroupDetailsScreen';
import BillDetailsScreen from './screens/BillDetailsScreen';
import RequestPaymentScreen from './screens/RequestPaymentScreen';
import ConfirmPaymentScreen from './screens/ConfirmPaymentScreen';
import EditBillScreen from './screens/EditBillScreen';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Debt') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Notification') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2B478B',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Debt" component={DebtRecordScreen} />
      <Tab.Screen name="Notification" component={NotificationScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{
            headerStyle: {
              backgroundColor: '#F5F0E8',
            },
            headerTintColor: '#000',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: '#F5F0E8',
            }
          }}
        >
          {!isLoggedIn ? (
            <>
              <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="Register" 
                component={RegisterScreen} 
                options={{ title: 'Create Account' }} 
              />
            </>
          ) : (
            <>
              <Stack.Screen 
                name="MainTabs" 
                component={MainTabs} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="AddBill" 
                component={AddBillScreen} 
                options={{ title: 'Select Group for Bill' }} 
              />
              <Stack.Screen 
                name="AddBillForm" 
                component={AddBillFormScreen} 
                options={{ title: 'Add New Bill' }} 
              />
              <Stack.Screen 
                name="MyQR" 
                component={MyQRScreen} 
                options={{ title: 'My QR Payment' }} 
              />
              <Stack.Screen 
                name="Reminder" 
                component={ReminderScreen} 
                options={{ title: 'Reminders' }} 
              />
              <Stack.Screen 
                name="CreateGroup" 
                component={CreateGroupScreen} 
                options={{ title: 'Create Group' }} 
              />
              <Stack.Screen 
                name="JoinGroup" 
                component={JoinGroupScreen} 
                options={{ title: 'Join Group' }} 
              />
              <Stack.Screen 
                name="GroupDetails" 
                component={GroupDetailsScreen} 
                options={{ title: 'Group Details' }} 
              />
              <Stack.Screen 
                name="BillDetails" 
                component={BillDetailsScreen} 
                options={{ title: 'Bill Details' }} 
              />
              <Stack.Screen 
                name="RequestPayment" 
                component={RequestPaymentScreen} 
                options={{ title: 'Request Payment' }} 
              />
              <Stack.Screen 
                name="ConfirmPayment" 
                component={ConfirmPaymentScreen} 
                options={{ title: 'Confirm Payment' }} 
              />
              <Stack.Screen 
                name="EditBill" 
                component={EditBillScreen} 
                options={{ title: 'Edit Bill' }} 
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}