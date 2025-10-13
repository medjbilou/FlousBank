import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Transaction } from '../src/contexts/AccountContext'; // Assuming Transaction type is exported

export default function TransactionDetailsScreen() {
  // Get the transaction data passed as parameters
  // We expect the full transaction object serialized as a string
  const params = useLocalSearchParams<{ transaction?: string }>();
  let transaction: Transaction | null = null;

  try {
      if (params.transaction) {
          transaction = JSON.parse(params.transaction);
      }
  } catch (e) {
      console.error("Error parsing transaction details:", e);
      // Handle error, maybe show an error message
  }

  if (!transaction) {
    return (
      <View style={styles.containerCentered}>
        <Stack.Screen options={{ title: 'Details', headerBackTitle: 'History' }} />
        <Text style={styles.errorText}>Could not load transaction details.</Text>
      </View>
    );
  }

  // Helper to format date/time
  const formatDateTime = (dateString: string) => {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Configure the header for this screen */}
      <Stack.Screen options={{ title: 'Transaction Details', headerBackTitle: 'History' }} />

      <Text style={styles.title}>Transaction Details</Text>

      <View style={styles.detailRow}>
        <Text style={styles.label}>Amount:</Text>
        <Text style={[styles.value, transaction.amount < 0 ? styles.negativeAmount : styles.positiveAmount]}>
            {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.label}>Date & Time:</Text>
        <Text style={styles.value}>{formatDateTime(transaction.created_at)}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.label}>Type:</Text>
        <Text style={styles.value}>{transaction.transaction_type}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.label}>Description:</Text>
        <Text style={styles.value}>{transaction.description || 'N/A'}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{transaction.status || 'N/A'}</Text>
      </View>

      {/* Optionally show recipient if available */}
      {transaction.recipient_account_id && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Recipient Acc ID:</Text>
            <Text style={styles.value}>{transaction.recipient_account_id}</Text>
          </View>
      )}

      <View style={styles.detailRow}>
        <Text style={styles.label}>Transaction ID:</Text>
        <Text style={[styles.value, styles.idText]}>{transaction.id}</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  containerCentered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#343a40',
    textAlign: 'right',
    flexShrink: 1, // Allow text to wrap if needed
  },
  positiveAmount: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  negativeAmount: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  idText: {
      fontSize: 12, // Smaller font for ID
      color: '#6c757d',
  },
  errorText: {
      color: 'red',
      fontSize: 16,
  }
}); 