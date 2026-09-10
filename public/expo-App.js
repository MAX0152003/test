// ClassPulse Expo Go Mobile Container Wrapper
// Mindanao State University Attendance & Schedule System
import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, BackHandler, ActivityIndicator, View, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';

const CLASSPULSE_URL = 'https://ais-dev-tjcf7l4yw3y22z275uwnes-956857929926.asia-southeast1.run.app';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }
  }, [canGoBack]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <WebView
        ref={webViewRef}
        source={{ uri: CLASSPULSE_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Loading ClassPulse MSU Container...</Text>
          </View>
        )}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        camera={true}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        userAgent="Mozilla/5.0 (Linux; Android 14; ClassPulse MSU Native Mobile Container) AppleWebKit/537.36"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  webview: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#10b981',
    marginTop: 12,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
