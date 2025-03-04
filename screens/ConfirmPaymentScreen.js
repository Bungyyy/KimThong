import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../services/firebaseConfig';
import { confirmPayment } from '../services/bills';
import { doc, getDoc } from 'firebase/firestore';

const ConfirmPaymentScreen = ({ route, navigation }) => {
  const { billId, payerId, ownerId, amount } = route.params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bill, setBill] = useState(null);
  const [owner, setOwner] = useState(null);
  const [payer, setPayer] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [paymentNote, setPaymentNote] = useState('');
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get bill details
      const billDoc = await getDoc(doc(db, "bills", billId));
      if (billDoc.exists()) {
        setBill(billDoc.data());
      } else {
        Alert.alert("Error", "Bill not found");
        navigation.goBack();
        return;
      }
      
      // Get owner details
      const ownerDoc = await getDoc(doc(db, "users", ownerId));
      if (ownerDoc.exists()) {
        setOwner(ownerDoc.data());
      } else {
        Alert.alert("Error", "Bill owner not found");
        navigation.goBack();
        return;
      }
      
      // Get payer details
      const payerDoc = await getDoc(doc(db, "users", payerId));
      if (payerDoc.exists()) {
        setPayer(payerDoc.data());
      } else {
        Alert.alert("Error", "Payer not found");
        navigation.goBack();
        return;
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load payment data");
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmPayment = async () => {
    try {
      setIsProcessing(true);
      
      const paymentDetails = {
        transactionId,
        method: paymentMethod,
        note: paymentNote,
        timestamp: new Date()
      };
      
      const result = await confirmPayment(billId, payerId, ownerId, amount, paymentDetails);
      
      if (result.success) {
        Alert.alert(
          "Payment Confirmed",
          "Your payment has been confirmed successfully!",
          [
            { text: "OK", onPress: () => navigation.navigate('BillDetails', { billId }) }
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to confirm payment");
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      Alert.alert("Error", "Failed to confirm payment");
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B478B" />
      </View>
    );
  }
  
  // Check if owner has QR payment details
  const hasQrPayment = owner && owner.qrPayment && 
                      owner.qrPayment.accountNumber && 
                      owner.qrPayment.bankName;
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          </View>
          <Text style={styles.headerTitle}>Confirm Payment</Text>
          <Text style={styles.headerSubtitle}>
            Please confirm your payment to {owner?.displayName}
          </Text>
        </View>
        
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amountValue}>{amount.toFixed(2)} THB</Text>
          <Text style={styles.billName}>
            {bill?.restaurant || 'Restaurant'} bill
          </Text>
        </View>
        
        {hasQrPayment && (
          <View style={styles.paymentDetailsContainer}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Paid to:</Text>
                <Text style={styles.detailValue}>{owner.displayName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bank:</Text>
                <Text style={styles.detailValue}>{owner.qrPayment.bankName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account:</Text>
                <Text style={styles.detailValue}>{owner.qrPayment.accountNumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{owner.qrPayment.accountName}</Text>
              </View>
            </View>
          </View>
        )}
        
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          <View style={styles.paymentMethodsContainer}>
            <TouchableOpacity
              style={[
                styles.paymentMethodButton,
                paymentMethod === 'bank' && styles.selectedPaymentMethod
              ]}
              onPress={() => setPaymentMethod('bank')}
            >
              <Ionicons 
                name="card" 
                size={24} 
                color={paymentMethod === 'bank' ? '#2B478B' : '#666'} 
              />
              <Text 
                style={[
                  styles.paymentMethodText,
                  paymentMethod === 'bank' && styles.selectedPaymentMethodText
                ]}
              >
                Bank Transfer
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.paymentMethodButton,
                paymentMethod === 'cash' && styles.selectedPaymentMethod
              ]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Ionicons 
                name="cash" 
                size={24} 
                color={paymentMethod === 'cash' ? '#2B478B' : '#666'} 
              />
              <Text 
                style={[
                  styles.paymentMethodText,
                  paymentMethod === 'cash' && styles.selectedPaymentMethodText
                ]}
              >
                Cash
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.paymentMethodButton,
                paymentMethod === 'other' && styles.selectedPaymentMethod
              ]}
              onPress={() => setPaymentMethod('other')}
            >
              <Ionicons 
                name="ellipsis-horizontal-circle" 
                size={24} 
                color={paymentMethod === 'other' ? '#2B478B' : '#666'} 
              />
              <Text 
                style={[
                  styles.paymentMethodText,
                  paymentMethod === 'other' && styles.selectedPaymentMethodText
                ]}
              >
                Other
              </Text>
            </TouchableOpacity>
          </View>
          
          {paymentMethod === 'bank' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Transaction ID (optional)</Text>
              <TextInput
                style={styles.input}
                value={transactionId}
                onChangeText={setTransactionId}
                placeholder="Enter transaction ID or reference"
              />
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={paymentNote}
              onChangeText={setPaymentNote}
              placeholder="Add any additional information"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
        
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            By confirming, you're stating that you have made the payment of {amount.toFixed(2)} THB to {owner?.displayName}.
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.confirmButton, isProcessing && styles.disabledButton]}
          onPress={handleConfirmPayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm Payment</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2B478B',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  billName: {
    fontSize: 16,
    color: '#666',
  },
  paymentDetailsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    width: 80,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#666',
  },
  detailValue: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  formContainer: {
    marginBottom: 24,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentMethodButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
  },
  selectedPaymentMethod: {
    backgroundColor: '#E6EAF2',
    borderWidth: 1,
    borderColor: '#2B478B',
  },
  paymentMethodText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  selectedPaymentMethodText: {
    color: '#2B478B',
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  instructionContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB74D',
  },
  instructionText: {
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  cancelButton: {
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ConfirmPaymentScreen;