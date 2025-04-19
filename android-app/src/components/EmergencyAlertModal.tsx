import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Vibration,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Sound from 'react-native-sound';

// Import responsive dimensions for different screen sizes
const { width, height } = Dimensions.get('window');

// Define types for our emergency alert
interface EmergencyAlertModalProps {
  isVisible: boolean;
  onClose: () => void;
  ambulanceInfo: {
    id: string;
    distance: number; // in meters
    eta: number; // in seconds
  } | null;
}

const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({
  isVisible,
  onClose,
  ambulanceInfo,
}) => {
  // Play alert sound when modal opens
  useEffect(() => {
    let alertSound: Sound | null = null;
    
    if (isVisible && ambulanceInfo) {
      // Vibrate in emergency pattern
      if (Platform.OS === 'android') {
        // Create an SOS-like vibration pattern - short, short, short, long, long, long, short, short, short
        const pattern = [0, 300, 200, 300, 200, 300, 200, 800, 200, 800, 200, 800, 200, 300, 200, 300, 200, 300];
        Vibration.vibrate(pattern, false);
      } else {
        // iOS has limited vibration control, just use what's available
        Vibration.vibrate();
      }
      
      // Initialize sound
      Sound.setCategory('Playback');
      
      // Use bundled sound file
      alertSound = new Sound('emergency_alert.mp3', Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.error('Failed to load the sound', error);
          return;
        }
        
        // Set volume and play
        alertSound?.setVolume(1.0);
        alertSound?.play((success) => {
          if (!success) {
            console.error('Sound playback failed');
          }
        });
        
        // Loop the sound
        alertSound?.setNumberOfLoops(-1); // -1 means infinite loop
      });
    }
    
    // Cleanup sound and vibration when modal is closed
    return () => {
      if (alertSound) {
        alertSound.stop();
        alertSound.release();
      }
      Vibration.cancel();
    };
  }, [isVisible, ambulanceInfo]);
  
  // Don't render anything if not visible or no ambulance info
  if (!isVisible || !ambulanceInfo) {
    return null;
  }
  
  // Format distance for display
  const formattedDistance = (ambulanceInfo.distance >= 1000)
    ? `${(ambulanceInfo.distance / 1000).toFixed(1)} km`
    : `${Math.round(ambulanceInfo.distance)} m`;
  
  // Format ETA for display
  const formatEta = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)} seconds`;
    } else {
      return `${Math.floor(seconds / 60)} min ${Math.ceil(seconds % 60)} sec`;
    }
  };
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Red header with warning icons */}
          <View style={styles.modalHeader}>
            <Icon name="warning" size={24} color="white" style={styles.warningIcon} />
            <Text style={styles.headerText}>EMERGENCY ALERT</Text>
            <Icon name="warning" size={24} color="white" style={styles.warningIcon} />
          </View>
          
          {/* Alert content */}
          <View style={styles.modalContent}>
            <Icon name="warning" size={64} color="#dc2626" />
            
            <Text style={styles.alertTitle}>Ambulance Alert</Text>
            
            <Text style={styles.alertMessage}>
              An emergency vehicle is approaching your location.
            </Text>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Distance: {formattedDistance}</Text>
              <Text style={styles.infoText}>ETA: {formatEta(ambulanceInfo.eta)}</Text>
            </View>
            
            <Text style={styles.warningText}>
              Please make way for emergency vehicles.
            </Text>
          </View>
          
          {/* Footer with action button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.acknowledgeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>ACKNOWLEDGE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 350,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#dc2626',
    ...Platform.select({
      android: {
        elevation: 5,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
    }),
  },
  modalHeader: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 8,
    letterSpacing: 1,
  },
  warningIcon: {
    marginHorizontal: 4,
  },
  modalContent: {
    backgroundColor: '#fef2f2',
    padding: 16,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#b91c1c',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  alertMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    color: '#111827',
  },
  infoBox: {
    backgroundColor: '#fef08a',
    padding: 12,
    width: '100%',
    borderRadius: 4,
    marginVertical: 12,
  },
  infoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#b91c1c',
    textAlign: 'center',
    marginTop: 8,
  },
  modalFooter: {
    backgroundColor: 'white',
    padding: 16,
    alignItems: 'center',
  },
  acknowledgeButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EmergencyAlertModal;