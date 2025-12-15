#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// Only SSID is hardcoded — password entered via Serial
const char* ssid = "Jazz 4G MIFI_BB76";  // ✅ SSID visible
// ❌ Password NOT in code

const char* serverUrl = "https://monitor-webdashboard.vercel.app/api/sensor";

#define DHTPIN 38
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

float lastTemperature = 0;
float lastHumidity = 0;
const float CHANGE_THRESHOLD = 0.1;

unsigned long lastReadTime = 0;
const unsigned long readInterval = 2000;

bool sendToServer(float temperature, float humidity);
String readPasswordFromSerial();

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== ClimateCloud ESP32-S3 Starting ===");
  Serial.printf("SSID: %s\n", ssid);
  Serial.println("Enter Wi-Fi password and press Enter:");

  String password = readPasswordFromSerial();
  password.trim();

  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password.c_str());

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ Connected to WiFi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("API Endpoint: ");
  Serial.println(serverUrl);

  dht.begin();
  Serial.println("DHT22 sensor initialized");
}

String readPasswordFromSerial() {
  String input = "";
  while (input.length() == 0) {
    if (Serial.available()) {
      input = Serial.readStringUntil('\n');
    }
    delay(10);
  }
  return input;
}

bool sendToServer(float temperature, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return false;
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> jsonDoc;
  jsonDoc["temperature"] = round(temperature * 100) / 100.0;
  jsonDoc["humidity"] = round(humidity * 100) / 100.0;

  String jsonString;
  serializeJson(jsonDoc, jsonString);

  int httpCode = http.POST(jsonString);
  String response = http.getString();

  Serial.print("HTTP Response: ");
  Serial.println(httpCode);

  http.end();
  return (httpCode == 200 || httpCode == 201);
}

void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastReadTime >= readInterval) {
    lastReadTime = currentTime;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }

    Serial.printf("Temp: %.2f°C, Humidity: %.2f%%\n", temperature, humidity);

    bool changed = abs(temperature - lastTemperature) >= CHANGE_THRESHOLD ||
                   abs(humidity - lastHumidity) >= CHANGE_THRESHOLD ||
                   lastTemperature == 0;

    if (changed) {
      Serial.println("Change detected, sending to server...");
      if (sendToServer(temperature, humidity)) {
        lastTemperature = temperature;
        lastHumidity = humidity;
        Serial.println("✓ Sent successfully!");
      } else {
        Serial.println("✗ Failed to send data!");
      }
    }
    Serial.println("----------------------------");
  }
  delay(50);
}