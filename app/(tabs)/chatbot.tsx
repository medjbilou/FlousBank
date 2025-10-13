import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAccountContext } from '../../src/contexts/AccountContext';
import { router } from 'expo-router';

interface Message { id: string; text: string; sender: 'user' | 'bot'; timestamp: number; isSystemMessage?: boolean; }

interface QuickAction {
  id: string;
  title: string;
  icon: React.ReactNode;
  query: string;
  category: string;
}

// Define a Card interface to fix type issues
interface Card {
  id: string;
  active: boolean;
  number: string;
  expiry: string;
  cvv: string;
  spending_limit: number;
}

// Update Account interface to include cards property
interface Account {
  id: string;
  user_id: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  cards?: Card[];
}

export default function ChatbotScreen() {
    const [messages, setMessages] = useState<Message[]>([
        { id: `bot-${Date.now()}`, text: "Hello! I am FloussiBot. How can I assist you today? You can select one of the quick options below or type your question.", sender: 'bot', timestamp: Date.now() }
    ]);
    const [inputText, setInputText] = useState('');
    const [loadingResponse, setLoadingResponse] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const flatListRef = useRef<FlatList>(null);

    const {
        selectedAccount,
        accounts,
        recentTransactions,
        allTransactions,
        loading: accountsLoading,
        error: accountsError,
        loading: loadingTransactions,
        loading: loadingAllTransactions,
        errorAllTransactions,
    } = useAccountContext();

    // Cast selectedAccount to our local Account type for proper typing
    const typedSelectedAccount = selectedAccount as unknown as Account;

    // Function to get day greeting based on time of day
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 18) return "Good afternoon";
      return "Good evening";
    };

    // Add system message when account changes
    useEffect(() => {
      if (selectedAccount) {
        const accNum = selectedAccount.account_number.slice(-4);
        const systemMessage: Message = {
          id: `system-${Date.now()}`,
          text: `${getGreeting()}! Using account ...${accNum}`,
          sender: 'bot',
          timestamp: Date.now(),
          isSystemMessage: true
        };
        setMessages(prev => {
          // Only add if the last message isn't about the same account
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.isSystemMessage && lastMsg.text.includes(accNum)) {
            return prev;
          }
          return [...prev, systemMessage];
        });
      }
    }, [selectedAccount]);

    // Quick action categories
    const categories = [
      { id: 'all', name: 'All' },
      { id: 'account', name: 'Accounts' },
      { id: 'payment', name: 'Payments' },
      { id: 'help', name: 'Help' }
    ];

    // Define quick actions
    const quickActions: QuickAction[] = [
      { 
        id: 'balance', 
        title: 'Account Balance', 
        icon: <Ionicons name="wallet-outline" size={24} color="#1E88E5" />,
        query: 'What is my current balance?',
        category: 'account'
      },
      { 
        id: 'transactions', 
        title: 'Recent Transactions', 
        icon: <Ionicons name="time-outline" size={24} color="#43A047" />,
        query: 'Show my recent transactions',
        category: 'account'
      },
      { 
        id: 'all-transactions', 
        title: 'Transaction History', 
        icon: <Ionicons name="list-outline" size={24} color="#FB8C00" />,
        query: 'Show my transaction history',
        category: 'account'
      },
      { 
        id: 'transfer', 
        title: 'Make a Transfer', 
        icon: <Ionicons name="arrow-forward-outline" size={24} color="#7E57C2" />,
        query: 'How do I make a transfer?',
        category: 'payment'
      },
      { 
        id: 'pay-bill', 
        title: 'Pay a Bill', 
        icon: <FontAwesome5 name="file-invoice" size={20} color="#F4511E" />,
        query: 'How do I pay my bills?',
        category: 'payment'
      },
      { 
        id: 'cards', 
        title: 'Manage Cards', 
        icon: <Ionicons name="card-outline" size={24} color="#5E35B1" />,
        query: 'How do I manage my cards?',
        category: 'account'
      },
      { 
        id: 'branch', 
        title: 'Find a Branch', 
        icon: <Ionicons name="location-outline" size={24} color="#039BE5" />,
        query: 'How can I find the nearest branch?',
        category: 'help'
      },
      { 
        id: 'contact', 
        title: 'Contact Support', 
        icon: <Ionicons name="call-outline" size={24} color="#00897B" />,
        query: 'How do I contact customer support?',
        category: 'help'
      },
    ];

    // Filter quick actions based on selected category
    const filteredActions = selectedCategory === 'all' 
      ? quickActions 
      : quickActions.filter(action => action.category === selectedCategory);

    const getBotResponse = (userMessage: string): string => {
        const lowerCaseMessage = userMessage.toLowerCase().trim();

        if (accountsLoading) {
            return "I'm currently loading your account data, please wait a moment.";
        }
        if (accountsError) {
            return `Sorry, I encountered an error fetching account data: ${accountsError}`;
        }
        if (!selectedAccount) {
             return "Please select an account on the Dashboard tab first so I can provide specific information.";
        }

        // Greetings
        if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi')) {
            return `${getGreeting()}! How can I help you today?`;
        }

        // Balance queries
        if (lowerCaseMessage.includes('balance')) {
            const balance = selectedAccount.balance.toFixed(2);
            const currency = selectedAccount.currency;
            const accNum = selectedAccount.account_number.slice(-4);
            return `Your current balance for account ...${accNum} is ${balance} ${currency}.`;
        }

        // Transaction queries
        if (lowerCaseMessage.includes('recent transaction')) {
            if (loadingTransactions) return "Loading recent transactions...";
            if (recentTransactions.length === 0) return "You have no recent transactions for this account.";

            let response = "Here are your last few transactions:\n";
            recentTransactions.slice(0, 5).forEach(tx => {
                const date = new Date(tx.created_at).toLocaleDateString();
                const desc = tx.description || tx.transaction_type;
                const amount = `${tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}`;
                response += `- ${date}: ${desc} (${amount})\n`;
            });
            response += "\nYou can view more in the History tab.";
            return response.trim();
        }

        if (lowerCaseMessage.includes('history') || lowerCaseMessage.includes('all transaction')) {
             if (errorAllTransactions) {
                 return `Sorry, I encountered an error fetching the transaction history: ${errorAllTransactions}`;
             }
             if (loadingAllTransactions) {
                 return "Loading full transaction history...";
             }
             if (allTransactions.length === 0) {
                 return "You have no transaction history for this account.";
             }
             
             // Calculate the sum of recent transactions (last 30 days)
             const now = new Date();
             const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
             const recentTxs = allTransactions.filter(tx => 
               new Date(tx.created_at) >= thirtyDaysAgo
             );
             
             const totalSpent = recentTxs
               .filter(tx => tx.amount < 0)
               .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
               .toFixed(2);
               
             const totalReceived = recentTxs
               .filter(tx => tx.amount > 0)
               .reduce((sum, tx) => sum + tx.amount, 0)
               .toFixed(2);
             
             return `You have ${allTransactions.length} total transactions. In the last 30 days, you've spent ${totalSpent} ${selectedAccount.currency} and received ${totalReceived} ${selectedAccount.currency}. You can view the full list on the History tab.`;
        }

        // Transfer and payments
        if (lowerCaseMessage.includes('transfer')) {
            return "To make a transfer:\n1. Go to the Transfer tab\n2. Select your source account\n3. Choose or add a recipient\n4. Enter the amount\n5. Review and confirm\n\nWould you like me to take you to the Transfer screen now?";
        }
        
        if (lowerCaseMessage.includes('bill') || lowerCaseMessage.includes('pay')) {
            return "You can pay various bills through our app:\n- Mobile phone bills\n- Electricity bills\n- Internet bills\n- Insurance\n\nTo pay a bill, go to the Bills section in the More tab. Would you like me to take you there now?";
        }

        // Card management
        if (lowerCaseMessage.includes('card')) {
            if (!typedSelectedAccount) {
                return "Please select an account first to view your cards.";
            }
            
            // Get active cards count - fixing type error with proper typing
            const accountCards = typedSelectedAccount.cards || [];
            const activeCards = accountCards.filter((card: Card) => card.active).length;
            
            return `You have ${accountCards.length} card${accountCards.length !== 1 ? 's' : ''} linked to your current account, ${activeCards} of which ${activeCards !== 1 ? 'are' : 'is'} active. You can manage your cards in the Cards tab, where you can:\n- View card details\n- Activate/deactivate cards\n- Set spending limits\n- Request new cards`;
        }

        // Branch/ATM queries
        if (lowerCaseMessage.includes('branch') || lowerCaseMessage.includes('atm') || lowerCaseMessage.includes('location')) {
            return "You can find our branches and ATMs using the Branch Locator in the app. It will show you the nearest locations based on your current position. Would you like me to open the Branch Locator for you?";
        }

        // Contact/Support
        if (lowerCaseMessage.includes('contact') || lowerCaseMessage.includes('support') || lowerCaseMessage.includes('help desk')) {
            return "You can contact our customer support in several ways:\n- Phone: +212-500-123-456 (24/7)\n- Email: support@floussibank.com\n- In-branch: Visit any of our locations during business hours\n\nFor urgent card issues, please call our dedicated card support: +212-500-123-457";
        }

        // General help
        if (lowerCaseMessage.includes('help')) {
            return "I can help you with:\n- Account information and balances\n- Transaction history and details\n- Making transfers\n- Bill payments\n- Card management\n- Finding branches and ATMs\n- Contacting customer support\n\nJust ask me about any of these topics or use the quick action buttons below!";
        }

        // Handle confirmation phrases for navigation
        if (lowerCaseMessage.includes('yes') || lowerCaseMessage.includes('sure') || lowerCaseMessage.includes('please')) {
            // Check previous bot message to determine context
            const prevBotMsg = [...messages].reverse().find(m => m.sender === 'bot');
            
            if (prevBotMsg) {
                if (prevBotMsg.text.includes('Transfer screen')) {
                    setTimeout(() => router.push('/(tabs)/transfer'), 1000);
                    return "Opening the Transfer screen for you now...";
                }
                
                if (prevBotMsg.text.includes('Bills section')) {
                    setTimeout(() => router.push('/(tabs)/bills'), 1000);
                    return "Opening the Bills section for you now...";
                }
                
                if (prevBotMsg.text.includes('Branch Locator')) {
                    setTimeout(() => router.push('/(tabs)/locator'), 1000);
                    return "Opening the Branch Locator for you now...";
                }
            }
        }

        return "I'm not sure I understand that completely. Please try asking in a different way or select one of the quick options below.";
    };

    const handleQuickAction = (action: QuickAction) => {
        const userMessage: Message = { 
            id: `user-${Date.now()}`, 
            text: action.query, 
            sender: 'user', 
            timestamp: Date.now() 
        };
        setMessages(prev => [...prev, userMessage]);
        
        setLoadingResponse(true);
        setTimeout(() => {
            const botResponseText = getBotResponse(action.query);
            const botMessage: Message = { 
                id: `bot-${Date.now()}`, 
                text: botResponseText, 
                sender: 'bot', 
                timestamp: Date.now() + 1 
            };
            setMessages(prev => [...prev, botMessage]);
            setLoadingResponse(false);
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 800);
        
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleSend = useCallback(() => {
         const trimmedText = inputText.trim();
         if (trimmedText.length === 0) return;
         const userMessage: Message = { id: `user-${Date.now()}`, text: trimmedText, sender: 'user', timestamp: Date.now() };
         setMessages(prev => [...prev, userMessage]);
         setInputText('');
         setLoadingResponse(true);
         setTimeout(() => {
             const botResponseText = getBotResponse(trimmedText);
             const botMessage: Message = { id: `bot-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: Date.now() + 1 };
             setMessages(prev => [...prev, botMessage]);
             setLoadingResponse(false);
             flatListRef.current?.scrollToEnd({ animated: true });
         }, 800);
         setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, [inputText, selectedAccount, recentTransactions, allTransactions, accountsLoading, accountsError, loadingTransactions, loadingAllTransactions, errorAllTransactions, messages]);

    const renderMessageItem = ({ item }: { item: Message }) => (
        <View style={[styles.messageRow, item.sender === 'user' ? styles.userMessageRow : styles.botMessageRow]}>
            <View style={[
              styles.messageBubble, 
              item.sender === 'user' 
                ? styles.userMessageBubble 
                : item.isSystemMessage 
                  ? styles.systemMessageBubble 
                  : styles.botMessageBubble
            ]}>
                <Text style={item.sender === 'user' ? styles.userMessageText : styles.botMessageText}>{item.text}</Text>
            </View>
        </View>
    );

    if (accountsLoading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" />
                <Text>Loading Account Info...</Text>
            </View>
        )
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Support Chat</Text>
                <Text style={styles.subtitle}>Select a quick action or type your question below</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessageItem}
                keyExtractor={(item) => item.id}
                style={styles.messageList}
                contentContainerStyle={{ paddingBottom: 10 }}
            />

            {loadingResponse && (
                <View style={styles.typingIndicatorContainer}>
                    <Text style={styles.typingIndicatorText}>FloussiBot is typing...</Text>
                    <View style={styles.dotsContainer}>
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                    </View>
                </View>
            )}

            {/* Quick Action Message */}
            <View style={styles.quickActionHintContainer}>
                <Text style={styles.quickActionHint}>QUICK ACTIONS ▼</Text>
            </View>

            {/* Quick Action Categories */}
            <View style={styles.categoryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map(category => (
                        <TouchableOpacity
                            key={category.id}
                            style={[
                                styles.categoryButton,
                                selectedCategory === category.id && styles.selectedCategory
                            ]}
                            onPress={() => setSelectedCategory(category.id)}
                        >
                            <Text style={[
                                styles.categoryText,
                                selectedCategory === category.id && styles.selectedCategoryText
                            ]}>
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {filteredActions.map(action => (
                        <TouchableOpacity 
                            key={action.id}
                            style={styles.quickActionButton}
                            onPress={() => handleQuickAction(action)}
                            disabled={loadingResponse}
                        >
                            <View style={styles.quickActionIcon}>
                                {action.icon}
                            </View>
                            <Text style={styles.quickActionText}>{action.title}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.inputContainer}>
                <TextInput 
                    style={styles.input} 
                    value={inputText} 
                    onChangeText={setInputText} 
                    placeholder="Type your message..." 
                    placeholderTextColor="#999" 
                    multiline 
                />
                <TouchableOpacity 
                    style={styles.sendButton} 
                    onPress={handleSend} 
                    disabled={loadingResponse || inputText.trim().length === 0}
                >
                    <Ionicons 
                        name="send" 
                        size={24} 
                        color={inputText.trim().length > 0 ? "#fff" : "#aaa"} 
                    />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f0f4f8',
    },
    centeredContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20 
    },
    header: { 
        paddingTop: Platform.OS === 'android' ? 35: 50, 
        paddingBottom: 10, 
        backgroundColor: '#fff', 
        borderBottomWidth: 1, 
        borderBottomColor: '#e0e0e0', 
        alignItems: 'center' 
    },
    title: { 
        fontSize: 20, 
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    messageList: { 
        flex: 1, 
        paddingHorizontal: 10,
    },
    messageRow: { 
        marginVertical: 5, 
        flexDirection: 'row',
    },
    userMessageRow: { 
        justifyContent: 'flex-end',
    },
    botMessageRow: { 
        justifyContent: 'flex-start',
    },
    messageBubble: { 
        paddingVertical: 10, 
        paddingHorizontal: 15, 
        borderRadius: 20, 
        maxWidth: '80%',
    },
    userMessageBubble: { 
        backgroundColor: '#007bff', 
        borderBottomRightRadius: 5,
    },
    botMessageBubble: { 
        backgroundColor: '#e9ecef', 
        borderBottomLeftRadius: 5,
    },
    systemMessageBubble: {
        backgroundColor: '#eeeeee',
        borderRadius: 10,
    },
    userMessageText: { 
        color: '#fff', 
        fontSize: 15,
    },
    botMessageText: { 
        color: '#333', 
        fontSize: 15,
    },
    quickActionHintContainer: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 6,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    quickActionHint: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
    },
    categoryContainer: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#eee',
        paddingVertical: 8,
    },
    categoryButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        marginHorizontal: 4,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    selectedCategory: {
        backgroundColor: '#1E88E5',
    },
    categoryText: {
        color: '#555',
        fontWeight: '500',
    },
    selectedCategoryText: {
        color: '#fff',
    },
    quickActionsContainer: {
        backgroundColor: '#fff',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#eee',
    },
    quickActionButton: {
        width: 120,
        height: 90,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    quickActionIcon: {
        height: 40,
        justifyContent: 'center',
        marginBottom: 5,
    },
    quickActionText: {
        fontSize: 12,
        color: '#333',
        textAlign: 'center',
        paddingHorizontal: 5,
        fontWeight: '500',
    },
    inputContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 10, 
        borderTopWidth: 1, 
        borderTopColor: '#e0e0e0', 
        backgroundColor: '#fff',
    },
    input: { 
        flex: 1, 
        minHeight: 40, 
        maxHeight: 120, 
        backgroundColor: '#f8f9fa', 
        borderRadius: 20, 
        paddingHorizontal: 15, 
        paddingVertical: 10, 
        fontSize: 16, 
        marginRight: 10,
    },
    sendButton: { 
        backgroundColor: '#007bff', 
        borderRadius: 25, 
        width: 45, 
        height: 45, 
        justifyContent: 'center', 
        alignItems: 'center',
    },
    typingIndicatorContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 15, 
        paddingVertical: 8, 
        backgroundColor: '#e9ecef',
    },
    typingIndicatorText: { 
        fontSize: 14, 
        color: '#6c757d', 
        fontStyle: 'italic', 
        marginRight: 5,
    },
    dotsContainer: { 
        flexDirection: 'row', 
        alignItems: 'flex-end', 
        height: 20,
    },
    dot: { 
        width: 6, 
        height: 6, 
        borderRadius: 3, 
        backgroundColor: '#6c757d', 
        marginHorizontal: 2,
    },
}); 