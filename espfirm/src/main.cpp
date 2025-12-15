#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// === CONFIGURATION ===
const char* ssid = "HUAWEI Baig";  //  REPLACE WITH YOUR ESP32'S WIFI NAME (NO PASSWORD)
const char* password = "cd6c696d";
const char* serverUrl = "https://monitor-dashboard-newf.vercel.app/api/sensor";

#define DHTPIN 38
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// Change detection
float lastTemperature = 0;
float lastHumidity = 0;
const float CHANGE_THRESHOLD = 0.1;

unsigned long lastReadTime = 0;
const unsigned long readInterval = 2000; // Read every 2 seconds

// === FUNCTION DECLARATIONS ===
bool sendToServer(float temperature, float humidity);

void setup() {
  // Initialize serial with delay for USB stability (ESP32-S3)
  Serial.begin(115200);
  delay(1000); // Wait for USB enumeration

  Serial.println("\n\n=== ClimateCloud ESP32-S3 Starting ===");
  Serial.printf("Connecting to open Wi-Fi: %s\n", ssid);

  // Connect to OPEN Wi-Fi (empty password)
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() > 10000) {
      Serial.println("\n❌ Wi-Fi connection timeout!");
      break;
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Wi-Fi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("⚠️ Continuing without Wi-Fi...");
  }

  // Initialize sensor
  dht.begin();
  Serial.println("DHT22 sensor initialized");
  Serial.print("Vercel Endpoint: ");
  Serial.println(serverUrl);
  Serial.println("----------------------------");
}

bool sendToServer(float temperature, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Wi-Fi not connected – skipping send");
    return false;
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  // Build minimal JSON payload (matches your Supabase table)
  StaticJsonDocument<128> jsonDoc;
  jsonDoc["temperature"] = round(temperature * 100) / 100.0;
  jsonDoc["humidity"] = round(humidity * 100) / 100.0;

  String jsonString;
  serializeJson(jsonDoc, jsonString);

  Serial.print("📤 Sending: ");
  Serial.println(jsonString);

  int httpCode = http.POST(jsonString);
  String response = http.getString();
  http.end();

  if (httpCode == 200 || httpCode == 201) {
    Serial.println("✅ Success!");
    return true;
  } else {
    Serial.printf("❌ HTTP %d: %s\n", httpCode, response.c_str());
    return false;
  }
}

void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastReadTime >= readInterval) {
    lastReadTime = currentTime;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("⚠️ DHT22 read failed – skipping");
      return;
    }

    // Display current readings
    Serial.printf("🌡️ Temp: %.2f°C | 💧 Humidity: %.2f%%\n", temperature, humidity);

    // Check for significant change
    bool tempChanged = abs(temperature - lastTemperature) >= CHANGE_THRESHOLD;
    bool humidChanged = abs(humidity - lastHumidity) >= CHANGE_THRESHOLD;
    bool isFirstRead = (lastTemperature == 0 && lastHumidity == 0);

    if (tempChanged || humidChanged || isFirstRead) {
      Serial.println("🔔 Change detected – sending to server...");
      if (sendToServer(temperature, humidity)) {
        lastTemperature = temperature;
        lastHumidity = humidity;
      }
    } else {
      Serial.println("⏩ No significant change – skipping send");
    }

    Serial.println("----------------------------");
  }

  delay(50);
}