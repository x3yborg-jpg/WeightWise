#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Wi-Fi credentials
#define WIFI_SSID "Unibotix2"
#define WIFI_PASSWORD "unibotix123"

// Firebase credentials
#define API_KEY "AIzaSyAq6mCs-qkD7IB3qQdwq074-O4RsvDU3xQ"
#define DATABASE_URL "https://loadcell-dashboard-default-rtdb.firebaseio.com/"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Firebase Serial Bridge Starting...");

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());

  // Configure Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Anonymous sign-up
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase sign-up success");
  } else {
    Serial.printf("Firebase sign-up failed: %s\n", config.signer.signupError.message.c_str());
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  static String serialLine = "";

  // Read characters until newline
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialLine.length() > 0) {
        processSerialLine(serialLine);
        serialLine = "";
      }
    } else {
      serialLine += c;
    }
  }
}

// Parse input "weight,level" from Serial and push to Firebase
void processSerialLine(const String& line) {
  int commaIndex = line.indexOf(',');
  if (commaIndex == -1) {
    Serial.println("Invalid format. Use: weight,level");
    return;
  }

  String weightStr = line.substring(0, commaIndex);
  String levelStr = line.substring(commaIndex + 1);

  float weight = weightStr.toFloat();
  int level = levelStr.toInt();

  FirebaseJson json;
  json.set("weight", weight);
  json.set("level", level);

  // Use setJSON to update entire node or updateNode to merge (choose one)

  // Option 1: Overwrite the /loadcell node
  if (Firebase.RTDB.setJSON(&fbdo, "/loadcell", &json)) {
    Serial.printf("Sent to Firebase: weight = %.2f, level = %d\n", weight, level);
  } else {
    Serial.print("Firebase error: ");
    Serial.println(fbdo.errorReason());
  }

  /*  
  // Option 2: Partial update (uncomment if preferred)
  if (Firebase.RTDB.updateNode(&fbdo, "/loadcell", &json)) {
    Serial.printf("Sent to Firebase (partial update): weight = %.2f, level = %d\n", weight, level);
  } else {
    Serial.print("Firebase error: ");
    Serial.println(fbdo.errorReason());
  }
  */
}
