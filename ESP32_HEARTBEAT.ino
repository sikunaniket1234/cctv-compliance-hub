#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>   // Install via Library Manager: "ArduinoJson" by Benoit Blanchon

// Wi-Fi Configuration
const char* WIFI_SSID     = "ANayak4G";
const char* WIFI_PASSWORD = "Aniket@1234";

// Backend API Configuration
// 1. For direct local testing on the same Wi-Fi:
// const char* SERVER_URL    = "http://192.168.29.176:4000/api/heartbeat";
// 2. For remote/public testing (using serveo):
const char* SERVER_URL    = "https://88b61d8f4a1cf58d-49-37-116-218.serveousercontent.com/api/heartbeat";
const char* AUTH_TOKEN    = "my-secret-123";

// Heartbeat Interval: 60 seconds (60000 ms)
const unsigned long INTERVAL_MS = 60000;
unsigned long lastSentAt = 0;

String getIPv6Prefix() {
  for (int i = 0; i < 3; i++) {
    IPv6Address addr = WiFi.localIPv6(i);
    String addrStr = addr.toString();
    if (addrStr.length() > 0 && (addrStr.charAt(0) == '2' || addrStr.charAt(0) == '3')) {
      int colonCount = 0;
      int prefixEndIdx = 0;
      for (int j = 0; j < addrStr.length(); j++) {
        if (addrStr.charAt(j) == ':') {
          colonCount++;
          if (colonCount == 4) {
            prefixEndIdx = j;
            break;
          }
        }
      }
      if (prefixEndIdx > 0) {
        return addrStr.substring(0, prefixEndIdx) + "::";
      }
    }
  }
  return "";
}

void connectWiFi() {
  Serial.println("\nInitializing WiFi...");
  WiFi.disconnect(true); // Reset connection state
  delay(1000);
  WiFi.mode(WIFI_STA);   // Set mode to station (client)
  WiFi.enableIPv6();     // Enable IPv6 stack
  
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) { // Increased to 30 attempts (15 seconds)
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected successfully!");
    Serial.print("Local IPv4 Address: ");
    Serial.println(WiFi.localIP());
    
    // Wait up to 5 seconds for global IPv6 address assignment
    int v6Attempts = 0;
    while (getIPv6Prefix() == "" && v6Attempts < 10) {
      delay(500);
      v6Attempts++;
    }
    
    String prefix = getIPv6Prefix();
    if (prefix != "") {
      Serial.print("Detected Global IPv6 Prefix: ");
      Serial.println(prefix);
    } else {
      Serial.println("No Global IPv6 address assigned by router yet.");
    }
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

  String prefix = getIPv6Prefix();
  if (prefix != "") {
    doc["ipv6_prefix"] = prefix;
  }

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
