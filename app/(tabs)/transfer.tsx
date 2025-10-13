import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList, TouchableOpacity, Pressable } from 'react-native';
import { useAccountContext } from '@/src/contexts/AccountContext';
import { supabase } from '@/src/supabaseClient';
import { useRouter } from 'expo-router';

// Define Recipient Type (based on DB schema)
interface Recipient {
    id: string;
    user_id: string;
    name: string;
    account_identifier: string;
    identifier_type?: string | null; // Optional
    created_at: string;
}

export default function TransferScreen() {
  const {
      selectedAccount,
      loading: contextLoading,
      error: contextError,
      fetchAccounts,
      cards,
      loadingCards
    } = useAccountContext();
  const router = useRouter();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // --- Recipient State ---
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [errorRecipients, setErrorRecipients] = useState<string | null>(null);
  // --- State for Modals ---
  const [isSelectModalVisible, setSelectModalVisible] = useState(false);
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientIdentifier, setNewRecipientIdentifier] = useState('');
  const [isSavingRecipient, setIsSavingRecipient] = useState(false);
  const [saveRecipientError, setSaveRecipientError] = useState<string | null>(null);
  // -----------------------

  const hasActiveCard = useMemo(() => {
      if (loadingCards || !selectedAccount) return false;
      return cards.some(card => card.account_id === selectedAccount.id && card.is_active);
  }, [cards, selectedAccount, loadingCards]);

  const handleNavigateToConfirm = async () => {
    console.log('[handleNavigateToConfirm] Initiating navigation to confirmation...');

    if (!selectedAccount) {
      Alert.alert('Error', 'No source account selected.');
      return;
    }
    if (!recipientEmail || !amount) {
      Alert.alert('Error', 'Please enter recipient email and amount.');
      return;
    }
    if (!hasActiveCard) {
        Alert.alert('Action Required', 'You need an active card linked to this account to make transfers.');
        return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email && session.user.email.toLowerCase() === recipientEmail.toLowerCase()) {
        Alert.alert('Error', 'You cannot send funds to yourself.');
        return;
    }
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid positive amount.');
      return;
    }
    if (transferAmount > selectedAccount.balance) {
        Alert.alert('Error', 'Insufficient balance.');
        return;
    }

    console.log('[handleNavigateToConfirm] Validation passed. Navigating...');

    router.push({
        pathname: '/transfer-confirmation',
        params: { 
            sourceAccountId: selectedAccount.id, 
            recipientEmail: recipientEmail.trim(), 
            amount: amount,
            description: description.trim()
        }
    });
  };

  const fetchRecipients = useCallback(async () => {
    console.log('[fetchRecipients] Fetching recipients...');
    setLoadingRecipients(true);
    setErrorRecipients(null);
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
            throw new Error(sessionError?.message || 'User not authenticated');
        }

        const { data, error } = await supabase
            .from('recipients')
            .select('*')
            .eq('user_id', session.user.id)
            .order('name', { ascending: true });

        if (error) {
            console.error('[fetchRecipients] Error fetching recipients:', error);
            throw error;
        }

        console.log(`[fetchRecipients] Found ${data?.length || 0} recipients.`);
        setRecipients(data || []);
    } catch (error: any) {
        setErrorRecipients(error.message || 'Failed to fetch recipients');
    } finally {
        setLoadingRecipients(false);
    }
  }, []);

  useEffect(() => {
      fetchRecipients();
  }, [fetchRecipients]);

  const handleSelectRecipient = (recipient: Recipient) => {
    setRecipientEmail(recipient.account_identifier);
    setSelectModalVisible(false);
  };

  const handleAddNewRecipient = async () => {
    if (!newRecipientName.trim() || !newRecipientIdentifier.trim()) {
        setSaveRecipientError('Please enter both name and identifier.');
        return;
    }
    setIsSavingRecipient(true);
    setSaveRecipientError(null);
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
            throw new Error(sessionError?.message || 'User not authenticated');
        }

        const { error: insertError } = await supabase
            .from('recipients')
            .insert({
                user_id: session.user.id,
                name: newRecipientName.trim(),
                account_identifier: newRecipientIdentifier.trim(),
            });
        
        if (insertError) {
            console.error('[handleAddNewRecipient] Error saving recipient:', insertError);
            throw insertError;
        }

        setNewRecipientName('');
        setNewRecipientIdentifier('');
        setAddModalVisible(false);
        await fetchRecipients();
        Alert.alert('Success', 'Recipient added successfully!');

    } catch (error: any) {
        setSaveRecipientError(error.message || 'Failed to save recipient.');
    } finally {
        setIsSavingRecipient(false);
    }
  };

  if (contextLoading) return <View style={styles.centeredContainer}><ActivityIndicator size="large" /></View>;
  if (contextError) return <View style={styles.centeredContainer}><Text style={styles.errorText}>Error loading accounts: {contextError}</Text></View>;
  if (!selectedAccount) return <View style={styles.centeredContainer}><Text>Please select an account on the Dashboard tab first.</Text></View>;

  const isTransferDisabled = !hasActiveCard;

  console.log(`[TransferScreen Render] isTransferDisabled: ${isTransferDisabled}, loadingRecipients: ${loadingRecipients}, recipients.length: ${recipients.length}, isSelectModalVisible: ${isSelectModalVisible}`);

  return (
    <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
             <View style={styles.container}>
                <Text style={styles.title}>Initiate Transfer</Text>
                <Text style={styles.sourceAccountText}>
                    From Account: {selectedAccount.account_type} (...{selectedAccount.account_number.slice(-4)})
                </Text>
                <Text style={styles.balanceText}>
                    Balance: {selectedAccount.balance.toFixed(2)} {selectedAccount.currency}
                </Text>

                {!hasActiveCard && !loadingCards && (
                    <Text style={styles.warningText}>
                        An active card is required for this account to send transfers.
                        Please activate one in the 'Cards' tab.
                    </Text>
                )}
                {loadingCards && (
                     <ActivityIndicator style={{ marginBottom: 10 }} />
                )}

                <Text style={styles.label}>Recipient Email:</Text>
                <View style={styles.recipientInputContainer}>
                    <TextInput
                        style={styles.inputRecipient}
                        placeholder="recipient@example.com"
                        value={recipientEmail}
                        onChangeText={setRecipientEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TouchableOpacity 
                        style={styles.selectButton} 
                        onPress={() => { fetchRecipients(); setSelectModalVisible(true); }}
                        disabled={loadingRecipients}
                    >
                         {loadingRecipients ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.selectButtonText}>Select</Text>}
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Amount ({selectedAccount.currency}):</Text>
                <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Description (Optional):</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Rent, Dinner"
                    value={description}
                    onChangeText={setDescription}
                />

                <Button 
                    title="Review Transfer"
                    onPress={handleNavigateToConfirm}
                    disabled={isTransferDisabled}
                    color="#1C3A77"
                />
            </View>
        </ScrollView>

        <Modal
            animationType="slide"
            transparent={true}
            visible={isSelectModalVisible}
            onRequestClose={() => setSelectModalVisible(false)}
        >
            <View style={styles.modalCenteredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Select Recipient</Text>
                    {loadingRecipients ? (
                        <ActivityIndicator />
                    ) : recipients.length === 0 ? (
                         <Text>No saved recipients found. Add one first.</Text>
                    ) : (
                        <FlatList
                            data={recipients}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.recipientItem}
                                    onPress={() => handleSelectRecipient(item)}
                                >
                                    <Text style={styles.recipientName}>{item.name}</Text>
                                    <Text style={styles.recipientIdentifier}>{item.account_identifier}</Text>
                                </TouchableOpacity>
                            )}
                            style={styles.recipientList}
                        />
                    )}
                    <Pressable
                        style={[styles.button, styles.buttonClose]}
                        onPress={() => setSelectModalVisible(!isSelectModalVisible)}
                    >
                        <Text style={styles.textStyle}>Close</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>

        <Modal
            animationType="slide"
            transparent={true}
            visible={isAddModalVisible}
            onRequestClose={() => setAddModalVisible(false)}
        >
            <View style={styles.modalCenteredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Add New Recipient</Text>
                    
                    <TextInput
                        style={styles.modalInput}
                        placeholder="Recipient's Name"
                        value={newRecipientName}
                        onChangeText={setNewRecipientName}
                        editable={!isSavingRecipient}
                    />
                    <TextInput
                        style={styles.modalInput}
                        placeholder="Recipient's Account Identifier (e.g., Email)"
                        value={newRecipientIdentifier}
                        onChangeText={setNewRecipientIdentifier}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isSavingRecipient}
                    />

                    {saveRecipientError && (
                        <Text style={[styles.errorText, { marginBottom: 10 }]}>{saveRecipientError}</Text>
                    )}

                    <View style={styles.modalButtonContainer}>
                        <Pressable
                            style={[styles.button, styles.buttonSave, isSavingRecipient && styles.buttonDisabled]}
                            onPress={handleAddNewRecipient}
                            disabled={isSavingRecipient}
                        >
                            <Text style={styles.textStyle}>{isSavingRecipient ? 'Saving...' : 'Save Recipient'}</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.button, styles.buttonCancel, isSavingRecipient && styles.buttonDisabled]}
                            onPress={() => setAddModalVisible(false)}
                            disabled={isSavingRecipient}
                        >
                            <Text style={styles.textStyle}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
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
    marginBottom: 20,
    textAlign: 'center',
  },
  sourceAccountText: {
      fontSize: 16,
      marginBottom: 5,
      textAlign: 'center',
      color: '#555',
  },
  balanceText: {
      fontSize: 16,
      marginBottom: 20,
      textAlign: 'center',
      color: '#555',
      fontWeight: 'bold',
  },
  input: {
    height: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  recipientInputContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  inputRecipient: {
    flex: 1,
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  selectButton: {
    backgroundColor: '#1C3A77',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    height: 45,
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  warningText: {
      color: '#856404',
      backgroundColor: '#fff3cd',
      borderWidth: 1,
      borderColor: '#ffeeba',
      padding: 10,
      borderRadius: 5,
      textAlign: 'center',
      marginBottom: 15,
      fontSize: 14,
  },
  disabledInput: {
      backgroundColor: '#e9ecef',
      color: '#6c757d',
  },
  buttonContainer: {
      marginTop: 10,
  },
  modalCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
  },
  recipientList: {
      width: '100%',
      marginBottom: 15,
  },
  recipientItem: {
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      width: '100%',
  },
  recipientName: {
      fontSize: 16,
      fontWeight: '500',
  },
  recipientIdentifier: {
      fontSize: 14,
      color: '#666',
  },
  button: {
      borderRadius: 10,
      padding: 10,
      elevation: 2,
      minWidth: 100,
      marginTop: 10,
  },
  buttonClose: {
      backgroundColor: '#2196F3',
  },
  buttonSave: {
      backgroundColor: '#198754',
  },
  buttonCancel: {
      backgroundColor: '#6c757d',
  },
  buttonDisabled: {
      backgroundColor: '#cccccc',
  },
  textStyle: {
      color: 'white',
      fontWeight: 'bold',
      textAlign: 'center',
  },
  modalInput: {
      height: 45,
      borderColor: '#ced4da',
      borderWidth: 1,
      marginBottom: 15,
      paddingHorizontal: 15,
      borderRadius: 8,
      backgroundColor: '#fff',
      fontSize: 16,
      width: '100%',
  },
  modalButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
    fontWeight: '500',
  },
}); 
