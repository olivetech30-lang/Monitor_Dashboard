#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// === CONFIGURATION ===
const char* ssid = "HUAWEI Baig";
const char* password = "cd6c696d";
const char* serverUrl = "https://monitor-dashboard-newf.vercel.app/api/sensor"; // ← Removed trailing spaces!

#define DHTPIN 38
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

float lastTemperature = 0;
float lastHumidity = 0;
const float CHANGE_THRESHOLD = 0.1;

unsigned long lastReadTime = 0;
const unsigned long readInterval = 2000;

// === SINGLE, CORRECT sendToServer FUNCTION ===
bool sendToServer(float temperature, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Wi-Fi not connected – skipping send");
    return false;
  }

  // Build JSON
  StaticJsonDocument<128> jsonDoc;
  jsonDoc["temperature"] = round(temperature * 100) / 100.0;
  jsonDoc["humidity"] = round(humidity * 100) / 100.0;

  String jsonString;
  serializeJson(jsonDoc, jsonString);

  // 🔥 CRITICAL: Clean the JSON string
  jsonString.trim();
  while (jsonString.endsWith("\0")) {
    jsonString = jsonString.substring(0, jsonString.length() - 1);
  }

  Serial.print("📤 Sending JSON (len=");
  Serial.print(jsonString.length());
  Serial.print("): ");
  Serial.println(jsonString);

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Content-Length", String(jsonString.length())); // ← Essential

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

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== ClimateCloud ESP32-S3 Starting ===");
  
  WiFi.begin(ssid, password);
  Serial.printf("Connecting to Wi-Fi: %s\n", ssid);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() > 10000) {
      Serial.println("\n❌ Wi-Fi timeout!");
      break;
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Wi-Fi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  }

  dht.begin();
  Serial.println("DHT22 initialized");
  Serial.print("Endpoint: ");
  Serial.println(serverUrl);
  Serial.println("----------------------------");
}

void loop() {
  unsigned long currentTime = millis();
  if (currentTime - lastReadTime >= readInterval) {
    lastReadTime = currentTime;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("⚠️ DHT22 read failed");
      return;
    }

    Serial.printf("🌡️ Temp: %.2f°C | 💧 Humidity: %.2f%%\n", temperature, humidity);

    bool changed = abs(temperature - lastTemperature) >= CHANGE_THRESHOLD ||
                   abs(humidity - lastHumidity) >= CHANGE_THRESHOLD ||
                   (lastTemperature == 0 && lastHumidity == 0);

    if (changed) {
      Serial.println("🔔 Change detected – sending...");
      if (sendToServer(temperature, humidity)) {
        lastTemperature = temperature;
        lastHumidity = humidity;
      }
    } else {
      Serial.println("⏩ No significant change");
    }
    Serial.println("----------------------------");
  }
  delay(50);
}