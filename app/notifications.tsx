import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/src/supabaseClient'; // Use path alias
import { formatDistanceToNow } from 'date-fns'; // For formatting timestamps

// Define the type for a notification object from Supabase
interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string; // Supabase returns timestamp as string
}

// Placeholder notification data - REMOVE LATER
// const mockNotifications = [...];

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error: dbError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); // Show newest first

      if (dbError) throw dbError;

      setNotifications(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
      console.error('Fetch Notifications Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  // Render item function - updated to use Notification type and format timestamp
  const renderItem = ({ item }: { item: Notification }) => (
    <View style={styles.notificationItem}>
      <Text style={styles.notificationTitle}>{item.title}</Text>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      <Text style={styles.notificationTimestamp}>
        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
      </Text>
      {/* Optionally add styling for unread items based on item.is_read */}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1C3A77" />
        <Stack.Screen options={{ title: 'Notifications' }} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Stack.Screen options={{ title: 'Notifications' }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Notifications' }} />
      {notifications.length > 0 ? (
        <FlatList
          data={notifications} // Use fetched notifications
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={ // Add pull-to-refresh
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1C3A77"]}/>
          }
        />
      ) : (
        <View style={styles.centeredContainer}>
          {/* Center "No notifications" text - Moved comment here */}
          <Text style={styles.noNotificationsText}>No notifications yet.</Text>
          {/* Still need pull-to-refresh on empty screen */}
          <FlatList data={[]} renderItem={() => null} keyExtractor={(item, index) => index.toString()} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1C3A77"]}/>} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centeredContainer: { // New style for centering loading/error/empty messages
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 15,
  },
  notificationItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  noNotificationsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    // Remove flex: 1 and marginTop: 50 if using centeredContainer
  },
  errorText: { // New style for error messages
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default NotificationsScreen; 
