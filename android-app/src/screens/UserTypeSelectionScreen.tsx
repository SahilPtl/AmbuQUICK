import React from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { Button } from 'react-native-paper';

export default function UserTypeSelectionScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>AmbuFree</Text>
        <Text style={styles.subtitle}>Emergency Response Coordination</Text>
        
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>+</Text>
          </View>
        </View>
        
        <Text style={styles.question}>How would you like to use the app?</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            style={styles.button}
            contentStyle={styles.buttonContent}
            onPress={() => navigation.navigate('Main', { screen: 'CarUser' })}
          >
            I'm a Car User
          </Button>
          
          <Button
            mode="contained"
            style={[styles.button, styles.dispatchButton]}
            contentStyle={styles.buttonContent}
            onPress={() => navigation.navigate('Main', { screen: 'Dispatch' })}
          >
            I'm a Dispatcher
          </Button>
        </View>
      </View>
      
      <Text style={styles.footer}>Version 1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e53935',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 80,
    color: '#fff',
    fontWeight: 'bold',
  },
  question: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    marginBottom: 15,
    borderRadius: 8,
  },
  buttonContent: {
    height: 50,
  },
  dispatchButton: {
    backgroundColor: '#1976D2',
  },
  footer: {
    textAlign: 'center',
    color: '#999',
    paddingBottom: 20,
  },
});
