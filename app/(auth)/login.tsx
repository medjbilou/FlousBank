import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/supabaseClient'; // Adjust path as needed
import { router } from 'expo-router';
import { useAuth } from '../_layout'; // Import useAuth to access session state

const MAX_LOGIN_ATTEMPTS = 5;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Reset attempts if email changes
  useEffect(() => {
    setFailedAttempts(0);
    setIsLocked(false);
  }, [email]);

  async function signInWithEmail() {
    if (isLocked) {
      Alert.alert('Account Locked', 'Too many failed login attempts. Please try again later or reset your password.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
        const newAttemptCount = failedAttempts + 1;
        setFailedAttempts(newAttemptCount);
        if (newAttemptCount >= MAX_LOGIN_ATTEMPTS) {
            setIsLocked(true);
            Alert.alert('Account Locked', `Too many failed attempts (${MAX_LOGIN_ATTEMPTS}). Please try again later.`);
            // In a real app, you might trigger a backend event here to actually lock the account
            console.warn('Account should be locked on backend for:', email);
        } else {
            Alert.alert('Login Error', `${error.message} (Attempt ${newAttemptCount}/${MAX_LOGIN_ATTEMPTS})`);
        }
    } else if (data.session) {
        // Login successful
        setFailedAttempts(0); // Reset attempts on success
        setIsLocked(false);
        // The root layout's AuthStateHandler will handle the redirect
        // router.replace('/(tabs)/'); // No need to manually replace here anymore
        console.log("Sign in successful");
    } else {
        // Handle unexpected case where there's no error but no session either
        Alert.alert('Login Error', 'An unexpected error occurred during login.');
    }
    setLoading(false);
  }

  // Optional: Add Sign Up function if needed
  // async function signUpWithEmail() { ... }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Floussi Bank - Login</Text>

       {isLocked && (
         <Text style={styles.errorText}>
           Account locked due to too many failed attempts.
         </Text>
       )}

      <TextInput
        style={[styles.input, isLocked && styles.disabledInput]}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading && !isLocked} // Disable input when loading or locked
      />
      <TextInput
        style={[styles.input, isLocked && styles.disabledInput]}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading && !isLocked} // Disable input when loading or locked
      />
      <View style={styles.buttonContainer}>
        <Button
          title={loading ? 'Signing In...' : 'Sign In'}
          onPress={signInWithEmail}
          disabled={loading || isLocked || !email || !password} // Disable button appropriately
          color={isLocked ? 'gray' : '#007AFF'} // Adjust button color when locked
        />
      </View>
      {/* Optional: Add Sign Up button or Forgot Password link */}
      {/* <Button title="Forgot Password?" onPress={() => {}} /> */}
    </View>
  );
}

// Reuse or adapt styles from App.tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 40,
    width: '100%',
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  disabledInput: {
    backgroundColor: '#E0E0E0', // Darker background when disabled
    color: '#A0A0A0',
  },
  buttonContainer: {
    marginTop: 10,
    width: '100%',
  },
  errorText: {
      color: 'red',
      marginBottom: 10,
      textAlign: 'center',
      fontWeight: 'bold',
  }
}); 