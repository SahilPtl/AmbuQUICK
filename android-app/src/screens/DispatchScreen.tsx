import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Appbar, Card, TextInput, Button, Switch, List } from 'react-native-paper';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';

export default function DispatchScreen() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [journeyActive, setJourneyActive] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [mapRegion, setMapRegion] = useState(null);
  const [showHospitalList, setShowHospitalList] = useState(false);
  
  // Mock hospital data
  const nearbyHospitals = [
    { id: 1, name: 'Memorial Hospital', distance: 2.4, address: '123 Healthcare Ave' },
    { id: 2, name: 'City Medical Center', distance: 3.7, address: '456 Medical Blvd' },
    { id: 3, name: 'Community Hospital', distance: 5.2, address: '789 Wellness St' },
  ];
  
  // Get user's location
  useEffect(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      },
      (error) => console.error('Error getting location:', error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);
  
  const startJourney = () => {
    if (!pickupAddress || !hospitalAddress) {
      alert('Please provide both pickup and hospital addresses');
      return;
    }
    setJourneyActive(true);
  };
  
  const endJourney = () => {
    setJourneyActive(false);
    setPickupAddress('');
    setHospitalAddress('');
  };
  
  const selectHospital = (hospital) => {
    setHospitalAddress(`${hospital.name} - ${hospital.address}`);
    setShowHospitalList(false);
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="AmbuFree" subtitle="Dispatch Console" />
      </Appbar.Header>
      
      <View style={styles.contentContainer}>
        {/* Map section */}
        <View style={styles.mapSection}>
          {mapRegion && (
            <MapView
              style={styles.map}
              region={mapRegion}
            >
              {currentLocation && (
                <Marker
                  coordinate={currentLocation}
                  title="Your Location"
                />
              )}
            </MapView>
          )}
          
          {journeyActive && (
            <View style={styles.alertControls}>
              <Text style={styles.alertStatusText}>
                Alert Status: {alertsEnabled ? 'Active' : 'Paused'}
              </Text>
              <View style={styles.switchRow}>
                <Text>Send Alerts</Text>
                <Switch
                  value={alertsEnabled}
                  onValueChange={setAlertsEnabled}
                  color="#E53935"
                />
              </View>
            </View>
          )}
        </View>
        
        {/* Journey setup section */}
        <ScrollView style={styles.controlsSection}>
          <Card style={styles.card}>
            <Card.Title 
              title={journeyActive ? "Active Journey" : "Journey Setup"} 
              subtitle={journeyActive ? "Monitor progress" : "Enter route details"}
            />
            <Card.Content>
              {!journeyActive ? (
                <>
                  <TextInput
                    label="Patient Pickup Address"
                    value={pickupAddress}
                    onChangeText={setPickupAddress}
                    style={styles.input}
                    mode="outlined"
                  />
                  
                  <TextInput
                    label="Destination Hospital"
                    value={hospitalAddress}
                    onChangeText={setHospitalAddress}
                    style={styles.input}
                    mode="outlined"
                    right={
                      <TextInput.Icon 
                        name="magnify" 
                        onPress={() => setShowHospitalList(true)} 
                      />
                    }
                  />
                  
                  {showHospitalList && (
                    <Card style={styles.hospitalsCard}>
                      <Card.Title title="Nearby Hospitals" />
                      <Card.Content>
                        {nearbyHospitals.map((hospital) => (
                          <List.Item
                            key={hospital.id}
                            title={hospital.name}
                            description={hospital.address}
                            right={props => <Text>{hospital.distance} km</Text>}
                            onPress={() => selectHospital(hospital)}
                            style={styles.hospitalItem}
                          />
                        ))}
                      </Card.Content>
                    </Card>
                  )}
                </>
              ) : (
                <>
                  <List.Item
                    title="Pickup"
                    description={pickupAddress}
                    left={props => <List.Icon {...props} icon="map-marker" />}
                  />
                  <List.Item
                    title="Destination"
                    description={hospitalAddress}
                    left={props => <List.Icon {...props} icon="hospital-building" />}
                  />
                  <View style={styles.journeyStats}>
                    <Text style={styles.statLabel}>Estimated Time:</Text>
                    <Text style={styles.statValue}>14 min</Text>
                    <Text style={styles.statLabel}>Distance:</Text>
                    <Text style={styles.statValue}>5.2 km</Text>
                  </View>
                </>
              )}
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              {!journeyActive ? (
                <Button 
                  mode="contained" 
                  onPress={startJourney}
                  disabled={!pickupAddress || !hospitalAddress}
                >
                  Start Journey
                </Button>
              ) : (
                <Button 
                  mode="contained" 
                  onPress={endJourney}
                  style={styles.endButton}
                >
                  End Journey
                </Button>
              )}
            </Card.Actions>
          </Card>
          
          {journeyActive && (
            <Card style={[styles.card, styles.emergencyCard]}>
              <Card.Title title="Emergency Controls" />
              <Card.Content>
                <Button mode="outlined" style={styles.emergencyButton}>
                  Send Emergency Override
                </Button>
                <Button mode="outlined" style={[styles.emergencyButton, styles.priorityButton]}>
                  Request Traffic Light Priority
                </Button>
              </Card.Content>
            </Card>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  mapSection: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsSection: {
    flex: 1,
    padding: 10,
  },
  card: {
    marginBottom: 10,
  },
  input: {
    marginBottom: 15,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingRight: 10,
    paddingBottom: 10,
  },
  alertControls: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    elevation: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  alertStatusText: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  hospitalsCard: {
    marginVertical: 10,
  },
  hospitalItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  journeyStats: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  statLabel: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  statValue: {
    marginBottom: 10,
  },
  endButton: {
    backgroundColor: '#f44336',
  },
  emergencyCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#FFC107',
  },
  emergencyButton: {
    marginBottom: 10,
    borderColor: '#FFC107',
  },
  priorityButton: {
    borderColor: '#2196F3',
  },
});
