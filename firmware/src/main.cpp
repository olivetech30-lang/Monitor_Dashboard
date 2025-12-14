#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ==== CONFIG ====
static const char* WIFI_SSID = "HUAWEI Baig";
static const char* WIFI_PASS = "cd6c696d";

// Replace with your deployed Vercel domain:
static const char* SENSOR_POST_URL = "https://monitor-webdashboard.vercel.app/api/sensor";

static const char* DEVICE_ID = "esp32-s3-dht22";

// DHT22 on GPIO38 per your wiring
static const int DHT_PIN = 38;
static const int DHT_TYPE = DHT22;

// Polling / sending behavior
static const uint32_t READ_INTERVAL_MS = 2000;
static const float EPS_T = 0.1f;  // 0.1°C threshold
static const float EPS_H = 0.1f;  // 0.1% threshold

DHT dht(DHT_PIN, DHT_TYPE);

float lastT = NAN;
float lastH = NAN;
uint32_t lastReadMs = 0;

static bool nearlyEqual(float a, float b, float eps) {
  if (isnan(a) || isnan(b)) return false;
  return fabs(a - b) < eps;
}

static void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("WiFi connecting");
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(350);
    Serial.print(".");
    if (millis() - start > 20000) {
      Serial.println("\nWiFi connect timeout, restarting...");
      ESP.restart();
    }
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

static bool postSensor(float t, float h) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(SENSOR_POST_URL);
  http.addHeader("Content-Type", "application/json");

  // Build JSON manually (simple + no extra deps)
  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"temperature\":" + String(t, 1) + ",";
  payload += "\"humidity\":" + String(h, 1);
  payload += "}";

  int code = http.POST(payload);
  String resp = http.getString();
  http.end();

  Serial.printf("POST %s -> %d\n", SENSOR_POST_URL, code);
  if (code > 0) {
    Serial.println(resp);
  }
  return (code >= 200 && code < 300);
}

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("ClimateCloud ESP32-S3 DHT22 starting...");
  dht.begin();
  connectWiFi();
}

void loop() {
  if (millis() - lastReadMs < READ_INTERVAL_MS) return;
  lastReadMs = millis();

  // Keep WiFi stable
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectWiFi();
  }

  float h = dht.readHumidity();
  float t = dht.readTemperature(); // Celsius

  if (isnan(t) || isnan(h)) {
    Serial.println("DHT read failed (NaN).");
    return;
  }

  Serial.printf("Read: T=%.1f°C  H=%.1f%%\n", t, h);

  bool changed = isnan(lastT) || isnan(lastH) ||
                 !nearlyEqual(t, lastT, EPS_T) ||
                 !nearlyEqual(h, lastH, EPS_H);

  if (!changed) {
    Serial.println("No significant change, not sending.");
    return;
  }

  Serial.println("Change detected, sending...");
  if (postSensor(t, h)) {
    lastT = t;
    lastH = h;
    Serial.println("Sent OK.");
  } else {
    Serial.println("Send failed.");
  }
}