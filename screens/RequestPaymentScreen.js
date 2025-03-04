import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../services/firebaseConfig';
import { requestPayment } from '../services/bills';
import { doc, getDoc } from 'firebase/firestore';
import QRCodeDisplay from '../components/QRCodeDisplay';

const RequestPaymentScreen = ({ route, navigation }) => {
  const { billId, payerId, ownerId, amount } = route.params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bill, setBill] = useState(null);
  const [owner, setOwner] = useState(null);
  const [payer, setPayer] = useState(null);
  
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
  
  const handleRequestPayment = async () => {
    try {
      setIsProcessing(true);
      
      const result = await requestPayment(billId, payerId, ownerId, amount);
      
      if (result.success) {
        Alert.alert(
          "Payment Requested",
          "Payment request has been sent successfully!",
          [
            { text: "OK", onPress: () => navigation.navigate('BillDetails', { billId }) }
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to request payment");
      }
    } catch (error) {
      console.error("Error requesting payment:", error);
      Alert.alert("Error", "Failed to request payment");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSharePaymentDetails = async () => {
    if (!owner || !owner.qrPayment) {
      Alert.alert("Error", "Payment details not available");
      return;
    }
    
    try {
      const message = `Payment Request from ${owner.displayName}\n\n` +
                     `Amount: ${amount.toFixed(2)} THB\n` +
                     `Bank: ${owner.qrPayment.bankName}\n` +
                     `Account: ${owner.qrPayment.accountNumber}\n` +
                     `Name: ${owner.qrPayment.accountName}\n\n` +
                     `Please make the payment and confirm it in the app.`;
      
      await Share.share({
        message: message,
        title: "Payment Request",
      });
    } catch (error) {
      console.error("Error sharing payment details:", error);
      Alert.alert("Error", "Failed to share payment details");
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
            <Ionicons name="card-outline" size={48} color="#2B478B" />
          </View>
          <Text style={styles.headerTitle}>Request Payment</Text>
          <Text style={styles.headerSubtitle}>
            Send payment request to {payer?.displayName}
          </Text>
        </View>
        
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount Due</Text>
          <Text style={styles.amountValue}>{amount.toFixed(2)} THB</Text>
          <Text style={styles.billName}>
            {bill?.restaurant || 'Restaurant'} bill
          </Text>
        </View>
        
        {hasQrPayment ? (
          <View style={styles.qrContainer}>
            <Text style={styles.sectionTitle}>Your Payment QR</Text>
            <View style={styles.qrWrapper}>
              <QRCodeDisplay 
                qrData={{
                  accountName: owner.qrPayment.accountName,
                  accountNumber: owner.qrPayment.accountNumber,
                  bankName: owner.qrPayment.bankName,
                  referenceNumber: owner.qrPayment.referenceNumber || ''
                }}
                size={200}
                logoSize={40}
              />
            </View>
            
            <View style={styles.bankDetails}>
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
            
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleSharePaymentDetails}
            >
              <Ionicons name="share-outline" size={20} color="#2B478B" />
              <Text style={styles.shareButtonText}>Share Payment Details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noQrContainer}>
            <Ionicons name="warning-outline" size={48} color="#FF9800" />
            <Text style={styles.noQrTitle}>No Payment Details</Text>
            <Text style={styles.noQrText}>
              You haven't set up your payment details yet. Set them up in your profile to enable QR payments.
            </Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => navigation.navigate('MyQR')}
            >
              <Text style={styles.setupButtonText}>Set Up Payment Details</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionTitle}>Next Steps:</Text>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.instructionText}>
              Send payment request to {payer?.displayName}
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="time" size={24} color="#FF9800" />
            <Text style={styles.instructionText}>
              {payer?.displayName} will make the payment to your account
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-done-circle" size={24} color="#2B478B" />
            <Text style={styles.instructionText}>
              {payer?.displayName} will confirm the payment in the app
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.requestButton, isProcessing && styles.disabledButton]}
          onPress={handleRequestPayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.requestButtonText}>Send Payment Request</Text>
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
    backgroundColor: '#E6EAF2',
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
    color: '#2B478B',
    marginBottom: 8,
  },
  billName: {
    fontSize: 16,
    color: '#666',
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bankDetails: {
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
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
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6EAF2',
    borderRadius: 8,
    padding: 12,
  },
  shareButtonText: {
    color: '#2B478B',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  noQrContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  noQrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 12,
    marginBottom: 8,
  },
  noQrText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  setupButton: {
    backgroundColor: '#2B478B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  setupButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  instructionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  requestButton: {
    backgroundColor: '#2B478B',
    borderRadius: 8,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#A0AEC0',
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

export default RequestPaymentScreen;