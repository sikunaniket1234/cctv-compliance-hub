#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>   // Install via Library Manager: "ArduinoJson" by Benoit Blanchon

// Wi-Fi Configuration
const char* WIFI_SSID     = "Anayak 4G";
const char* WIFI_PASSWORD = "Anikety@1234";

// Backend API Configuration
// 1. For direct local testing on the same Wi-Fi:
const char* SERVER_URL    = "http://192.168.29.176:4000/api/heartbeat";
// 2. For remote/public testing (using ngrok):
// const char* SERVER_URL    = "https://xxxx.ngrok-free.app/api/heartbeat";
const char* AUTH_TOKEN    = "my-secret-123";

// Heartbeat Interval: 60 seconds (60000 ms)
const unsigned long INTERVAL_MS = 60000;
unsigned long lastSentAt = 0;

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected successfully!");
    Serial.print("Local IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect. Will retry during next heartbeat.");
  }
}

void sendHeartbeat() {
  // If not connected, attempt connection
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Skipping heartbeat, no Wi-Fi connection.");
    return;
  }

  // Construct the JSON Payload
  StaticJsonDocument<256> doc;
  doc["message"]   = "hello";
  doc["device_id"] = "BaneswarOldAgeHome"; // Must match "heartbeat_id" in Locations database
  doc["local_ip"]  = WiFi.localIP().toString();
  doc["uptime_s"]  = millis() / 1000;

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(SERVER_URL);
  
  // Set headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Token", AUTH_TOKEN);

  Serial.println("Sending heartbeat POST request...");
  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("Response Code: %d\n", httpCode);
    Serial.printf("Response Body: %s\n", response.c_str());
  } else {
    Serial.printf("Error on sending POST: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("Initializing ESP32 CCTV Dynamic IP Heartbeat...");
  connectWiFi();
  sendHeartbeat();
  lastSentAt = millis();
}

void loop() {
  // Handle millis() roll-over safely
  if (millis() - lastSentAt >= INTERVAL_MS) {
    sendHeartbeat();
    lastSentAt = millis();
  }
}
