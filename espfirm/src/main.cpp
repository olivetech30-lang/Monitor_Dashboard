#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <ArduinoJson.h>

// === CONFIGURATION ===
const char* ssid = "HUAWEI Baig";
const char* password = "cd6c696d";
const char* serverUrl = "https://monitor-dashboard-newf.vercel.app/api/sensor"; // NO TRAILING SPACES!

#define DHTPIN 38
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

float lastTemperature = 0;
float lastHumidity = 0;
const float CHANGE_THRESHOLD = 0.1;

unsigned long lastReadTime = 0;
const unsigned long readInterval = 2000;

// === SEND TO VERCEL ===
bool sendToServer(float temperature, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Wi-Fi not connected");
    return false;
  }

  StaticJsonDocument<128> jsonDoc;
  jsonDoc["temperature"] = round(temperature * 100) / 100.0;
  jsonDoc["humidity"] = round(humidity * 100) / 100.0;

  String jsonString;
  serializeJson(jsonDoc, jsonString);
  jsonString.trim(); // Critical: remove hidden chars

  Serial.print("📤 Sending: ");
  Serial.println(jsonString);

  // Use secure client with relaxed TLS (for Vercel)
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, serverUrl)) {
    Serial.println("❌ HTTP begin failed");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Content-Length", String(jsonString.length()));

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

// === SETUP ===
void setup() {
  Serial.begin(115200);
  delay(1000); // USB stability for ESP32-S3

  Serial.println("\n\n=== ClimateCloud ESP32-S3 Starting ===");
  WiFi.begin(ssid, password);
  Serial.printf("Connecting to Wi-Fi: %s\n", ssid);

  uint32_t timeout = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - timeout > 10000) {
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
  Serial.print("Vercel Endpoint: ");
  Serial.println(serverUrl);
  Serial.println("----------------------------");
}

// === LOOP ===
void loop() {
  unsigned long now = millis();
  if (now - lastReadTime >= readInterval) {
    lastReadTime = now;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t)) {
      Serial.println("⚠️ DHT22 read failed");
      return;
    }

    Serial.printf("🌡️ Temp: %.2f°C | 💧 Humidity: %.2f%%\n", t, h);

    bool changed = (abs(t - lastTemperature) >= CHANGE_THRESHOLD) ||
                   (abs(h - lastHumidity) >= CHANGE_THRESHOLD) ||
                   (lastTemperature == 0 && lastHumidity == 0);

    if (changed) {
      Serial.println("🔔 Change detected – sending...");
      if (sendToServer(t, h)) {
        lastTemperature = t;
        lastHumidity = h;
      }
    } else {
      Serial.println("⏩ No significant change");
    }
    Serial.println("----------------------------");
  }
  delay(50);
}