#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ==== CONFIG ====
#define DHT_PIN 38
#define DHT_TYPE DHT22
#define WIFI_SSID "HUAWEI Baig"
#define WIFI_PASS "cd6c696d"
#define VERCEL_URL "https://monitor-webdashboard.vercel.app/api/sensor"

DHT dht(DHT_PIN, DHT_TYPE);
float lastTemp = -999.0;
float lastHum = -999.0;
unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 10000; // 10s

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected!");
}

void loop() {
  float hum = dht.readHumidity();
  float temp = dht.readTemperature();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("⚠️ DHT22 read failed");
    delay(2000);
    return;
  }

  bool changed = (abs(temp - lastTemp) > 0.1 || abs(hum - lastHum) > 0.1);
  if (changed && (millis() - lastSend > SEND_INTERVAL)) {
    HTTPClient http;
    http.begin(VERCEL_URL);
    http.addHeader("Content-Type", "application/json");
    
    String json = "{\"temperature\":" + String(temp, 1) + 
                  ",\"humidity\":" + String(hum, 1) + "}";
    
    int code = http.POST(json);
    if (code == 200) {
      Serial.println("📤 Sent: " + json);
      lastTemp = temp;
      lastHum = hum;
      lastSend = millis();
    } else {
      Serial.println("❌ HTTP Error: " + String(code));
    }
    http.end();
  }
  delay(2000);
}