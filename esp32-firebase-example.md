
# ESP32 Code for Firebase Realtime Database

This example code is for an ESP32 microcontroller to read data from a load cell (simulated) and an ultrasonic sensor (simulated), and then push that data to the root of a Firebase Realtime Database. The maximum weight is considered to be 10kg.

## Prerequisites

1.  **Hardware**: ESP32 Development Board.
2.  **Software**: Arduino IDE with the ESP32 board support installed.
3.  **Arduino Library**: `Firebase-ESP-Client` by Mobizt. You can install this from the Arduino IDE's Library Manager.

## Arduino Code

```cpp
#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// --- WIFI CREDENTIALS ---
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// --- FIREBASE PROJECT CONFIG ---
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL "YOUR_FIREBASE_DATABASE_URL" 

// --- SENSOR SIMULATION ---
// Replace these with your actual sensor reading functions

// Simulates a weight reading from a load cell, up to 10000g (10kg)
float getSimulatedWeight() {
  return random(500, 10000); 
}

// Simulates a level reading from an ultrasonic sensor.
// You would replace this with logic to convert distance to a percentage.
// For example: `level = map(distance, min_dist, max_dist, 100, 0);`
int getSimulatedLevel() {
  return random(0, 100);
}

// --- FIREBASE OBJECTS ---
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// --- STATE VARIABLES ---
unsigned long sendDataPrevMillis = 0;
bool isConnected = false;

// Function Prototypes
void updateConnectionStatus(bool status);
void sendSensorData();


void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("Starting ESP32 Firebase Demo...");

  // --- CONNECT TO WIFI ---
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();

  // --- INITIALIZE FIREBASE ---
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Sign up anonymously
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase sign-up success");
  } else {
    Serial.printf("Firebase sign-up failed: %s\n", config.signer.signupError.message.c_str());
  }
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  // Check Wi-Fi connection status
  bool currentWifiStatus = (WiFi.status() == WL_CONNECTED);

  // If connection status changes, update Firebase
  if (currentWifiStatus != isConnected) {
    isConnected = currentWifiStatus;
    updateConnectionStatus(isConnected);
  }

  // Send sensor data every 5 seconds if connected
  if (isConnected && millis() - sendDataPrevMillis > 5000) {
    sendDataPrevMillis = millis();
    sendSensorData();
  }
}

void updateConnectionStatus(bool status) {
  FirebaseJson json;
  json.set("isConnected", status);
  
  // Also update timestamp to show last connection time
  json.set("timestamp/.sv", "timestamp"); 

  Serial.printf("Updating connection status to: %s\n", status ? "Online" : "Offline");
  
  // Update only the isConnected and timestamp fields at the root
  if (Firebase.updateNode(fbdo, "/", json)) {
    Serial.println("Connection status updated successfully.");
  } else {
    Serial.println("Failed to update connection status.");
    Serial.println("REASON: " + fbdo.errorReason());
  }
}

void sendSensorData() {
  float weight = getSimulatedWeight();
  int level = getSimulatedLevel();

  Serial.printf("Sending data: Weight = %.2fg, Level = %d%%\n", weight, level);

  // Create a JSON object to send
  FirebaseJson json;
  json.set("weight", weight);
  json.set("level", level);
  json.set("timestamp/.sv", "timestamp"); // Use server value for timestamp
  json.set("isConnected", true);

  // Update the root node in Firebase
  if (Firebase.updateNode(fbdo, "/", json)) {
    Serial.println("Data sent successfully.");
  } else {
    Serial.println("Failed to send data.");
    Serial.println("REASON: " + fbdo.errorReason());
  }
}
```

### How to Use

1.  **Copy the code** into a new sketch in your Arduino IDE.
2.  **Replace the placeholders**:
    *   `YOUR_WIFI_SSID` and `YOUR_WIFI_PASSWORD` with your network credentials.
    *   `YOUR_FIREBASE_API_KEY` and `YOUR_FIREBASE_DATABASE_URL` with the credentials from your Firebase project.
3.  **Implement your sensor logic**: Replace the `getSimulatedWeight()` and `getSimulatedLevel()` functions with your actual sensor reading code.
4.  **Upload the code** to your ESP32.
5.  **Open the Serial Monitor** at a baud rate of `115200` to see the log messages.

The ESP32 will now push sensor data to the root of your Firebase Realtime Database every 5 seconds.
