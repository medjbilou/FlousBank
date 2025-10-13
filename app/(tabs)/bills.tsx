import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, ActivityIndicator, Alert, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/src/supabaseClient'; // Uncommented Supabase import
import { useAccountContext } from '@/src/contexts/AccountContext'; // Corrected path
import { Transaction } from '@/src/contexts/AccountContext'; // Import Transaction type if not already done

// Remove Biller/UserBiller types if no longer fetched directly here
/*
interface Biller { ... }
interface UserBiller { ... }
*/

const BillsScreen = () => {
  const router = useRouter();
  const { selectedAccount, refetchSelectedAccountData, allTransactions, loadingAllTransactions, session } = useAccountContext(); // Get account context, including the new refresh function and session
  
  // --- State for Bill Payment Forms ---
  // Mobile
  const [mobileOperator, setMobileOperator] = useState('IAM'); // Default or null
  const [mobileAmount, setMobileAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mobileLoading, setMobileLoading] = useState(false);

  // Electricity
  const [electricityProvider, setElectricityProvider] = useState('REDAL'); // Default or null
  const [electricityBill, setElectricityBill] = useState<any>(null); // To store the generated bill
  const [electricityLoading, setElectricityLoading] = useState(false);

  // Wi-Fi
  const [wifiProvider, setWifiProvider] = useState('IAM'); // Default or null
  const [wifiBill, setWifiBill] = useState<any>(null);
  const [wifiLoading, setWifiLoading] = useState(false);

  // Car Insurance
  const [insuranceProvider, setInsuranceProvider] = useState('AXA'); // Default or null
  const [insuranceBill, setInsuranceBill] = useState<any>(null);
  const [insuranceLoading, setInsuranceLoading] = useState(false);

  // --- Remove Fetch Saved Billers Logic --- //
  /*
  const [savedBillers, setSavedBillers] = useState<UserBiller[]>([]);
  const [loadingBillers, setLoadingBillers] = useState(true);
  const [errorBillers, setErrorBillers] = useState<string | null>(null);
  const fetchSavedBillers = useCallback(async () => { ... }, []);
  useEffect(() => { ... }, [fetchSavedBillers]);
  */
  // -------------------------------------- //

  // TODO: Implement fetching payment history

  // --- Payment Handlers using Supabase RPC --- //

  const handlePayMobile = async () => {
    if (!selectedAccount) {
      Alert.alert('Error', 'No account selected.');
      return;
    }
    const amount = parseFloat(mobileAmount);
    if (!phoneNumber || !mobileAmount || isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Please enter a valid phone number and positive amount.');
        return;
    }

    const userId = session?.user?.id;
    if (!userId) {
      Alert.alert('Error', 'User not identified. Please log in again.');
      return;
    }

    setMobileLoading(true);
    try {
      const description = `Mobile Top-up (${mobileOperator}) for ${phoneNumber}`;
      const { data, error } = await supabase.rpc('process_bill_payment', {
        p_amount: amount,
        p_biller_category: 'mobile',
        p_biller_name: mobileOperator,
        p_biller_reference: phoneNumber,
        p_source_account_id: selectedAccount.id,
        p_transaction_description: description,
        p_user_id: userId
      });

      if (error) throw error;

      if (data?.success) {
          Alert.alert('Success', data.message || 'Mobile top-up successful!');
          setPhoneNumber('');
          setMobileAmount('');
          refetchSelectedAccountData?.();
      } else {
          Alert.alert('Payment Failed', data?.message || 'An unknown error occurred.');
      }
    } catch (error: any) {
      console.error("Mobile Payment Error:", error);
      Alert.alert('Error', error?.message || 'Failed to process mobile payment.');
    } finally {
      setMobileLoading(false);
    }
  };

  const handleFetchElectricityBill = () => {
    setElectricityLoading(true);
    // Simulate fetching/generating a random bill
    setTimeout(() => {
      setElectricityBill({
        provider: electricityProvider,
        reference: `BILL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        amount: (Math.random() * 300 + 50).toFixed(2), // Random amount 50-350
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString(), // Due in 15 days
      });
      setElectricityLoading(false);
    }, 1000);
  };

  const handlePayElectricity = async () => {
     if (!selectedAccount) {
      Alert.alert('Error', 'No account selected.');
      return;
    }
    if (!electricityBill) {
      Alert.alert('Error', 'No electricity bill details found.');
      return;
    }
    const amount = parseFloat(electricityBill.amount);
     if (isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Invalid bill amount.');
        return;
    }

    const userId = session?.user?.id;
    if (!userId) {
        Alert.alert('Error', 'User not identified. Please log in again.');
        return;
    }

    setElectricityLoading(true);
    try {
       const description = `Electricity Bill (${electricityBill.provider}) - Ref: ${electricityBill.reference}`;
       const { data, error } = await supabase.rpc('process_bill_payment', {
         p_amount: amount,
         p_biller_category: 'electricity',
         p_biller_name: electricityBill.provider,
         p_biller_reference: electricityBill.reference,
         p_source_account_id: selectedAccount.id,
         p_transaction_description: description,
         p_user_id: userId
      });

      if (error) throw error;

       if (data?.success) {
          Alert.alert('Success', data.message || 'Electricity bill paid successfully!');
          setElectricityBill(null);
          refetchSelectedAccountData?.();
      } else {
          Alert.alert('Payment Failed', data?.message || 'An unknown error occurred.');
      }
    } catch (error: any) {
       console.error("Electricity Payment Error:", error);
       Alert.alert('Error', error?.message || 'Failed to process electricity payment.');
    } finally {
      setElectricityLoading(false);
    }
  };

  // --- Wi-Fi Handlers ---
   const handleFetchWifiBill = () => {
      setWifiLoading(true);
      // Simulate fetching/generating a random bill
      setTimeout(() => {
          setWifiBill({
              provider: wifiProvider,
              reference: `WIFI-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
              amount: (Math.random() * 200 + 100).toFixed(2), // Random amount 100-300
              dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString(), // Due in 10 days
          });
          setWifiLoading(false);
      }, 1000);
  };

  const handlePayWifi = async () => {
      if (!selectedAccount) {
          Alert.alert('Error', 'No account selected.');
          return;
      }
      if (!wifiBill) {
          Alert.alert('Error', 'No Wi-Fi bill details found.');
          return;
      }
       const amount = parseFloat(wifiBill.amount);
       if (isNaN(amount) || amount <= 0) {
          Alert.alert('Error', 'Invalid bill amount.');
          return;
      }

      const userId = session?.user?.id;
      if (!userId) {
          Alert.alert('Error', 'User not identified. Please log in again.');
          return;
      }

      setWifiLoading(true);
      try {
          const description = `Wi-Fi Bill (${wifiBill.provider}) - Ref: ${wifiBill.reference}`;
          const { data, error } = await supabase.rpc('process_bill_payment', {
              p_amount: amount,
              p_biller_category: 'wifi',
              p_biller_name: wifiBill.provider,
              p_biller_reference: wifiBill.reference,
              p_source_account_id: selectedAccount.id,
              p_transaction_description: description,
              p_user_id: userId
          });

          if (error) throw error;

          if (data?.success) {
              Alert.alert('Success', data.message || 'Wi-Fi bill paid successfully!');
              setWifiBill(null);
              refetchSelectedAccountData?.();
          } else {
              Alert.alert('Payment Failed', data?.message || 'An unknown error occurred.');
          }
      } catch (error: any) {
          console.error("WiFi Payment Error:", error);
          Alert.alert('Error', error?.message || 'Failed to process Wi-Fi payment.');
      } finally {
          setWifiLoading(false);
      }
  };

  // --- Insurance Handlers ---
   const handleFetchInsuranceBill = () => {
      setInsuranceLoading(true);
      // Simulate fetching/generating a random bill
      setTimeout(() => {
          setInsuranceBill({
              provider: insuranceProvider,
              reference: `INS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
              amount: (Math.random() * 500 + 200).toFixed(2), // Random amount 200-700
              dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toLocaleDateString(), // Due in 20 days
          });
          setInsuranceLoading(false);
      }, 1000);
  };

   const handlePayInsurance = async () => {
       if (!selectedAccount) {
          Alert.alert('Error', 'No account selected.');
          return;
      }
       if (!insuranceBill) {
          Alert.alert('Error', 'No insurance bill details found.');
          return;
      }
       const amount = parseFloat(insuranceBill.amount);
       if (isNaN(amount) || amount <= 0) {
          Alert.alert('Error', 'Invalid bill amount.');
          return;
      }

      const userId = session?.user?.id;
      if (!userId) {
          Alert.alert('Error', 'User not identified. Please log in again.');
          return;
      }

      setInsuranceLoading(true);
      try {
          const description = `Insurance Payment (${insuranceBill.provider}) - Ref: ${insuranceBill.reference}`;
          const { data, error } = await supabase.rpc('process_bill_payment', {
              p_amount: amount,
              p_biller_category: 'insurance',
              p_biller_name: insuranceBill.provider,
              p_biller_reference: insuranceBill.reference,
              p_source_account_id: selectedAccount.id,
              p_transaction_description: description,
              p_user_id: userId
          });

          if (error) throw error;

          if (data?.success) {
              Alert.alert('Success', data.message || 'Insurance bill paid successfully!');
              setInsuranceBill(null);
              refetchSelectedAccountData?.();
          } else {
              Alert.alert('Payment Failed', data?.message || 'An unknown error occurred.');
          }
      } catch (error: any) {
          console.error("Insurance Payment Error:", error);
          Alert.alert('Error', error?.message || 'Failed to process insurance payment.');
      } finally {
          setInsuranceLoading(false);
      }
  };

  // --- Component to render individual transaction item ---
  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity style={styles.historyItem} onPress={() => { /* Optional: Navigate to details */ }}>
        <View style={styles.historyItemRow}>
             <Text style={styles.historyItemType}>{item.description || 'Bill Payment'}</Text>
             <Text style={[styles.historyItemAmount, { color: item.amount < 0 ? '#dc3545' : '#28a745' }]}>
                {item.amount.toFixed(2)} {selectedAccount?.currency || 'DH'}
            </Text>
        </View>
        <Text style={styles.historyItemDate}>
            {new Date(item.created_at).toLocaleString()}
        </Text>
    </TouchableOpacity>
  );

  // --- Payment History Section --- //
  const renderPaymentHistory = () => {
    // Filter transactions - **ASSUMPTION**: Bill payments have type 'bill_payment'
    // Adjust this filter based on your actual transaction data!
    const paymentHistory = allTransactions.filter(tx => tx.transaction_type === 'bill_payment');

    if (loadingAllTransactions) {
      return <ActivityIndicator style={styles.loader} />; // Use existing loader style
    }

    if (paymentHistory.length === 0) {
      return <Text style={styles.emptyText}>No payment history found.</Text>;
    }

    return (
      <FlatList
        data={paymentHistory}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false} // Disable scrolling within the ScrollView if list is short
        contentContainerStyle={{ paddingBottom: 10 }} // Add some padding
      />
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Bill Payments' }} />
      <Text style={styles.title}>Pay Bills & Top-up</Text>

      {/* --- Mobile Top-up Section --- */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Mobile Top-up / Subscription</Text>
        <Text style={styles.label}>Operator:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={mobileOperator}
            onValueChange={(itemValue) => setMobileOperator(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="IAM" value="IAM" />
            <Picker.Item label="Orange" value="Orange" />
            <Picker.Item label="Inwi" value="Inwi" />
          </Picker>
        </View>
        <Text style={styles.label}>Amount / Offer:</Text>
        <TextInput style={styles.input} value={mobileAmount} onChangeText={setMobileAmount} placeholder="e.g., 50 DH or *3" keyboardType="default"/>
        <Text style={styles.label}>Phone Number:</Text>
        <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="06xxxxxxxx" keyboardType="phone-pad" />
        <Button title={mobileLoading ? "Processing..." : "Pay Mobile"} onPress={handlePayMobile} disabled={mobileLoading} />
      </View>

      {/* --- Electricity Bill Section --- */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Electricity Bill</Text>
        <Text style={styles.label}>Provider:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={electricityProvider}
            onValueChange={(itemValue) => setElectricityProvider(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="REDAL" value="REDAL" />
            <Picker.Item label="RAK" value="RAK" />
            <Picker.Item label="ONEE" value="ONEE" />
          </Picker>
        </View>
        
        {!electricityBill && (
            <Button title={electricityLoading ? "Checking..." : "Check Bill"} onPress={handleFetchElectricityBill} disabled={electricityLoading} />
        )}

        {electricityLoading && !electricityBill && <ActivityIndicator style={styles.loader}/>}
        
        {electricityBill && (
          <View style={styles.billDetails}>
            <Text style={styles.billDetailText}>Provider: {electricityBill.provider}</Text>
            <Text style={styles.billDetailText}>Reference: {electricityBill.reference}</Text>
            <Text style={styles.billDetailText}>Amount: {electricityBill.amount} DH</Text>
            <Text style={styles.billDetailText}>Due Date: {electricityBill.dueDate}</Text>
            <Button title={electricityLoading ? "Paying..." : "Pay Now"} onPress={handlePayElectricity} disabled={electricityLoading}/>
            <Button title="Cancel" onPress={() => setElectricityBill(null)} color="#888" disabled={electricityLoading}/>
          </View>
        )}
      </View>

      {/* --- Wi-Fi Bill Section --- */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Wi-Fi Bill</Text>
        <Text style={styles.label}>Provider:</Text>
        <View style={styles.pickerContainer}>
           <Picker
            selectedValue={wifiProvider}
            onValueChange={(itemValue) => setWifiProvider(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="IAM" value="IAM" />
            <Picker.Item label="Orange" value="Orange" />
            <Picker.Item label="Inwi" value="Inwi" />
          </Picker>
        </View>
         {!wifiBill && (
            <Button title={wifiLoading ? "Checking..." : "Check Bill"} onPress={handleFetchWifiBill} disabled={wifiLoading} />
        )}

        {wifiLoading && !wifiBill && <ActivityIndicator style={styles.loader}/>}
        
        {wifiBill && (
          <View style={styles.billDetails}>
            <Text style={styles.billDetailText}>Provider: {wifiBill.provider}</Text>
            <Text style={styles.billDetailText}>Reference: {wifiBill.reference}</Text>
            <Text style={styles.billDetailText}>Amount: {wifiBill.amount} DH</Text>
            <Text style={styles.billDetailText}>Due Date: {wifiBill.dueDate}</Text>
            <Button title={wifiLoading ? "Paying..." : "Pay Now"} onPress={handlePayWifi} disabled={wifiLoading}/>
            <Button title="Cancel" onPress={() => setWifiBill(null)} color="#888" disabled={wifiLoading}/>
          </View>
        )}
      </View>

      {/* --- Car Insurance Section --- */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Car Insurance</Text>
         <Text style={styles.label}>Provider:</Text>
        <View style={styles.pickerContainer}>
           <Picker
            selectedValue={insuranceProvider}
            onValueChange={(itemValue) => setInsuranceProvider(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="AXA" value="AXA" />
            <Picker.Item label="Wafa Assurance" value="Wafa" />
            <Picker.Item label="Sanad" value="Sanad" />
            {/* Add more insurance providers */}
          </Picker>
        </View>
         {!insuranceBill && (
            <Button title={insuranceLoading ? "Checking..." : "Check Bill"} onPress={handleFetchInsuranceBill} disabled={insuranceLoading} />
        )}

        {insuranceLoading && !insuranceBill && <ActivityIndicator style={styles.loader}/>}
        
        {insuranceBill && (
          <View style={styles.billDetails}>
            <Text style={styles.billDetailText}>Provider: {insuranceBill.provider}</Text>
            <Text style={styles.billDetailText}>Reference: {insuranceBill.reference}</Text>
            <Text style={styles.billDetailText}>Amount: {insuranceBill.amount} DH</Text>
            <Text style={styles.billDetailText}>Due Date: {insuranceBill.dueDate}</Text>
            <Button title={insuranceLoading ? "Paying..." : "Pay Now"} onPress={handlePayInsurance} disabled={insuranceLoading}/>
            <Button title="Cancel" onPress={() => setInsuranceBill(null)} color="#888" disabled={insuranceLoading}/>
          </View>
        )}
      </View>

      {/* --- Payment History Section --- */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Payment History</Text>
        {renderPaymentHistory()}
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
    color: '#1C3A77',
  },
  sectionContainer: {
    marginHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  label: {
      fontSize: 14,
      fontWeight: '500',
      color: '#555',
      marginBottom: 5,
  },
  input: {
      height: 45,
      borderColor: '#ccc',
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 10,
      marginBottom: 15,
      backgroundColor: '#fff',
  },
  pickerContainer: {
      height: 50,
      borderColor: '#ccc',
      borderWidth: 1,
      borderRadius: 5,
      marginBottom: 15,
      justifyContent: 'center',
      backgroundColor: '#fff',
  },
  picker: {
  },
  billDetails: {
      marginTop: 15,
      padding: 10,
      backgroundColor: '#f0f0f0',
      borderRadius: 5,
  },
  billDetailText: {
      fontSize: 15,
      marginBottom: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  loader: {
      marginTop: 15,
      marginBottom: 10,
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    marginTop: 10,
  },
  // --- History Item Styles ---
  historyItem: {
      backgroundColor: '#f9f9f9',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      marginBottom: 5, // Add some space between items
      borderRadius: 4,
  },
  historyItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
  },
  historyItemType: {
      fontSize: 15,
      fontWeight: '500',
      color: '#444',
      flexShrink: 1, // Allow text to shrink if needed
      marginRight: 8, // Add space before amount
  },
  historyItemAmount: {
      fontSize: 15,
      fontWeight: 'bold',
  },
  historyItemDate: {
      fontSize: 12,
      color: '#888',
  },
  // Remove unused billerItem styles if desired
});

export default BillsScreen; 