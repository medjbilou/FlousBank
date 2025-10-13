import React from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Alert, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { supabase } from '../../src/supabaseClient';
import { router } from 'expo-router';
import { useAccountContext, Transaction } from '../../src/contexts/AccountContext';
import { MaterialIcons } from '@expo/vector-icons';

// Remove local Account type if defined in context or shared types
// type Account = { ... };

export default function DashboardScreen() {
  // Get state and functions from context, including transaction state
  const {
      accounts,
      selectedAccount,
      setSelectedAccount,
      loading,
      error,
      recentTransactions,
      loadingTransactions
  } = useAccountContext();

  // Remove local state that's now in context
  // const [loading, setLoading] = useState(true);
  // const [accounts, setAccounts] = useState<Account[]>([]);
  // const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  // const [error, setError] = useState<string | null>(null);
  // const [session, setSession] = useState<Session | null>(null); // Session can still be useful locally if needed

  // Remove useEffect and fetchAccountData as they are handled by the provider
  // useEffect(() => { ... }, []);
  // async function fetchAccountData(userId: string) { ... }

  // Keep handleSignOut or move it to context if preferred
  async function handleSignOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('Error signing out:', signOutError);
      Alert.alert('Sign Out Error', signOutError.message);
    } else {
      // Context provider will clear state on SIGNED_OUT event
      // Router redirect might still be needed depending on root setup
      router.replace('/(auth)/login');
    }
  }

  // --- Render function for recent transaction items ---
  const renderTransactionItem = ({ item }: { item: Transaction }) => (
      <View style={styles.transactionItem}>
          <MaterialIcons
              name={item.amount < 0 ? 'arrow-upward' : 'arrow-downward'}
              size={24}
              color={item.amount < 0 ? '#d9534f' : '#5cb85c'}
              style={styles.transactionIcon}
          />
          <View style={styles.transactionDetails}>
              <Text style={styles.transactionDescription} numberOfLines={1}>{item.description || item.transaction_type}</Text>
              <Text style={styles.transactionDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={[styles.transactionAmount, item.amount < 0 ? styles.negativeAmount : styles.positiveAmount]}>
              {item.amount < 0 ? '-' : '+'}${Math.abs(item.amount).toFixed(2)}
          </Text>
      </View>
  );

  // Display loading indicator (using context loading state)
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Display error message (using context error state)
  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button title="Sign Out" onPress={handleSignOut} color="#f44336" />
      </View>
    );
  }

  // Display dashboard content (using context state)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account Dashboard</Text>

      {/* Account Selection */} 
      {accounts.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountSelectorScroll}>
          {accounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.accountSelectorButton,
                selectedAccount?.id === account.id && styles.selectedAccountButton,
              ]}
              onPress={() => setSelectedAccount(account)}
            >
              <Text style={[
                styles.accountSelectorText,
                selectedAccount?.id === account.id && styles.selectedAccountText,
              ]}>
                {account.account_type} (...{account.account_number.slice(-4)})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Display Selected Account Details */} 
      {selectedAccount ? (
        <View style={styles.accountInfo}>
          <Text style={styles.accountType}>{selectedAccount.account_type}</Text>
          <Text style={styles.accountNumber}>Account No: {selectedAccount.account_number}</Text>
          <Text style={styles.balance}>
            Balance: {selectedAccount.balance.toFixed(2)} {selectedAccount.currency}
          </Text>

           {/* --- Recent Transactions Section --- */}
           <View style={styles.recentTransactionsContainer}>
                <Text style={styles.recentTransactionsTitle}>Recent Activity</Text>
                {loadingTransactions ? (
                    <ActivityIndicator style={{ marginTop: 10 }} />
                ) : recentTransactions.length > 0 ? (
                    <FlatList
                        data={recentTransactions}
                        renderItem={renderTransactionItem}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false} // Disable scroll if list is short & inside ScrollView
                    />
                ) : (
                    <Text style={styles.noTransactionsText}>No recent transactions.</Text>
                )}
            </View>

        </View>
      ) : accounts.length > 0 ? (
          <View style={styles.accountInfo}>
            <Text>Select an account above.</Text>
         </View>
      ): (
        <Text>No accounts found.</Text>
      )}

      <View style={styles.signOutButtonContainer}>
        <Button title="Sign Out" onPress={handleSignOut} color="#f44336" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: 'center', // Adjust alignment for content
    alignItems: 'center',
    padding: 20,
    paddingTop: 40, // Add padding at the top
  },
  centered: { // Added style for loading/error states
    justifyContent: 'center',
  },
  title: {
    fontSize: 24, // Increase title size
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorText: { // Added style for error messages
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  accountInfo: { // Adjusted styles
    width: '100%',
    padding: 20, // More padding
    backgroundColor: '#ffffff', // White background
    borderRadius: 10,
    marginBottom: 20,
    // alignItems: 'center', // Align items left now
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  accountType: {
    fontSize: 20, // Larger
    fontWeight: '600', // Bolder
    marginBottom: 5,
  },
  accountNumber: {
      fontSize: 14,
      color: 'grey',
      // marginTop: 5,
      marginBottom: 10, // Space below number
  },
  balance: {
    fontSize: 26, // Larger balance
    fontWeight: 'bold',
    marginBottom: 20, // Space below balance
    // marginTop: 10,
  },
  // --- Recent Transactions Styles --- 
  recentTransactionsContainer: {
      marginTop: 20,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: '#eee',
      width: '100%',
  },
  recentTransactionsTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 10,
  },
  transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f5f5f5', // Lighter border
  },
  transactionIcon: {
      marginRight: 15,
  },
  transactionDetails: {
      flex: 1, // Take remaining space
      marginRight: 10,
  },
  transactionDescription: {
      fontSize: 15,
      fontWeight: '500',
      color: '#333'
  },
  transactionDate: {
      fontSize: 12,
      color: 'grey',
      marginTop: 2,
  },
  transactionAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      minWidth: 70, // Ensure minimum width
      textAlign: 'right',
  },
  positiveAmount: {
    color: '#5cb85c', // Bootstrap success green
  },
  negativeAmount: {
    color: '#d9534f', // Bootstrap danger red
  },
  noTransactionsText: {
      color: 'grey',
      marginTop: 10,
      textAlign: 'center',
  },
  signOutButtonContainer: { // Style to position sign out button
    marginTop: 'auto', // Pushes the button to the bottom
    width: '80%',
    paddingBottom: 20,
  },
  accountSelectorScroll: { // Styles for account selector
    maxHeight: 50, // Limit height
    marginBottom: 20,
    width: '100%',
  },
  accountSelectorButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  selectedAccountButton: {
    backgroundColor: '#007bff', // Highlight color for selected
  },
  accountSelectorText: {
    color: '#333',
    fontWeight: '500',
  },
  selectedAccountText: {
    color: '#fff', // Text color for selected
  },
}); 