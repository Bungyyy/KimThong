import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../services/firebaseConfig';
import { confirmPayment } from '../services/bills';
import { doc, getDoc } from 'firebase/firestore';
import { formatDate } from '../utils/dateFormatter';

const PaymentConfirmationScreen = ({ route, navigation }) => {
  const { debtId, billId, amount, fromUserId, toUserId } = route.params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [billDetails, setBillDetails] = useState(null);
  const [fromUser, setFromUser] = useState(null);
  const [toUser, setToUser] = useState(null);
  const [currentUserIsDebtor, setCurrentUserIsDebtor] = useState(false);
  const [currentUserIsCreditor, setCurrentUserIsCreditor] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const billDoc = await getDoc(doc(db, "bills", billId));
      if (billDoc.exists()) {
        setBillDetails(billDoc.data());
      }

      const fromUserDoc = await getDoc(doc(db, "users", fromUserId));
      if (fromUserDoc.exists()) {
        setFromUser(fromUserDoc.data());
      }

      const toUserDoc = await getDoc(doc(db, "users", toUserId));
      if (toUserDoc.exists()) {
        setToUser(toUserDoc.data());
      }

      const currentUserId = auth.currentUser.uid;
      setCurrentUserIsDebtor(currentUserId === fromUserId);
      setCurrentUserIsCreditor(currentUserId === toUserId);

    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load payment details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    try {
      setIsProcessing(true);
      
      const result = await confirmPayment(billId, fromUserId, toUserId, amount);
      
      if (result.success) {
        Alert.alert(
          "Payment Confirmed",
          "The payment has been confirmed successfully!",
          [
            { text: "OK", onPress: () => navigation.goBack() }
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="cash-outline" size={48} color="#2B478B" />
          </View>
          <Text style={styles.headerTitle}>Payment Confirmation</Text>
          <Text style={styles.headerSubtitle}>
            Confirm that this payment has been made
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Payment Amount</Text>
            <Text style={styles.amountValue}>{amount.toFixed(2)} THB</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>From:</Text>
            <Text style={styles.infoValue}>{fromUser?.displayName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>To:</Text>
            <Text style={styles.infoValue}>{toUser?.displayName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Restaurant:</Text>
            <Text style={styles.infoValue}>{billDetails?.restaurant}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bill Date:</Text>
            <Text style={styles.infoValue}>
              {billDetails?.createdAt ? formatDate(billDetails.createdAt) : 'Unknown'}
            </Text>
          </View>
        </View>

        <View style={styles.instructionContainer}>
          {currentUserIsDebtor ? (
            <Text style={styles.instructionText}>
              Please confirm that you have paid {toUser?.displayName} for this bill.
            </Text>
          ) : currentUserIsCreditor ? (
            <Text style={styles.instructionText}>
              Please confirm that {fromUser?.displayName} has paid you for this bill.
            </Text>
          ) : (
            <Text style={styles.instructionText}>
              You can confirm that {fromUser?.displayName} has paid {toUser?.displayName} for this bill.
            </Text>
          )}
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
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6EAF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
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
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    width: 100,
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  instructionContainer: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB74D',
  },
  instructionText: {
    fontSize: 15,
    color: '#5D4037',
    lineHeight: 22,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
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

export default PaymentConfirmationScreen;