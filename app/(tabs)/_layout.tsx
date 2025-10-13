import React from 'react';
import { Tabs, useRouter, Route } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { AccountProvider } from '../../src/contexts/AccountContext';

// Type for the tabBarIcon props
interface TabBarIconProps {
    color: string;
    size: number;
    focused: boolean; // Include focused if needed for styling
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <AccountProvider>
        <Tabs
          screenOptions={({ route }: { route: Route<string> }) => {
              const baseOptions = {
                  tabBarActiveTintColor: '#1C3A77',
                  tabBarInactiveTintColor: 'gray',
                  tabBarStyle: {},
                  headerShown: true,
                  headerRight: () => (
                    <TouchableOpacity
                      onPress={() => router.push('/notifications')}
                      style={{ marginRight: 15 }}
                    >
                      <Ionicons name="notifications-outline" size={24} color="#1C3A77" />
                    </TouchableOpacity>
                  ),
              };

              if (route.name === 'locator') {
                  return {
                      ...baseOptions,
                      unmountOnBlur: true,
                  };
              }
              
              return baseOptions;
          }}
        >
          {/* Core Tabs */}
          <Tabs.Screen
            name="index"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }: TabBarIconProps) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: 'History',
              tabBarIcon: ({ color, size }: TabBarIconProps) => (
                <MaterialCommunityIcons name="history" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="transfer"
            options={{
              title: 'Transfer',
              tabBarIcon: ({ color, size }: TabBarIconProps) => (
                <Ionicons name="swap-horizontal-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="cards"
            options={{
              title: 'Cards',
              tabBarIcon: ({ color, size }: TabBarIconProps) => (
                <Ionicons name="card-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="locator"
            options={{
              title: 'Locator',
              tabBarIcon: ({ color, size }: TabBarIconProps) => (
                <Ionicons name="map-outline" size={size} color={color} />
              ),
              unmountOnBlur: true,
            }}
          />

          {/* More Tab - Visible */}
          <Tabs.Screen
            name="more"
            options={{
              title: 'More',
              tabBarIcon: ({ color, size }: TabBarIconProps) => (
                <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} />
              ),
            }}
          />

          {/* Bills Screen - Hidden from tab bar but navigable */}
          <Tabs.Screen
            name="bills"
            options={{
              title: 'Bill Payments',
              href: null,
              headerShown: true,
            }}
          />

          {/* Chatbot Screen - Hidden from tab bar but navigable */}
          <Tabs.Screen
            name="chatbot"
            options={{
              title: 'Support Chat',
              href: null,
              headerShown: true
            }}
          />
        </Tabs>
    </AccountProvider>
  );
} 
