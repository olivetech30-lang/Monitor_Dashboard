#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

#define DHT_PIN 38
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "https://YOUR_VERCEL_APP.vercel.app/api/sensor";  // Replace with deployed URL

float lastTemp = -999, lastHumid = -999;

void setup() {
    Serial.begin(115200);
    dht.begin();
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi...");
    }
    Serial.println("WiFi connected");
}

void loop() {
    float temp = dht.readTemperature();
    float humid = dht.readHumidity();
    
    if (isnan(temp) || isnan(humid)) {
        Serial.println("Failed to read from DHT");
        delay(2000);
        return;
    }
    
    // Send only if changed
    if (abs(temp - lastTemp) >= 0.2 || abs(humid - lastHumid) >= 1) {
        HTTPClient http;
        http.begin(serverUrl);
        http.addHeader("Content-Type", "application/json");
        
        DynamicJsonDocument doc(200);
        doc["temp"] = temp;
        doc["humid"] = humid;
        String payload;
        serializeJson(doc, payload);
        
        int httpCode = http.POST(payload);
        if (httpCode == 200) {
            Serial.printf("Sent: T=%.1f°C H=%.1f%%\n", temp, humid);
            lastTemp = temp;
            lastHumid = humid;
        } else {
            Serial.printf("HTTP error: %d\n", httpCode);
        }
        http.end();
    } else {
        Serial.println("No change, skipping");
    }
    
    delay(10000);  // Read every 10s
}
