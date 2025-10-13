import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Switch, TouchableOpacity, Modal, TextInput, Button, Platform } from 'react-native';
import { supabase } from '../../src/supabaseClient';
import { useAccountContext, Card } from '../../src/contexts/AccountContext';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

// Remove local Card type definition if imported from context
// type Card = { ... };

// Remove local Profile type if not used elsewhere here
// type Profile = { ... };

export default function CardsScreen() {
    // Get card state and functions from context
    const {
        selectedAccount,
        loading: contextLoading, // Loading state for accounts
        error: contextError, // Error state for accounts
        cards,
        loadingCards,
        errorCards,
        fetchCards, // Can be used for manual refresh
        updateCard // Function to update card details (e.g., status, limit)
    } = useAccountContext();

    // Remove local state for cards, loading, fetchError as they come from context
    // const [cards, setCards] = useState<Card[]>([]);
    // const [loadingCards, setLoadingCards] = useState(false);
    // const [fetchError, setFetchError] = useState<string | null>(null);

    // State for UI interactions
    const [updatingCardId, setUpdatingCardId] = useState<string | null>(null); // Tracks which card switch is loading
    const [revealedCardId, setRevealedCardId] = useState<string | null>(null); // Tracks which card number is revealed
    const [isLimitModalVisible, setIsLimitModalVisible] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [newLimitInput, setNewLimitInput] = useState('');
    const [updatingLimit, setUpdatingLimit] = useState(false);
    // Keep addingCard state if the add card logic remains here, otherwise remove
    const [addingCard, setAddingCard] = useState(false);

    // Remove useEffect for fetching cards, context handles it
    // useEffect(() => { ... }, [selectedAccount]);

    // Remove local fetchCards function, context provides it
    // async function fetchCards(accountId: string) { ... }

    // --- Card Control Handlers --- //

    const toggleCardActive = async (card: Card) => {
        setUpdatingCardId(card.id);
        const newStatus = !card.is_active;
        try {
            await updateCard(card.id, { is_active: newStatus });
            // Context automatically updates local state on success
            Alert.alert('Success', `Card ${newStatus ? 'activated' : 'deactivated'}.`);
        } catch (error: any) {
            // updateCard already logs the error, context handles error state
            Alert.alert('Error', error.message || 'Could not update card status.');
            // Optionally reset switch visually if update fails (state didn't change)
        } finally {
            setUpdatingCardId(null);
        }
    };

    const handleSetLimit = (card: Card) => {
        setEditingCard(card);
        setNewLimitInput(card.daily_limit.toString());
        setIsLimitModalVisible(true);
        setUpdatingLimit(false);
    };

    const handleConfirmLimitChange = async () => {
        if (!editingCard) return;

        const newLimit = parseFloat(newLimitInput);
        if (isNaN(newLimit) || newLimit < 0) {
            Alert.alert('Invalid Input', 'Please enter a valid non-negative number.');
            return;
        }

        setUpdatingLimit(true);
        try {
            await updateCard(editingCard.id, { daily_limit: newLimit });
            // Context automatically updates local state
            Alert.alert('Success', 'Daily limit updated successfully.');
            setIsLimitModalVisible(false);
            setEditingCard(null);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Could not update card limit.');
        } finally {
            setUpdatingLimit(false);
        }
    };

    // --- Add New Card Handler --- //
    const handleAddNewCard = async () => {
        if (!selectedAccount) {
             Alert.alert("Error", "Please select an account first.");
             return;
         }
         setAddingCard(true);
         try {
             const { data: { user } } = await supabase.auth.getUser();
             if (!user) throw new Error("User not authenticated");
             const { data: profile, error: profileError } = await supabase
                 .from('profiles').select('first_name, last_name').eq('id', user.id).single();
             if (profileError || !profile) throw new Error("Could not fetch user profile.");
             const cardHolderName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Valued Customer';

             // 2. Generate 16-digit card number (4 + 15 random digits)
             const randomDigits = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
             const newCardNumber = `4${randomDigits}`; // 16 digits total
             console.log('Generated Card Number:', newCardNumber, 'Length:', newCardNumber.length);
             const expiryDate = new Date(); expiryDate.setFullYear(expiryDate.getFullYear() + 3);
             const expiryDateString = expiryDate.toISOString().split('T')[0];
             // const cvv = Math.floor(100 + Math.random() * 900).toString(); // CVV generation removed

             // 3. Insert (No CVV included)
             const { error: insertError } = await supabase
                 .from('cards')
                 .insert({
                     account_id: selectedAccount.id,
                     card_number: newCardNumber,
                     card_type: 'Visa',
                     expiry_date: expiryDateString,
                     card_holder_name: cardHolderName,
                     is_active: true,
                     daily_limit: 500
                 });
             if (insertError) throw insertError;

             Alert.alert("Success", "New card added successfully!");
             fetchCards(selectedAccount.id);

         } catch (error: any) {
             console.error("Error adding new card:", error);
             Alert.alert("Error", error.message || "Could not add new card.");
         } finally {
             setAddingCard(false);
         }
    };

    // --- Render Card Item --- //
    const renderCardItem = ({ item }: { item: Card }) => {
        const isRevealed = revealedCardId === item.id;

        // --- Add Console Log Here --- //
        // console.log(`Rendering card: ${item.id}, Number: ${item.card_number}, Length: ${item.card_number?.length}`);

        let revealedFormatted = 'Error';
        let maskedFormatted = 'Error';

        // Format based on actual length, primarily expecting 16 now
        if (typeof item.card_number === 'string' && item.card_number.length === 16) {
            // Format 16-digit number
            revealedFormatted = item.card_number.replace(/(\d{4})/g, '$1 ').trim();
            maskedFormatted = `**** **** **** ${item.card_number.slice(-4)}`;
        } else if (typeof item.card_number === 'string' && item.card_number.length === 12) {
            // Handle older 12-digit cards if they exist
            revealedFormatted = `${item.card_number.slice(0, 4)} ${item.card_number.slice(4, 8)} ${item.card_number.slice(8, 12)}`;
            maskedFormatted = `**** **** ${item.card_number.slice(-4)}`;
        } else {
            console.warn(`Card ${item.id} has unexpected number format: ${item.card_number}`);
            revealedFormatted = item.card_number; // Show raw if unexpected format
            maskedFormatted = '**** **** **** ****'; // Default mask for unknowns
        }

         // --- Add Console Log Here --- //
        // console.log(`Formatted - Revealed: [${revealedFormatted}], Masked: [${maskedFormatted}]`);

        return (
            <View style={[styles.cardItem, !item.is_active && styles.inactiveCard]}>
                {/* Card Header (Type, Reveal Icon) */}
                <View style={styles.cardHeader}>
                    <Text style={styles.cardType}>{item.card_type}</Text>
                    <TouchableOpacity onPress={() => setRevealedCardId(isRevealed ? null : item.id)} style={styles.revealButton}>
                         <Ionicons name={isRevealed ? "eye-off-outline" : "eye-outline"} size={24} color="#6c757d" />
                    </TouchableOpacity>
                </View>
                {/* Card Number / Expiry */}
                <Text style={styles.cardNumber}>
                    {isRevealed ? revealedFormatted : maskedFormatted}
                </Text>
                 {isRevealed && <Text style={styles.expiryDate}>Exp: {new Date(item.expiry_date).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}</Text>}
                {/* Card Holder Name */}
                <Text style={styles.cardHolder}>{item.card_holder_name}</Text>
                {/* Controls Row (Activate/Deactivate, Set Limit) */}
                <View style={styles.controlsRow}>
                     <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Active:</Text>
                        <Switch
                            trackColor={{ false: "#767577", true: "#81c784" }}
                            thumbColor={item.is_active ? "#4caf50" : "#f4f3f4"}
                            ios_backgroundColor="#3e3e3e"
                            onValueChange={() => toggleCardActive(item)}
                            value={item.is_active}
                            disabled={updatingCardId === item.id} // Disable switch while updating this card
                        />
                        {/* Show spinner next to switch while updating */}
                        {updatingCardId === item.id && !isLimitModalVisible && <ActivityIndicator size="small" style={{ marginLeft: 5 }}/>}
                    </View>
                    {/* Only allow setting limit on active cards */}
                    {item.is_active && (
                        <TouchableOpacity style={styles.limitButton} onPress={() => handleSetLimit(item)} disabled={updatingCardId === item.id}>
                            <MaterialIcons name="edit" size={18} color="#007bff" />
                            <Text style={styles.limitButtonText}>Set Limit</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {/* Daily Limit Display */}
                <Text style={styles.dailyLimit}>Daily Limit: ${item.daily_limit.toFixed(2)}</Text>
            </View>
        );
    };

    // --- Main Component Return Logic --- //

    // Handle initial account loading state from context
    if (contextLoading) return <View style={styles.centeredContainer}><ActivityIndicator size="large" /></View>;
    // Handle account fetching error from context
    if (contextError) return <View style={styles.centeredContainer}><Text style={styles.errorText}>Error loading accounts: {contextError}</Text></View>;
    // Handle no account selected
    if (!selectedAccount) return <View style={styles.centeredContainer}><Text>No account selected.</Text></View>;

    // --- Render Main View --- //
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Card Management</Text>
            <Text style={styles.accountInfo}>Account: {selectedAccount.account_type} (...{selectedAccount.account_number.slice(-4)})</Text>

            {/* Add New Card Button */} 
             <TouchableOpacity
                 style={[styles.addNewCardButton, addingCard && styles.disabledButton]}
                 onPress={handleAddNewCard}
                 disabled={addingCard}
             >
                 <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                 <Text style={styles.addNewCardButtonText}>{addingCard ? 'Adding Card...' : 'Add New Card'}</Text>
             </TouchableOpacity>

            {/* Card List Area */}
            {loadingCards ? (
                <ActivityIndicator size="large" style={{ marginTop: 30 }} />
            ) : errorCards ? (
                 <View style={styles.centeredContainer}>
                    <Text style={styles.errorText}>Error loading cards: {errorCards}</Text>
                    <Button title="Retry" onPress={() => fetchCards(selectedAccount!.id)} />
                </View>
            ) : (
                <FlatList
                    data={cards} // Use cards from context
                    renderItem={renderCardItem}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                        <View style={styles.centeredContainer}>
                            <Text>No cards found for this account.</Text>
                        </View>
                    }
                    style={styles.list}
                />
            )}

            {/* Limit Editing Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isLimitModalVisible}
                onRequestClose={() => {
                    setIsLimitModalVisible(!isLimitModalVisible);
                    setEditingCard(null);
                }}
            >
                <View style={styles.modalCenteredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Set Daily Limit</Text>
                        <Text style={styles.modalCardInfo}>Card: {editingCard?.card_type} (...{editingCard?.card_number.slice(-4)})</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter new limit"
                            keyboardType="numeric"
                            value={newLimitInput}
                            onChangeText={setNewLimitInput}
                        />
                        <View style={styles.modalButtonRow}>
                           <Button
                                title={updatingLimit ? "Updating..." : "Confirm"}
                                onPress={handleConfirmLimitChange}
                                disabled={updatingLimit}
                            />
                           <Button
                                title="Cancel"
                                onPress={() => setIsLimitModalVisible(false)}
                                color="#dc3545" // Cancel button color
                                disabled={updatingLimit}
                           />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// --- Styles --- //
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
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
    accountInfo: {
        fontSize: 14,
        color: 'grey',
        textAlign: 'center',
        marginBottom: 20,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        fontSize: 16,
    },
    list: {
        flex: 1,
    },
    cardItem: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    inactiveCard: {
        backgroundColor: '#e9ecef', // Grey out inactive cards
        opacity: 0.7,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardType: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#495057',
    },
    revealButton: {
        padding: 5, // Hit area for the icon
    },
    cardNumber: {
        fontSize: 18, // Larger card number
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', // Monospace font
        marginBottom: 5,
        letterSpacing: 2, // Add spacing
    },
    expiryDate: {
        fontSize: 14,
        color: 'grey',
        marginBottom: 10,
    },
    cardHolder: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 15,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
        marginTop: 5,
    },
    controlGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlLabel: {
        marginRight: 8,
        fontSize: 14,
        color: '#6c757d',
    },
    limitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: '#e7f3ff', // Light blue background
        borderRadius: 15,
    },
    limitButtonText: {
        color: '#007bff',
        marginLeft: 5,
        fontSize: 13,
        fontWeight: 'bold',
    },
    dailyLimit: {
        fontSize: 13,
        color: 'grey',
        marginTop: 8,
        textAlign: 'right',
    },
    // Add New Card Button Styles
    addNewCardButton: {
        flexDirection: 'row',
        backgroundColor: '#28a745', // Green color
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        elevation: 2,
    },
    addNewCardButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.6,
    },
    // Modal Styles
    modalCenteredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dim background
    },
    modalView: {
        width: '85%',
        backgroundColor: "white",
        borderRadius: 10,
        padding: 25,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    modalCardInfo: {
        fontSize: 14,
        color: 'grey',
        marginBottom: 20,
    },
    modalInput: {
        height: 45,
        width: '100%',
        borderColor: '#ced4da',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 20,
        fontSize: 16,
    },
    modalButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Space out buttons
        width: '100%',
    }
}); 