import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path as needed
import { Session } from '@supabase/supabase-js';

// Define Account type (can be moved to a shared types file later)
export type Account = {
    id: string;
    user_id: string;
    account_number: string;
    account_type: string;
    balance: number;
    currency: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

// Define Transaction type (can be moved to shared types)
// Export the Transaction type
export type Transaction = {
  id: string;
  account_id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  recipient_account_id: string | null;
  status: string;
  created_at: string;
};

// --- Define Card type ---
export type Card = {
    id: string;
    account_id: string;
    card_number: string; // Consider masking this in the UI
    card_type: string;
    expiry_date: string; // Keep as string from DB
    cvv?: string; // Make CVV optional as we won't always fetch/have it
    card_holder_name: string;
    is_active: boolean;
    daily_limit: number;
    created_at: string;
    updated_at: string;
};

// Define the shape of the context data
interface AccountContextType {
    accounts: Account[];
    selectedAccount: Account | null;
    setSelectedAccount: (account: Account | null) => void;
    loading: boolean; // Main loading state (accounts)
    error: string | null; // Main error state (accounts)
    fetchAccounts: (userId: string) => Promise<void>;
    recentTransactions: Transaction[]; // Still useful for dashboard
    loadingTransactions: boolean; // Loading state for recent transactions
    // --- Additions for All Transactions ---
    allTransactions: Transaction[];
    loadingAllTransactions: boolean;
    errorAllTransactions: string | null;
    fetchAllTransactions: (accountId: string) => Promise<void>; // Function to trigger full fetch

    // --- Additions for Cards ---
    cards: Card[];
    loadingCards: boolean;
    errorCards: string | null;
    fetchCards: (accountId: string) => Promise<void>;
    // Add functions for card actions later (updateCardStatus, updateCardLimit)
    updateCard: (cardId: string, updates: Partial<Card>) => Promise<void>; // Generic update function
    // --- Add Transfer Function --- //
    transferFunds: (sourceAccountId: string, recipientEmail: string, amount: number, description?: string) => Promise<void>;
}

// Create the context with default values
const AccountContext = createContext<AccountContextType>({
    accounts: [],
    selectedAccount: null,
    setSelectedAccount: () => {},
    loading: true,
    error: null,
    fetchAccounts: async () => {},
    recentTransactions: [],
    loadingTransactions: false,
    // --- Defaults for All Transactions ---
    allTransactions: [],
    loadingAllTransactions: false,
    errorAllTransactions: null,
    fetchAllTransactions: async () => {},

    // --- Defaults for Cards ---
    cards: [],
    loadingCards: false,
    errorCards: null,
    fetchCards: async () => {},
    updateCard: async () => {},
    transferFunds: async () => {}, // Add default for transferFunds
});

// Create a hook for easy consumption
export const useAccountContext = () => useContext(AccountContext);

// Create the Provider component
interface AccountProviderProps {
    children: ReactNode;
}

export const AccountProvider: React.FC<AccountProviderProps> = ({ children }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);

    // State for recent transactions (dashboard)
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    // --- State for All Transactions ---
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [loadingAllTransactions, setLoadingAllTransactions] = useState(false);
    const [errorAllTransactions, setErrorAllTransactions] = useState<string | null>(null);

    // --- State for Cards ---
    const [cards, setCards] = useState<Card[]>([]);
    const [loadingCards, setLoadingCards] = useState(false);
    const [errorCards, setErrorCards] = useState<string | null>(null);

    // Fetch session on initial load
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchAccounts(session.user.id);
            } else {
                setError('User not logged in.');
                setLoadingAccounts(false);
            }
        });

        // Listen for auth changes
       const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          if (_event === 'SIGNED_IN' && session?.user) {
            fetchAccounts(session.user.id); // Re-fetch accounts on sign in
          } else if (_event === 'SIGNED_OUT') {
            setAccounts([]);
            setSelectedAccount(null);
            setRecentTransactions([]);
            setAllTransactions([]); // Clear all transactions on sign out
            setCards([]); // Clear cards
            setError(null);
            setErrorAllTransactions(null); // Clear errors
            setErrorCards(null); // Clear card errors
            setLoadingAccounts(false);
            setLoadingTransactions(false);
            setLoadingAllTransactions(false); // Reset loading states
            setLoadingCards(false); // Clear card loading
          }
        });

       return () => authListener?.subscription.unsubscribe();

    }, []);

    // Effect to fetch transactions when selectedAccount changes
    useEffect(() => {
        if (selectedAccount) {
            fetchRecentTransactions(selectedAccount.id);
            fetchAllTransactions(selectedAccount.id); // Fetch all transactions too
            fetchCards(selectedAccount.id); // <-- Fetch cards for the selected account
        } else {
            setRecentTransactions([]); // Clear if no account selected
            setAllTransactions([]); // Clear all transactions too
            setCards([]); // Clear cards
        }
    }, [selectedAccount]); // Dependency: run when selectedAccount changes

    const fetchAccounts = async (userId: string) => {
        setLoadingAccounts(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from('accounts')
                .select('*')
                .eq('user_id', userId);

            if (dbError) throw dbError;

            const fetchedAccounts = data || [];
            setAccounts(fetchedAccounts);
            if (fetchedAccounts.length > 0) {
                // Select the first account by default, or keep the current selection if it still exists
                setSelectedAccount(currentSelection =>
                    fetchedAccounts.find(acc => acc.id === currentSelection?.id) || fetchedAccounts[0]
                );
            } else {
                setSelectedAccount(null);
                setRecentTransactions([]);
                setAllTransactions([]); // Also clear all transactions if no accounts
                 console.log('No accounts found for this user.');
            }
        } catch (e: any) {
            console.error('Error fetching account data in context:', e);
            setError(e.message || 'Failed to fetch account data.');
        } finally {
            setLoadingAccounts(false);
        }
    };

    // Function to fetch recent transactions for a specific account
    const fetchRecentTransactions = async (accountId: string) => {
        setLoadingTransactions(true);
        try {
            const { data, error: txError } = await supabase
                .from('transactions')
                .select('*')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false })
                .limit(3); // Limit to 3 recent transactions

            if (txError) throw txError;

            setRecentTransactions(data || []);

        } catch (e: any) {
            console.error('Error fetching recent transactions:', e);
            setRecentTransactions([]);
        } finally {
            setLoadingTransactions(false);
        }
    };

    // --- Function to fetch ALL transactions for a specific account ---
    const fetchAllTransactions = async (accountId: string) => {
        setLoadingAllTransactions(true);
        setErrorAllTransactions(null);
        try {
            const { data, error: txError } = await supabase
                .from('transactions')
                .select('*')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false }); // Order by most recent first

            if (txError) throw txError;

            setAllTransactions(data || []);

        } catch (e: any) {
            console.error('Error fetching all transactions:', e);
            setErrorAllTransactions(e.message || 'Failed to fetch transaction history.');
            setAllTransactions([]); // Clear transactions on error
        } finally {
            setLoadingAllTransactions(false);
        }
    };

    // --- Function to fetch Cards --- //
    const fetchCards = async (accountId: string) => {
        console.log("Fetching cards for account:", accountId);
        setLoadingCards(true);
        setErrorCards(null);
        try {
            // Select specific fields, EXCLUDE cvv for security
            const { data, error: dbError } = await supabase
                .from('cards')
                .select('id, account_id, card_number, card_type, expiry_date, card_holder_name, is_active, daily_limit, created_at, updated_at')
                .eq('account_id', accountId);

            if (dbError) throw dbError;

            console.log("Fetched cards:", data);
            setCards(data || []);
        } catch (e: any) {
            console.error('Error fetching cards:', e);
            setErrorCards(e.message || 'Failed to fetch cards.');
            setCards([]);
        } finally {
            setLoadingCards(false);
        }
    };

    // --- Function to Update Card (Generic) --- //
    const updateCard = async (cardId: string, updates: Partial<Omit<Card, 'id' | 'account_id' | 'created_at' | 'updated_at' | 'card_number' | 'cvv'>>) => {
        console.log(`Updating card ${cardId} with:`, updates);
        // Optionally add a loading state specific to card updates if needed
        try {
            const { data, error } = await supabase
                .from('cards')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', cardId)
                .select('id, account_id, card_number, card_type, expiry_date, card_holder_name, is_active, daily_limit, created_at, updated_at') // Reselect updated data
                .single(); // Expecting a single row back

            if (error) throw error;

            if (data) {
                // Update the local state with the modified card
                setCards(currentCards => currentCards.map(card => card.id === cardId ? data : card));
                console.log("Card updated successfully in DB and state:", data);
            } else {
                throw new Error("Failed to update card, no data returned.");
            }
        } catch (e: any) {
            console.error('Error updating card:', e);
            setErrorCards(e.message || 'Failed to update card.'); // Use card error state
            // Re-throw the error so the calling component knows it failed
            throw e;
        }
    };

    // --- Function to actually perform the transfer --- //
    const transferFunds = async (sourceAccountId: string, recipientEmail: string, amount: number, description?: string) => {
        console.log(`[Context:transferFunds] Attempting transfer: ${amount} from ${sourceAccountId} to ${recipientEmail}`);
        // Note: We are throwing errors here so the calling component (confirmation screen) can catch them
        const { data, error: functionError } = await supabase.functions.invoke('transfer-funds', {
            body: {
                sourceAccountId: sourceAccountId,
                recipientEmail: recipientEmail,
                amount: amount,
                description: description || '' // Pass description or empty string
            },
        });

        if (functionError) {
            console.error('Edge Function Error in context:', functionError);
            // Extract a user-friendly message from the function error if possible
            const message = functionError.context?.error?.message || functionError.message || 'Transfer failed via function.';
            throw new Error(message);
        }

        console.log('[Context:transferFunds] Invocation successful, refreshing accounts...', data);
        // Refresh accounts after successful transfer
        if (session?.user) {
            await fetchAccounts(session.user.id);
            // Optionally also refresh transactions immediately if desired
            // await fetchAllTransactions(sourceAccountId);
        } else {
            console.warn('[Context:transferFunds] Transfer successful but no user session found to refresh accounts.')
        }
        // No need to return data here unless the confirmation screen needs it
    };

    const contextValue: AccountContextType = {
        accounts,
        selectedAccount,
        setSelectedAccount,
        loading: loadingAccounts, // Main loading state tracks account loading
        error,
        fetchAccounts,
        recentTransactions, // For dashboard
        loadingTransactions, // For dashboard
        // --- Pass down all transaction state and function ---
        allTransactions,
        loadingAllTransactions,
        errorAllTransactions,
        fetchAllTransactions,
        // --- Add Cards --- //
        cards,
        loadingCards,
        errorCards,
        fetchCards,
        updateCard,
        transferFunds, // Add transferFunds to the provided value
    };

    return <AccountContext.Provider value={contextValue}>{children}</AccountContext.Provider>;
}; 
