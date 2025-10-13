import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, Alert, TouchableOpacity, Linking, Platform } from 'react-native';
import { Stack } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/src/supabaseClient';
import { FontAwesome } from '@expo/vector-icons';

// Define types
type Branch = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  type?: string;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

type IsolatedMapViewProps = {
  branches: Branch[];
  loadingBranches: boolean;
  userLocation: UserLocation | null;
  errorMsg: string | null;
  isScreenFocused: boolean;
};

// Function to open directions in the native maps app
const openDirections = (destination: { latitude: number; longitude: number; name: string }) => {
  const { latitude, longitude, name } = destination;
  const label = encodeURIComponent(name);
  
  // Create different URLs based on the platform
  let url;
  if (Platform.OS === 'ios') {
    // Apple Maps
    url = `maps://app?daddr=${latitude},${longitude}&dirflg=d&t=m`;
  } else {
    // Google Maps (works for Android and web)
    url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${label}&travelmode=driving`;
  }
  
  Linking.canOpenURL(url).then(supported => {
    if (supported) {
      Linking.openURL(url);
    } else {
      // Fallback to a web URL that should work on any device
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    }
  }).catch(err => {
    console.error('An error occurred', err);
    Alert.alert('Error', 'Could not open maps application');
  });
};

// Create a separate component for the map to better control its lifecycle
function IsolatedMapView({ branches, loadingBranches, userLocation, errorMsg, isScreenFocused }: IsolatedMapViewProps) {
  const [mapReady, setMapReady] = useState(false);
  const mapViewRef = useRef<MapView>(null);
  const [mounted, setMounted] = useState(false);
  const [key, setKey] = useState(Date.now().toString());
  const [mapError, setMapError] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 31.7917,
    longitude: -6.0,
    latitudeDelta: 6,
    longitudeDelta: 6,
  });

  // Zoom functions
  const zoomIn = () => {
    if (!mapViewRef.current) return;
    
    setRegion(prev => ({
      ...prev,
      latitudeDelta: prev.latitudeDelta / 2,
      longitudeDelta: prev.longitudeDelta / 2,
    }));
  };

  const zoomOut = () => {
    if (!mapViewRef.current) return;
    
    setRegion(prev => ({
      ...prev,
      latitudeDelta: Math.min(prev.latitudeDelta * 2, 20),
      longitudeDelta: Math.min(prev.longitudeDelta * 2, 20),
    }));
  };

  // Update region when user location changes
  useEffect(() => {
    if (userLocation && mapReady) {
      setRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      });
    }
  }, [userLocation, mapReady]);

  // Completely remount MapView when tab is focused
  useEffect(() => {
    if (isScreenFocused) {
      // Generate a new key for the MapView to force remount
      setKey(Date.now().toString());
      
      const timer = setTimeout(() => {
        setMounted(true);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setMounted(false);
      // Clear MapView reference when screen is unfocused
      if (mapViewRef.current) {
        // @ts-ignore - This is a workaround to help with memory issues
        mapViewRef.current = null;
      }
    }
  }, [isScreenFocused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setMounted(false);
      setMapReady(false);
      if (mapViewRef.current) {
        // @ts-ignore - This is a workaround to help with memory issues
        mapViewRef.current = null;
      }
    };
  }, []);

  if (!mounted || !isScreenFocused) {
    return (
      <View style={[styles.map, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (mapError) {
    return (
      <View style={[styles.map, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Map error: {mapError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapWrapper}>
      <MapView
        key={key}
        ref={mapViewRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        region={region}
        minZoomLevel={5}
        maxZoomLevel={18}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={!!userLocation}
        onRegionChangeComplete={setRegion}
      >
        {mapReady && !loadingBranches && branches.map((branch) => (
          <Marker
            key={branch.id}
            coordinate={{
              latitude: branch.latitude,
              longitude: branch.longitude,
            }}
            title={branch.name}
            description={branch.address || ''}
          >
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{branch.name}</Text>
                {branch.address && <Text style={styles.calloutText}>{branch.address}</Text>}
                {branch.type && <Text style={styles.calloutText}>Type: {branch.type}</Text>}
                <TouchableOpacity 
                  style={styles.directionsButton}
                  onPress={() => openDirections({
                    latitude: branch.latitude,
                    longitude: branch.longitude,
                    name: branch.name
                  })}
                >
                  <FontAwesome name="location-arrow" size={14} color="white" />
                  <Text style={styles.directionsButtonText}>Get Directions</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity 
          style={styles.zoomButton} 
          onPress={zoomIn}
          activeOpacity={0.7}
        >
          <FontAwesome name="plus" size={18} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.zoomButton} 
          onPress={zoomOut}
          activeOpacity={0.7}
        >
          <FontAwesome name="minus" size={18} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LocatorScreen() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Track screen focus state
  useFocusEffect(
    React.useCallback(() => {
      setIsFocused(true);
      
      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  // Separate effect for data fetching
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;

      const getPermissionsAndLocation = async () => {
        if (!isMounted) return;
        
        setLoadingLocation(true);
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setErrorMsg('Permission to access location was denied');
            return;
          }

          const location = await Location.getCurrentPositionAsync({});
          if (isMounted) {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        } catch (error) {
          if (isMounted) {
            setErrorMsg('Could not get your location');
            console.error('Location error:', error);
          }
        } finally {
          if (isMounted) {
            setLoadingLocation(false);
          }
        }
      };

      const fetchBranches = async () => {
        if (!isMounted) return;
        
        setLoadingBranches(true);
        try {
          const { data, error } = await supabase
            .from('branches')
            .select('*');

          if (error) throw error;
          if (isMounted) {
            setBranches(data || []);
          }
        } catch (error) {
          if (isMounted) {
            console.error('Error fetching branches:', error);
            Alert.alert('Error', 'Failed to load branch locations');
          }
        } finally {
          if (isMounted) {
            setLoadingBranches(false);
          }
        }
      };

      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        if (isMounted) {
          getPermissionsAndLocation();
          fetchBranches();
        }
      }, 300);

      return () => {
        isMounted = false;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Branch Locator' }} />
      
      {/* Status messaging */}
      {loadingLocation && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color="#0000ff" />
          <Text style={styles.statusText}>Getting your location...</Text>
        </View>
      )}
      
      {errorMsg ? (
        <View style={styles.statusContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}
      
      {/* Map container - wrap in conditional rendering to further isolate */}
      <View style={styles.mapContainer}>
        {isFocused && (
          <IsolatedMapView 
            branches={branches}
            loadingBranches={loadingBranches}
            userLocation={userLocation}
            errorMsg={errorMsg}
            isScreenFocused={isFocused}
          />
        )}
      </View>
      
      {/* Branch list or other UI below the map */}
      <View style={styles.listContainer}>
        <Text style={styles.heading}>Nearby Branches</Text>
        {loadingBranches ? (
          <ActivityIndicator size="small" color="#0000ff" />
        ) : branches.length === 0 ? (
          <Text>No branches found.</Text>
        ) : (
          branches.map(branch => (
            <View key={branch.id} style={styles.branchItem}>
              <View style={styles.branchInfo}>
                <Text style={styles.branchName}>{branch.name}</Text>
                <Text>{branch.address}</Text>
              </View>
              <TouchableOpacity 
                style={styles.listDirectionsButton}
                onPress={() => openDirections({
                  latitude: branch.latitude,
                  longitude: branch.longitude,
                  name: branch.name
                })}
              >
                <FontAwesome name="location-arrow" size={16} color="#1E88E5" />
                <Text style={styles.listDirectionsText}>Directions</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 2,
    overflow: 'hidden',
  },
  mapWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    backgroundColor: 'transparent',
  },
  zoomButton: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  callout: {
    width: 200,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  directionsButton: {
    marginTop: 6,
    backgroundColor: '#1E88E5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  branchItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontWeight: 'bold',
  },
  listDirectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  listDirectionsText: {
    marginLeft: 6,
    color: '#1E88E5',
    fontWeight: '500',
  },
  statusContainer: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    marginLeft: 8,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
}); 