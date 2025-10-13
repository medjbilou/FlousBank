import 'react-native-url-polyfill/auto'; // Required for Supabase JS v2
import 'react-native-get-random-values'; // Required for Supabase JS v2 UUID generation
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// SecureStore adapter for Supabase
const SecureStorageAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

// Use environment variables in a real app
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ; // replace with ur own
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY  // put ur own 

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStorageAdapter, // Use SecureStore for session persistence
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
}); 
