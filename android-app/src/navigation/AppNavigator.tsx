import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import UserTypeSelectionScreen from '../screens/UserTypeSelectionScreen';
import CarUserScreen from '../screens/CarUserScreen';
import DispatchScreen from '../screens/DispatchScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Define Stack Navigator params
type RootStackParamList = {
  UserTypeSelection: undefined;
  Main: undefined;
};

// Define Tab Navigator params
type MainTabParamList = {
  CarUser: undefined;
  Dispatch: undefined;
  Profile: undefined;
};

// Create navigators
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator
function MainNavigator() {
  const navigation = useNavigation();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#e53935',
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          backgroundColor: '#ffffff',
          elevation: 10,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#e53935',
          elevation: 0, // for Android
          shadowOpacity: 0, // for iOS
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => (
          <TouchableOpacity
            style={{ marginRight: 16 }}
            onPress={() => navigation.navigate('Profile' as never)}
          >
            <Icon name="account-circle" size={24} color="white" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tab.Screen
        name="CarUser"
        component={CarUserScreen}
        options={{
          title: 'Car User',
          tabBarIcon: ({ color, size }) => (
            <Icon name="directions-car" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Dispatch"
        component={DispatchScreen}
        options={{
          title: 'Dispatch',
          tabBarIcon: ({ color, size }) => (
            <Icon name="location-on" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  
  // Check if this is the first launch
  useEffect(() => {
    AsyncStorage.getItem('hasLaunchedBefore')
      .then((value) => {
        if (value === null) {
          AsyncStorage.setItem('hasLaunchedBefore', 'true');
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      })
      .catch(() => setIsFirstLaunch(false));
  }, []);
  
  // Show loading while checking first launch status
  if (isFirstLaunch === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }
  
  return (
    <Stack.Navigator
      initialRouteName={isFirstLaunch ? 'UserTypeSelection' : 'Main'}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="UserTypeSelection" component={UserTypeSelectionScreen} />
      <Stack.Screen name="Main" component={MainNavigator} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});