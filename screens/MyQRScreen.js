import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { updateQRPayment } from '../services/auth';

const MyQRScreen = ({ navigation }) => {
  const [qrDetails, setQrDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedDetails, setEditedDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    referenceNumber: ''
  });

  const fetchQRDetails = async () => {
    setIsLoading(true);
    try {
      const userId = auth.currentUser.uid;
      const userDoc = await getDoc(doc(db, "users", userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setQrDetails(userData.qrPayment || null);
        
        // Pre-populate edit form if QR details exist
        if (userData.qrPayment) {
          setEditedDetails(userData.qrPayment);
        }
      }
    } catch (error) {
      console.error("Error fetching QR details:", error);
      Alert.alert("Error", "Failed to load QR details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQRDetails();
  }, []);

  const handleSaveQR = async () => {
    // Validate fields
    if (!editedDetails.accountName || !editedDetails.accountNumber || !editedDetails.bankName) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const result = await updateQRPayment(userId, editedDetails);
      
      if (result.success) {
        setQrDetails(editedDetails);
        setEditModalVisible(false);
        Alert.alert("Success", "QR payment details updated successfully");
      } else {
        Alert.alert("Error", result.error);
      }
    } catch (error) {
      console.error("Error updating QR details:", error);
      Alert.alert("Error", "Failed to update QR payment details");
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B478B" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>My QR Payment</Text>
            <Text style={styles.subtitle}>
              Share this QR code to receive payments
            </Text>
          </View>

          {qrDetails ? (
            <View style={styles.qrContainer}>
              <QRCodeDisplay qrData={qrDetails} size={250} logoSize={50} />
              
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{qrDetails.accountName}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account:</Text>
                  <Text style={styles.detailValue}>{qrDetails.accountNumber}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bank:</Text>
                  <Text style={styles.detailValue}>{qrDetails.bankName}</Text>
                </View>
                
                {qrDetails.referenceNumber && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reference:</Text>
                    <Text style={styles.detailValue}>{qrDetails.referenceNumber}</Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditModalVisible(true)}
              >
                <Ionicons name="pencil" size={18} color="#fff" />
                <Text style={styles.editButtonText}>Edit QR Details</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="qr-code-outline" size={80} color="#999" />
              <Text style={styles.emptyStateText}>No QR Payment Details</Text>
              <Text style={styles.emptyStateSubText}>
                Add your payment details to generate a QR code
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setEditModalVisible(true)}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.addButtonText}>Add Payment QR</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Edit QR Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {qrDetails ? 'Edit Payment QR' : 'Add Payment QR'}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Account Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                value={editedDetails.accountName}
                onChangeText={(text) => setEditedDetails({...editedDetails, accountName: text})}
                />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Account Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="Bank account number"
                value={editedDetails.accountNumber}
                onChangeText={(text) => setEditedDetails({...editedDetails, accountNumber: text})}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bank Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Your bank name"
                value={editedDetails.bankName}
                onChangeText={(text) => setEditedDetails({...editedDetails, bankName: text})}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Reference Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Reference ID for payments"
                value={editedDetails.referenceNumber}
                onChangeText={(text) => setEditedDetails({...editedDetails, referenceNumber: text})}
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveQR}
              >
                <Text style={styles.saveButtonText}>Save</Text>
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
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
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
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  detailsContainer: {
    width: '100%',
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F6F6F6',
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    fontWeight: 'bold',
    width: 100,
    color: '#555',
  },
  detailValue: {
    flex: 1,
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B478B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 20,
  },
  emptyStateSubText: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 30,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B478B',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2B478B',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#000',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2B478B',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default MyQRScreen;