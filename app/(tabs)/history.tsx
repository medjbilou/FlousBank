import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Button,
  Platform
} from 'react-native';
import { useAccountContext, Transaction } from '../../src/contexts/AccountContext';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Define filter types
type DateFilter = 'all' | '7d' | '30d';

export default function HistoryScreen() {
  const {
    selectedAccount,
    loading: contextLoading,
    error: contextError,
    allTransactions,
    loadingAllTransactions,
    errorAllTransactions,
    fetchAllTransactions
  } = useAccountContext();

  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter>('all');

  const filteredTransactions = allTransactions.filter(tx => {
    let dateMatch = true;

    if (activeDateFilter !== 'all') {
      const txDate = new Date(tx.created_at);
      const today = new Date();
      const daysToSubtract = activeDateFilter === '7d' ? 7 : 30;
      const filterDate = new Date(today.setDate(today.getDate() - daysToSubtract));
      dateMatch = txDate >= filterDate;
    }

    return dateMatch;
  });

  const handleRefresh = () => {
    if (selectedAccount) {
      console.log("Manually refreshing transactions...");
      fetchAllTransactions(selectedAccount.id);
    } else {
      Alert.alert("Cannot Refresh", "No account selected.");
    }
  };

  const navigateToDetails = (transaction: Transaction) => {
    router.push({
      pathname: '/transaction-details',
      params: { transaction: JSON.stringify(transaction) }
    });
  };

  const handleDownloadStatement = async () => {
    if (!selectedAccount) {
        Alert.alert("Error", "No account selected.");
        return;
    }
    if (filteredTransactions.length === 0) {
        Alert.alert("No Data", "There are no transactions in the selected period to download.");
        return;
    }

    let statementText = `--- Floussi Bank Statement ---\n\n`;
    statementText += `Account Holder: [User Name Placeholder]\n`;
    statementText += `Account Number: ${selectedAccount.account_number}\n`;
    statementText += `Account Type: ${selectedAccount.account_type}\n`;
    statementText += `Statement Period: ${activeDateFilter === 'all' ? 'All Time' : activeDateFilter === '30d' ? 'Last 30 Days' : 'Last 7 Days'}\n`;
    statementText += `Generated On: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    statementText += `Current Balance: ${selectedAccount.balance.toFixed(2)} ${selectedAccount.currency}\n`;
    statementText += `\n--- Transactions ---\n\n`;
    statementText += `Date       | Time     | Type/Desc                      | Amount   | Status\n`;
    statementText += `--------------------------------------------------------------------------\n`;

    filteredTransactions.forEach(tx => {
        const date = new Date(tx.created_at);
        const dateStr = date.toLocaleDateString().padEnd(10);
        const timeStr = date.toLocaleTimeString().padEnd(8);
        const desc = (tx.description || tx.transaction_type).substring(0, 30).padEnd(30);
        const amountStr = `${tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}`.padStart(8);
        const statusStr = (tx.status || 'N/A').padEnd(8);
        statementText += `${dateStr} | ${timeStr} | ${desc} | ${amountStr} | ${statusStr}\n`;
    });

    statementText += `\n--- End of Statement ---\n`;

    try {
      const fileName = `FloussiBank_Statement_${selectedAccount.account_number.slice(-4)}_${Date.now()}.txt`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, statementText, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      console.log("Statement saved to:", fileUri);

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Share Bank Statement',
          UTI: 'public.plain-text'
      });

    } catch (error: any) {
      console.error("Error generating or sharing statement:", error);
      Alert.alert("Download Error", `Could not generate or share the statement: ${error.message}`);
    }
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity onPress={() => navigateToDetails(item)} activeOpacity={0.7}>
      <View style={styles.transactionItem}>
        <View style={styles.leftColumn}>
          <Text style={styles.description} numberOfLines={1}>{item.description || item.transaction_type}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}</Text>
        </View>
        <Text style={[styles.amount, item.amount < 0 ? styles.negativeAmount : styles.positiveAmount]}>
          {item.amount < 0 ? '-' : '+'}${Math.abs(item.amount).toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (contextLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (contextError) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Error loading account details: {contextError}</Text>
      </View>
    );
  }

  if (!selectedAccount) {
    return (
      <View style={styles.centeredContainer}>
        <Text>No account selected. Please select an account on the dashboard.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>
      <Text style={styles.accountIdentifier}>
        Account: {selectedAccount.account_type} (...{selectedAccount.account_number.slice(-4)})
      </Text>

      <View style={styles.actionBar}>
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Period:</Text>
          {(['all', '30d', '7d'] as DateFilter[]).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeDateFilter === filter && styles.activeFilterButton,
              ]}
              onPress={() => setActiveDateFilter(filter)}
              disabled={loadingAllTransactions}
            >
              <Text style={[
                  styles.filterButtonText,
                   activeDateFilter === filter && styles.activeFilterText,
              ]}>
                {filter === 'all' ? 'All' : filter === '30d' ? '30d' : '7d'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.downloadButton}
          onPress={handleDownloadStatement}
          disabled={loadingAllTransactions || filteredTransactions.length === 0}
        >
          <Text style={styles.downloadButtonText}>Download</Text>
        </TouchableOpacity>
      </View>

      {loadingAllTransactions ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : errorAllTransactions ? (
        <View style={styles.centeredContainer}>
            <Text style={styles.errorText}>Error fetching transactions: {errorAllTransactions}</Text>
            <Button title="Retry" onPress={handleRefresh} />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.centeredContainer}>
                <Text style={{ textAlign: 'center', marginTop: 20 }}>
                    No transactions found
                    {activeDateFilter !== 'all' ? ' for this period' : ' for this account'}.
                 </Text>
            </View>
          }
          style={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 0,
    backgroundColor: '#f8f9fa',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  accountIdentifier: {
    fontSize: 14,
    color: 'grey',
    textAlign: 'center',
    marginBottom: 15,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    elevation: 0,
    shadowOpacity: 0,
    flex: 1,
    marginRight: 10,
  },
  filterLabel: {
      marginRight: 10,
      fontSize: 14,
      fontWeight: '500',
      color: '#6c757d',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: '#e9ecef',
    marginHorizontal: 4,
  },
  activeFilterButton: {
    backgroundColor: '#007bff',
  },
  filterButtonText: {
    color: '#495057',
    fontWeight: '500',
    fontSize: 13,
  },
  activeFilterText: {
      color: '#fff',
  },
  downloadButton: {
    backgroundColor: '#17a2b8',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    elevation: 2,
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { height: 1, width: 0 },
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  list: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
  },
  leftColumn: {
    flex: 1,
    marginRight: 10,
  },
  description: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
  },
  date: {
    fontSize: 12,
    color: 'grey',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 80,
    textAlign: 'right',
  },
  positiveAmount: {
    color: '#28a745',
  },
  negativeAmount: {
    color: '#dc3545',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  },
}); 