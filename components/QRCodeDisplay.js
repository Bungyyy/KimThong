import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const QRCodeDisplay = ({ qrData, size = 200, logoSize = 30 }) => {
  // If no QR data is provided, return null
  if (!qrData || !qrData.accountNumber) {
    return null;
  }

  // Create a JSON string for the QR code data
  const qrString = JSON.stringify({
    name: qrData.accountName,
    account: qrData.accountNumber,
    bank: qrData.bankName,
    ref: qrData.referenceNumber
  });

  return (
    <View style={styles.container}>
      <QRCode
        value={qrString}
        size={size}
        color="#000"
        backgroundColor="#fff"
        logo={require('../assets/icon.png')}
        logoSize={logoSize}
        logoBackgroundColor="#fff"
      />
      <View style={styles.infoContainer}>
        <Text style={styles.accountName}>{qrData.accountName}</Text>
        <Text style={styles.accountNumber}>{`Account: ${qrData.accountNumber}`}</Text>
        <Text style={styles.bankName}>{qrData.bankName}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  infoContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  accountName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  accountNumber: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  bankName: {
    fontSize: 14,
    color: '#777',
  },
});

export default QRCodeDisplay;