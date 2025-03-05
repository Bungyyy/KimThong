import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../services/firebaseConfig';
import { updateBill } from '../services/bills';
import { doc, getDoc } from 'firebase/firestore';
import { formatDate } from '../utils/dateFormatter';

const EditBillScreen = ({ route, navigation }) => {
  const { billId, bill: initialBill } = route.params;
  const [restaurant, setRestaurant] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [customAmounts, setCustomAmounts] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentMenuItem, setCurrentMenuItem] = useState({
    name: '',
    price: '',
    consumers: []
  });
  const [menuItemModalVisible, setMenuItemModalVisible] = useState(false);
  const [itemIndex, setItemIndex] = useState(null);
  
  useEffect(() => {
    if (initialBill) {
      initializeFormWithBill(initialBill);
    } else {
      fetchBillDetails();
    }
  }, []);
  
  const initializeFormWithBill = (billData) => {
    setRestaurant(billData.restaurant || '');
    setTotalAmount(billData.totalAmount?.toString() || '');
    setDueDate(billData.dueDate?.toDate() || new Date());
    setParticipants(billData.participants?.map(id => ({
      id,
      name: '',
      email: ''
    })) || []);
    setCustomAmounts(billData.splitAmounts || {});
    setMenuItems(billData.menuItems || []);
    fetchParticipantDetails(billData.participants || []);
  };
  
  const fetchBillDetails = async () => {
    setIsLoading(true);
    try {
      const billDoc = await getDoc(doc(db, "bills", billId));
      if (!billDoc.exists()) {
        Alert.alert("Error", "Bill not found");
        navigation.goBack();
        return;
      }
      
      const billData = billDoc.data();
      initializeFormWithBill(billData);
      
    } catch (error) {
      console.error("Error fetching bill details:", error);
      Alert.alert("Error", "Failed to load bill details");
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchParticipantDetails = async (participantIds) => {
    try {
      const participantDetails = [];
      
      for (const id of participantIds) {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          participantDetails.push({
            id,
            name: userData.displayName || 'Unknown',
            email: userData.email || '',
          });
        } else {
          participantDetails.push({
            id,
            name: 'Unknown User',
            email: '',
          });
        }
      }
      
      setParticipants(participantDetails);
    } catch (error) {
      console.error("Error fetching participant details:", error);
      Alert.alert("Error", "Failed to load participant details");
    }
  };
  
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  useEffect(() => {
    if (menuItems.length > 0) {
      const total = menuItems.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
      setTotalAmount(total.toString());

      if (participants.length > 0) {
        calculateMenuBasedSplits();
      }
    }
  }, [menuItems]);

  const calculateMenuBasedSplits = () => {
    const newSplits = {};
    participants.forEach(user => {
      newSplits[user.id] = 0;
    });
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

    Object.keys(newSplits).forEach(userId => {
      newSplits[userId] = Math.round(newSplits[userId] * 100) / 100;
    });
    
    setCustomAmounts(newSplits);
  };

  const handleAddMenuItem = () => {
    if (!currentMenuItem.name || !currentMenuItem.price) {
      Alert.alert("Error", "Please enter both item name and price");
      return;
    }
    
    if (currentMenuItem.consumers.length === 0) {
      Alert.alert("Error", "Please select at least one person who consumed this item");
      return;
    }
    
    if (itemIndex !== null) {
      const updatedItems = [...menuItems];
      updatedItems[itemIndex] = currentMenuItem;
      setMenuItems(updatedItems);
    } else {
      setMenuItems([...menuItems, currentMenuItem]);
    }

    setCurrentMenuItem({ name: '', price: '', consumers: [] });
    setItemIndex(null);
    setMenuItemModalVisible(false);
  };
  
  const handleEditMenuItem = (index) => {
    setCurrentMenuItem({...menuItems[index]});
    setItemIndex(index);
    setMenuItemModalVisible(true);
  };
  
  const handleRemoveMenuItem = (index) => {
    const updatedItems = [...menuItems];
    updatedItems.splice(index, 1);
    setMenuItems(updatedItems);
  };
  
  const toggleConsumer = (userId) => {
    let updatedConsumers;
    
    if (currentMenuItem.consumers.includes(userId)) {
      updatedConsumers = currentMenuItem.consumers.filter(id => id !== userId);
    } else {
      updatedConsumers = [...currentMenuItem.consumers, userId];
    }
    
    setCurrentMenuItem({...currentMenuItem, consumers: updatedConsumers});
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
    
    return true;
  };
  
  const handleSaveChanges = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    
    try {
      const updatedBillData = {
        restaurant,
        totalAmount: parseFloat(totalAmount),
        dueDate,
        splitAmounts: customAmounts,
        menuItems,
      };
      
      const result = await updateBill(billId, updatedBillData);
      
      if (result.success) {
        Alert.alert(
          "Success",
          "Bill updated successfully",
          [
            { text: "OK", onPress: () => navigation.navigate('BillDetails', { billId }) }
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to update bill");
      }
    } catch (error) {
      console.error("Error updating bill:", error);
      Alert.alert("Error", "Failed to save changes");
    } finally {
      setIsSaving(false);
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
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B478B" />
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.formContainer}>
          {/* Restaurant Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Restaurant Name</Text>
            <TextInput
              style={styles.input}
              value={restaurant}
              onChangeText={setRestaurant}
              placeholder="Enter restaurant name"
            />
          </View>

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

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Total Amount (THB)</Text>
            <TextInput
              style={[styles.input, menuItems.length > 0 && styles.disabledInput]}
              value={totalAmount}
              onChangeText={setTotalAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={menuItems.length === 0}
            />
            {menuItems.length > 0 && (
              <Text style={styles.inputHelper}>
                Total calculated from menu items
              </Text>
            )}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Due Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
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

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleSaveChanges}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={menuItemModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMenuItemModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {itemIndex !== null ? 'Edit Menu Item' : 'Add Menu Item'}
              </Text>
              <TouchableOpacity onPress={() => setMenuItemModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.menuItemForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Item Name</Text>
                <TextInput
                  style={styles.input}
                  value={currentMenuItem.name}
                  onChangeText={(text) => setCurrentMenuItem({...currentMenuItem, name: text})}
                  placeholder="e.g., Pad Thai"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Price (THB)</Text>
                <TextInput
                  style={styles.input}
                  value={currentMenuItem.price.toString()}
                  onChangeText={(text) => setCurrentMenuItem({...currentMenuItem, price: text})}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
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
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
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
});

export default EditBillScreen;