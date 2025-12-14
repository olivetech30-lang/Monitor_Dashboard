#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// WiFi Credentials
const char* ssid = "HUAWEI Baig";
const char* password = "cd6c696d";

// Vercel API Endpoint
const char* serverUrl = "https://monitor-webdashboard.vercel.app/api/sensor";
// DHT Sensor Setup
#define DHTPIN 38
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// Variables for change detection
float lastTemperature = 0;
float lastHumidity = 0;
const float CHANGE_THRESHOLD = 0.1;

unsigned long lastReadTime = 0;
const unsigned long readInterval = 2000;

// === FUNCTION DECLARATION (ADD THIS BEFORE setup()) ===
bool sendToServer(float temperature, float humidity);

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== ClimateCloud ESP32-S3 Starting ===");
  
  // Initialize DHT sensor
  dht.begin();
  Serial.println("DHT22 sensor initialized");
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nConnected to WiFi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

// === FUNCTION DEFINITION (CAN BE AFTER setup()) ===
bool sendToServer(float temperature, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return false;
  }
  
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload - ONLY columns that exist in your table
  StaticJsonDocument<200> jsonDoc;
  jsonDoc["temperature"] = round(temperature * 100) / 100.0;  // 2 decimals
  jsonDoc["humidity"] = round(humidity * 100) / 100.0;        // 2 decimals
  jsonDoc["sensor_id"] = "00000000-0000-0000-0000-000000000001";
  
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  
  Serial.print("Sending JSON: ");
  Serial.println(jsonString);
  
  int httpCode = http.POST(jsonString);
  String response = http.getString();
  
  Serial.print("HTTP Response code: ");
  Serial.println(httpCode);
  Serial.print("Response: ");
  Serial.println(response);
  
  http.end();
  
  return (httpCode == 200);
}

void loop() {
  unsigned long currentTime = millis();
  
  // Read sensor every readInterval
  if (currentTime - lastReadTime >= readInterval) {
    lastReadTime = currentTime;
    
    // Read temperature and humidity
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    
    // Check if readings are valid
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }
    
    // Round to 2 decimal places
    temperature = round(temperature * 100) / 100.0;
    humidity = round(humidity * 100) / 100.0;
    
    Serial.printf("Sensor Readings - Temp: %.2f°C, Humidity: %.2f%%\n", temperature, humidity);
    
    // Check if values have changed significantly
    bool tempChanged = abs(temperature - lastTemperature) >= CHANGE_THRESHOLD;
    bool humidityChanged = abs(humidity - lastHumidity) >= CHANGE_THRESHOLD;
    
    if (tempChanged || humidityChanged || lastTemperature == 0) {
      Serial.println("Values changed significantly, sending to server...");
      
      if (sendToServer(temperature, humidity)) {
        lastTemperature = temperature;
        lastHumidity = humidity;
        Serial.println("Data sent successfully!");
      } else {
        Serial.println("Failed to send data!");
      }
    } else {
      Serial.println("No significant change, skipping send.");
    }
  }
}