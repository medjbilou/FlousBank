import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAccountContext, Account } from '@/src/contexts/AccountContext'; // Import useAccountContext

const TransferConfirmationScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { transferFunds, accounts } = useAccountContext(); // Use the correctly named hook
  const [isLoading, setIsLoading] = useState(false);

  // Extract params - Add type safety/validation as needed
  const sourceAccountId = params.sourceAccountId as string;
  const recipientEmail = params.recipientEmail as string;
  const amount = params.amount as string;
  const description = params.description as string;

  const sourceAccount = accounts.find((acc: Account) => acc.id === sourceAccountId); // Add Account type
  const amountNumber = parseFloat(amount);

  const handleConfirmTransfer = async () => {
    if (!sourceAccountId || !recipientEmail || isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert('Error', 'Invalid transfer details provided.');
      return;
    }

    setIsLoading(true);
    try {
      // Call the transfer function from the context
      await transferFunds(sourceAccountId, recipientEmail, amountNumber, description);

      Alert.alert('Success', 'Transfer completed successfully!', [
        { text: 'OK', onPress: () => router.push('/(tabs)/') } // Navigate to dashboard on success
      ]);

    } catch (error: any) {
      console.error('Transfer Error:', error);
      Alert.alert('Transfer Failed', error?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Confirm Transfer' }} />
      <Text style={styles.title}>Review Your Transfer</Text>

      <View style={styles.detailsContainer}>
        <Text style={styles.detailItem}>From Account: {sourceAccount?.account_number || 'N/A'} ({sourceAccount?.account_type || 'N/A'})</Text>
        <Text style={styles.detailItem}>To Email: {recipientEmail}</Text>
        <Text style={styles.detailItemAmount}>Amount: ${amountNumber.toFixed(2)}</Text>
        {description && <Text style={styles.detailItem}>Description: {description}</Text>}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1C3A77" style={styles.loader} />
      ) : (
        <Button
          title="Confirm Transfer"
          onPress={handleConfirmTransfer}
          disabled={isLoading}
          color="#1C3A77"
        />
      )}

      <View style={{ marginTop: 15 }}>
        <Button
          title="Cancel"
          onPress={() => router.back()} // Go back to the previous screen
          disabled={isLoading}
          color="#888"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1C3A77',
  },
  detailsContainer: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  detailItem: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  detailItemAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1C3A77',
  },
  loader: {
    marginTop: 20,
  },
});

export default TransferConfirmationScreen; 
