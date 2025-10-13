import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../src/supabaseClient'; // Adjust path if needed

export default function MoreScreen() {

    // Sign out logic
    const handleSignOut = async () => {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.error('Error signing out:', signOutError);
          Alert.alert('Sign Out Error', signOutError.message);
        } else {
          // Root layout AuthStateHandler/AccountProvider effect should handle redirect
          console.log('Signed out, root layout should redirect.');
          // Optionally navigate explicitly if needed, though context effect is preferred
          // router.replace('/(auth)/login');
        }
      };

      // Navigate to Chatbot
      const goToChatbot = () => {
          router.push('/(tabs)/chatbot'); // Navigate to the chatbot screen within tabs
      };

      // Navigate to Bill Payments
      const goToBills = () => {
          router.push('/(tabs)/bills');
      };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <View style={styles.headerContainer}>
                     <Text style={styles.headerTitle}>More Options</Text>
                 </View>

                {/* Chatbot Option */}
                <TouchableOpacity style={styles.optionButton} onPress={goToChatbot}>
                    <Ionicons name="chatbubbles-outline" size={24} color="#495057" />
                    <Text style={styles.optionText}>Support Chat</Text>
                    <Ionicons name="chevron-forward-outline" size={22} color="#adb5bd" />
                </TouchableOpacity>

                {/* --- Bill Payments Option --- */}
                 <TouchableOpacity style={styles.optionButton} onPress={goToBills}>
                    <Ionicons name="receipt-outline" size={24} color="#495057" />
                    <Text style={styles.optionText}>Bill Payments</Text>
                    <Ionicons name="chevron-forward-outline" size={22} color="#adb5bd" />
                </TouchableOpacity>
                {/* ---------------------------- */}

                {/* Add other options here later (e.g., Settings, Profile) */}
                 <View style={styles.separator} />

                 {/* Sign Out Button */}
                 <TouchableOpacity style={styles.optionButton} onPress={handleSignOut}>
                     <Ionicons name="log-out-outline" size={24} color="#dc3545" />
                     <Text style={[styles.optionText, styles.signOutText]}>Sign Out</Text>
                 </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f9fa', // Match background
    },
    container: {
        flex: 1,
    },
     headerContainer: {
        padding: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        backgroundColor: '#fff',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1C3A77',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    optionText: {
        flex: 1,
        marginLeft: 15,
        fontSize: 16,
        color: '#495057',
    },
    separator: {
        height: 10,
        backgroundColor: '#f8f9fa', // Separator color matching background
    },
    signOutText: {
        color: '#dc3545',
        fontWeight: 'bold',
    },
}); 