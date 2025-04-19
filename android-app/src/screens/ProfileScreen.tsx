import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, Avatar, List, Divider, Button, Surface, Text } from 'react-native-paper';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="AmbuFree" subtitle="Profile" />
      </Appbar.Header>
      
      <ScrollView>
        <Surface style={styles.header}>
          <Avatar.Text size={80} label="JD" style={styles.avatar} />
          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.email}>john.doe@example.com</Text>
          <View style={styles.badgeContainer}>
            <Surface style={styles.badge}>
              <Text style={styles.badgeText}>Car Driver</Text>
            </Surface>
          </View>
        </Surface>
        
        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <List.Item
            title="Personal Information"
            left={props => <List.Icon {...props} icon="account" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Vehicles"
            description="Manage your registered vehicles"
            left={props => <List.Icon {...props} icon="car" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Notification Settings"
            left={props => <List.Icon {...props} icon="bell" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
        </List.Section>
        
        <List.Section>
          <List.Subheader>App</List.Subheader>
          <List.Item
            title="Appearance"
            description="Dark mode and theme settings"
            left={props => <List.Icon {...props} icon="brightness-6" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Privacy Settings"
            left={props => <List.Icon {...props} icon="shield-account" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="About AmbuFree"
            description="Version 1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
        </List.Section>
        
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            style={styles.button}
            icon="logout"
          >
            Sign Out
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    elevation: 1,
  },
  avatar: {
    backgroundColor: '#e53935',
    marginBottom: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  email: {
    color: '#666',
    marginBottom: 10,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  badge: {
    backgroundColor: '#e5393522',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#e53935',
    fontWeight: 'bold',
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    marginVertical: 10,
    borderColor: '#e53935',
    borderWidth: 1,
  },
});
