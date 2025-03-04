import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../services/firebaseConfig';
import { addBill } from '../services/bills';
import { collection, getDocs } from 'firebase/firestore';
import { formatDate, parseDate } from '../utils/dateFormatter';

const AddBillFormScreen = ({ navigation, route }) => {
  const { group } = route.params;
  
  const [restaurant, setRestaurant] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [customAmounts, setCustomAmounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Menu items state
  const [menuItems, setMenuItems] = useState([]);
  const [currentMenuItem, setCurrentMenuItem] = useState({
    name: '',
    price: '',
    consumers: []
  });
  const [menuItemModalVisible, setMenuItemModalVisible] = useState(false);
  const [itemIndex, setItemIndex] = useState(null);
  const [paidBy, setPaidBy] = useState(null);
  const [paidByModalVisible, setPaidByModalVisible] = useState(false);

  // Refs for input fields
  const itemNameRef = useRef(null);
  const itemPriceRef = useRef(null);
  const restaurantNameRef = useRef(null);
  const totalAmountRef = useRef(null);
  const paidAmountRef = useRef(null);

  // Initialize with group members
  useEffect(() => {
    fetchGroupMembers();
  }, []);

  // Update total amount when menu items change
  useEffect(() => {
    if (menuItems.length > 0) {
      const total = menuItems.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
      setTotalAmount(total.toString());
      
      // Recalculate custom splits based on menu items
      if (participants.length > 0) {
        calculateMenuBasedSplits();
      }
    }
  }, [menuItems]);

  const fetchGroupMembers = async () => {
    try {
      const memberIds = group.members;
      const usersSnapshot = await getDocs(collection(db, "users"));
      const groupMembers = [];
      
      usersSnapshot.forEach(doc => {
        if (memberIds.includes(doc.id)) {
          const userData = doc.data();
          groupMembers.push({
            id: doc.id,
            name: userData.displayName,
            email: userData.email,
          });
        }
      });
      
      setParticipants(groupMembers);
      
      // Set current user as the payer by default
      const currentUser = groupMembers.find(member => member.id === auth.currentUser.uid);
      if (currentUser) {
        setPaidBy(currentUser);
      }
    } catch (error) {
      console.error("Error fetching group members:", error);
      Alert.alert("Error", "Failed to load group members");
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  // Method to handle adding a menu item
  const handleAddMenuItem = () => {
    if (!currentMenuItem.name || !currentMenuItem.price) {
      Alert.alert("Error", "Please enter both item name and price");
      return;
    }
    
    if (currentMenuItem.consumers.length === 0) {
      Alert.alert("Error", "Please select at least one person who consumed this item");
      return;
    }
    
    // Dismiss keyboard
    Keyboard.dismiss();
    
    if (itemIndex !== null) {
      // Edit existing item
      const updatedItems = [...menuItems];
      updatedItems[itemIndex] = currentMenuItem;
      setMenuItems(updatedItems);
    } else {
      // Add new item
      setMenuItems([...menuItems, currentMenuItem]);
    }
    
    // Reset the current menu item and close modal
    setCurrentMenuItem({ name: '', price: '', consumers: [] });
    setItemIndex(null);
    setMenuItemModalVisible(false);
  };

  // Method to handle editing an existing menu item
  const handleEditMenuItem = (index) => {
    setCurrentMenuItem(menuItems[index]);
    setItemIndex(index);
    setMenuItemModalVisible(true);
  };

  // Method to remove a menu item
  const handleRemoveMenuItem = (index) => {
    const updatedItems = [...menuItems];
    updatedItems.splice(index, 1);
    setMenuItems(updatedItems);
  };

  // Method to toggle a user's consumption status for the current menu item
  const toggleConsumer = (userId) => {
    let updatedConsumers;
    
    if (currentMenuItem.consumers.includes(userId)) {
      updatedConsumers = currentMenuItem.consumers.filter(id => id !== userId);
    } else {
      updatedConsumers = [...currentMenuItem.consumers, userId];
    }
    
    setCurrentMenuItem({...currentMenuItem, consumers: updatedConsumers});
  };

  // Calculate per-person split based on menu items
  const calculateMenuBasedSplits = () => {
    const newSplits = {};
    
    // Initialize all participants with 0
    participants.forEach(user => {
      newSplits[user.id] = 0;
    });
    
    // Calculate each person's share based on menu items
    menuItems.forEach(item => {
      const itemPrice = parseFloat(item.price) || 0;
      const consumerCount = item.consumers.length;
      
      if (consumerCount > 0) {
        const pricePerPerson = itemPrice / consumerCount;
        
        item.consumers.forEach(userId => {
          newSplits[userId] = (newSplits[userId] || 0) + pricePerPerson;
        });
      }
    });
    
    // Round to 2 decimal places
    Object.keys(newSplits).forEach(userId => {
      newSplits[userId] = Math.round(newSplits[userId] * 100) / 100;
    });
    
    setCustomAmounts(newSplits);
  };

  const validateForm = () => {
    if (!restaurant.trim()) {
      Alert.alert("Error", "Please enter a restaurant name");
      return false;
    }
    
    if (!totalAmount || isNaN(totalAmount) || parseFloat(totalAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid total amount");
      return false;
    }
    
    if (!paidAmount || isNaN(paidAmount)) {
      Alert.alert("Error", "Please enter a valid paid amount");
      return false;
    }
    
    if (!paidBy) {
      Alert.alert("Error", "Please select who paid the bill");
      return false;
    }
    
    if (menuItems.length === 0) {
      Alert.alert("Error", "Please add at least one menu item");
      return false;
    }
    
    return true;
  };

  const handleSaveBill = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Use split amounts calculated from menu items
      const splitAmounts = customAmounts;
      
      const billData = {
        restaurant,
        totalAmount: parseFloat(totalAmount),
        paidAmount: parseFloat(paidAmount),
        dueDate,
        paidBy: paidBy.id,
        participants: participants.map(p => p.id),
        splitAmounts,
        menuItems,
        groupId: group.id,
        payments: {
          [paidBy.id]: {
            amount: parseFloat(paidAmount),
            paidAt: new Date()
          }
        }
      };
      
      const result = await addBill(billData);
      
      if (result.success) {
        Alert.alert("Success", "Bill added successfully");
        navigation.navigate('Home');
      } else {
        Alert.alert("Error", result.error);
      }
    } catch (error) {
      console.error("Error saving bill:", error);
      Alert.alert("Error", "Failed to save bill");
    } finally {
      setIsLoading(false);
    }
  };

  const renderMenuItem = ({ item, index }) => {
    const consumerNames = item.consumers.map(userId => {
      const user = participants.find(p => p.id === userId);
      return user ? user.name : 'Unknown';
    }).join(', ');
    
    return (
      <View style={styles.menuItemCard}>
        <View style={styles.menuItemHeader}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          <Text style={styles.menuItemPrice}>{parseFloat(item.price).toFixed(2)} THB</Text>
        </View>
        
        <Text style={styles.menuItemConsumers}>
          Consumers: {consumerNames}
        </Text>
        
        <View style={styles.menuItemActions}>
          <TouchableOpacity
            onPress={() => handleEditMenuItem(index)}
            style={styles.menuItemAction}
          >
            <Ionicons name="pencil" size={16} color="#2B478B" />
            <Text style={styles.menuItemActionText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleRemoveMenuItem(index)}
            style={styles.menuItemAction}
          >
            <Ionicons name="trash" size={16} color="#FF6B6B" />
            <Text style={[styles.menuItemActionText, { color: '#FF6B6B' }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Dismiss keyboard when tapping outside input areas
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.formContainer}>
            <View style={styles.groupInfoBanner}>
              <Ionicons name="people" size={20} color="#2B478B" />
              <Text style={styles.groupInfoText}>
                Adding bill to group: <Text style={styles.groupName}>{group.name}</Text>
              </Text>
            </View>
            
            {/* Restaurant Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Restaurant Name</Text>
              <TextInput
                ref={restaurantNameRef}
                style={styles.input}
                value={restaurant}
                onChangeText={setRestaurant}
                placeholder="Enter restaurant name"
                returnKeyType="done"
                onSubmitEditing={dismissKeyboard}
              />
            </View>
            
            {/* Menu Items Section */}
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Menu Items</Text>
                <TouchableOpacity
                  onPress={() => {
                    setCurrentMenuItem({ name: '', price: '', consumers: [] });
                    setItemIndex(null);
                    setMenuItemModalVisible(true);
                  }}
                  style={styles.addUserButton}
                >
                  <Ionicons name="add-circle" size={20} color="#2B478B" />
                  <Text style={styles.addUserText}>Add Item</Text>
                </TouchableOpacity>
              </View>
              
              {menuItems.length > 0 ? (
                <FlatList
                  data={menuItems}
                  renderItem={renderMenuItem}
                  keyExtractor={(item, index) => `menu-item-${index}`}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No menu items added yet</Text>
                  <Text style={styles.emptyStateSubText}>Add items to automatically calculate splits</Text>
                </View>
              )}
            </View>
            
            {/* Total Amount (calculated automatically from menu items) */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Total Amount (THB)</Text>
              <TextInput
                ref={totalAmountRef}
                style={[styles.input, menuItems.length > 0 && styles.disabledInput]}
                value={totalAmount}
                onChangeText={setTotalAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={menuItems.length === 0}
                returnKeyType="done"
                onSubmitEditing={dismissKeyboard}
              />
              {menuItems.length > 0 && (
                <Text style={styles.inputHelper}>
                  Total calculated from menu items
                </Text>
              )}
            </View>
            
            {/* Paid By Section */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Paid By</Text>
              <TouchableOpacity
                style={styles.paidBySelector}
                onPress={() => {
                  dismissKeyboard();
                  setPaidByModalVisible(true);
                }}
              >
                {paidBy ? (
                  <View style={styles.paidByInfo}>
                    <Text style={styles.paidByName}>{paidBy.name}</Text>
                    <Text style={styles.paidByEmail}>{paidBy.email}</Text>
                  </View>
                ) : (
                  <Text style={styles.paidByPlaceholder}>Select who paid</Text>
                )}
                <Ionicons name="chevron-down" size={20} color="#2B478B" />
              </TouchableOpacity>
            </View>
            
            {/* Paid Amount */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Paid Amount (THB)</Text>
              <TextInput
                ref={paidAmountRef}
                style={styles.input}
                value={paidAmount}
                onChangeText={setPaidAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={dismissKeyboard}
              />
            </View>
            
            {/* Due Date */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Due Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  dismissKeyboard();
                  setShowDatePicker(true);
                }}
              >
                <Text>{formatDate(dueDate)}</Text>
                <Ionicons name="calendar" size={24} color="#2B478B" />
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>
            
            {/* Bill Amounts Summary */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bill Split Summary</Text>
              <View style={styles.splitSummaryContainer}>
                {participants.map(user => (
                  <View key={user.id} style={styles.splitSummaryItem}>
                    <Text style={styles.splitSummaryName}>{user.name}</Text>
                    <Text style={styles.splitSummaryAmount}>
                      {customAmounts[user.id] ? customAmounts[user.id].toFixed(2) : '0.00'} THB
                    </Text>
                  </View>
                ))}
                
                <View style={styles.totalSplitRow}>
                  <Text style={styles.totalSplitLabel}>Total Split:</Text>
                  <Text style={styles.totalSplitAmount}>
                    THB {Object.values(customAmounts).reduce((sum, amount) => sum + amount, 0).toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.totalAmountRow}>
                  <Text style={styles.totalAmountLabel}>Bill Total:</Text>
                  <Text style={styles.totalAmountValue}>
                    THB {parseFloat(totalAmount || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.disabledButton]}
              onPress={handleSaveBill}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Saving...' : 'Save Bill'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        {/* Menu Item Modal */}
        <Modal
          visible={menuItemModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            dismissKeyboard();
            setMenuItemModalVisible(false);
          }}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {itemIndex !== null ? 'Edit Menu Item' : 'Add Menu Item'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      dismissKeyboard();
                      setMenuItemModalVisible(false);
                    }}
                  >
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.menuItemForm}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Item Name</Text>
                    <TextInput
                      ref={itemNameRef}
                      style={styles.input}
                      value={currentMenuItem.name}
                      onChangeText={(text) => setCurrentMenuItem({...currentMenuItem, name: text})}
                      placeholder="e.g., Pad Thai"
                      returnKeyType="next"
                      onSubmitEditing={() => itemPriceRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Price (THB)</Text>
                    <TextInput
                      ref={itemPriceRef}
                      style={styles.input}
                      value={currentMenuItem.price.toString()}
                      onChangeText={(text) => setCurrentMenuItem({...currentMenuItem, price: text})}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={dismissKeyboard}
                    />
                  </View>
                  
                  <Text style={styles.inputLabel}>Who consumed this item?</Text>
                  {participants.map(user => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.consumerItem}
                      onPress={() => toggleConsumer(user.id)}
                    >
                      <View style={styles.consumerInfo}>
                        <Text style={styles.consumerName}>{user.name}</Text>
                      </View>
                      <View style={styles.checkboxContainer}>
                        <View style={[
                          styles.checkbox,
                          currentMenuItem.consumers.includes(user.id) && styles.checkboxChecked
                        ]}>
                          {currentMenuItem.consumers.includes(user.id) && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={handleAddMenuItem}
                >
                  <Text style={styles.addItemButtonText}>
                    {itemIndex !== null ? 'Update Item' : 'Add Item'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
        
        {/* Paid By Modal */}
        <Modal
          visible={paidByModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setPaidByModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Who Paid?</Text>
                <TouchableOpacity onPress={() => setPaidByModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={participants}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.userListItem,
                      paidBy?.id === item.id && styles.selectedUserItem
                    ]}
                    onPress={() => {
                      setPaidBy(item);
                      setPaidByModalVisible(false);
                    }}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userInitial}>{item.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                    {paidBy?.id === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#2B478B" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

// Complete styles object with addItemButtonText and any other missing styles
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5F0E8',
    },
    scrollContainer: {
      flex: 1,
    },
    formContainer: {
      padding: 20,
    },
    groupInfoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E6EAF2',
      padding: 12,
      borderRadius: 8,
      marginBottom: 20,
    },
    groupInfoText: {
      marginLeft: 10,
      fontSize: 14,
      color: '#555',
    },
    groupName: {
      fontWeight: 'bold',
      color: '#2B478B',
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
    disabledInput: {
      backgroundColor: '#f5f5f5',
      color: '#666',
    },
    inputHelper: {
      fontSize: 12,
      color: '#666',
      marginTop: 5,
      fontStyle: 'italic',
    },
    dateInput: {
      backgroundColor: '#fff',
      borderRadius: 8,
      paddingHorizontal: 15,
      height: 50,
      borderWidth: 1,
      borderColor: '#ddd',
      fontSize: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: '#f8f8f8',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
    },
    emptyStateText: {
      fontSize: 16,
      color: '#777',
      marginBottom: 5,
    },
    emptyStateSubText: {
      fontSize: 14,
      color: '#999',
      textAlign: 'center',
    },
    splitSummaryContainer: {
      backgroundColor: '#fff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
      padding: 15,
    },
    splitSummaryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    splitSummaryName: {
      fontSize: 15,
      fontWeight: '500',
    },
    splitSummaryAmount: {
      fontSize: 15,
      fontWeight: '500',
      color: '#2B478B',
    },
    totalSplitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: '#eee',
      paddingTop: 15,
      marginTop: 10,
    },
    totalSplitLabel: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    totalSplitAmount: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    totalAmountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    totalAmountLabel: {
      fontSize: 14,
      color: '#777',
    },
    totalAmountValue: {
      fontSize: 14,
      color: '#777',
    },
    saveButton: {
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
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    menuItemCard: {
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#ddd',
    },
    menuItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    menuItemName: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    menuItemPrice: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#2B478B',
    },
    menuItemConsumers: {
      fontSize: 14,
      color: '#666',
      marginBottom: 10,
    },
    menuItemActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 5,
    },
    menuItemAction: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 15,
    },
    menuItemActionText: {
      fontSize: 14,
      color: '#2B478B',
      marginLeft: 5,
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
    menuItemForm: {
      marginBottom: 20,
    },
    consumerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: '#fff',
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#ddd',
    },
    consumerInfo: {
      flex: 1,
    },
    consumerName: {
      fontSize: 15,
      fontWeight: '500',
    },
    checkboxContainer: {
      marginLeft: 10,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#2B478B',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#2B478B',
    },
    addItemButton: {
      backgroundColor: '#2B478B',
      borderRadius: 8,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addItemButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    paidBySelector: {
      backgroundColor: '#fff',
      borderRadius: 8,
      paddingHorizontal: 15,
      height: 60,
      borderWidth: 1,
      borderColor: '#ddd',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    paidByInfo: {
      flex: 1,
    },
    paidByName: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 3,
    },
    paidByEmail: {
      fontSize: 14,
      color: '#777',
    },
    paidByPlaceholder: {
      fontSize: 16,
      color: '#999',
    },
    userListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 15,
      marginBottom: 10,
    },
    selectedUserItem: {
      backgroundColor: '#E6EAF2',
      borderWidth: 1,
      borderColor: '#2B478B',
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
  });

export default AddBillFormScreen;