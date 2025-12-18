// ============================================
// ESP32-S3 Combined Monitor + Flash Controller
// Version 1.0
// ============================================

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

// ============================================
// CONFIGURATION
// ============================================

const char* WIFI_SSID = "Wifi-Repeater";        // Open network
const char* API_URL_SENSOR = "https://monitor-dashboard-newf.vercel.app/api/sensor";
const char* API_URL_DELAY = "https://flash-controller-full.vercel.app/api/delay";

// DHT22 Sensor
#define DHTPIN 38
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// NeoPixel
#define NEOPIXEL_PIN    48
#define NUM_PIXELS      1
#define PIXEL_BRIGHTNESS 150

// Timing
const unsigned long SENSOR_POLL_INTERVAL = 2000;   // Every 2 seconds
const unsigned long DELAY_POLL_INTERVAL = 3000;     // Every 3 seconds
const unsigned long HTTP_TIMEOUT = 5000;

// Delay limits
const int MIN_DELAY = 50;
const int MAX_DELAY = 2000;
const int DEFAULT_DELAY = 500;

// ============================================
// GLOBAL VARIABLES
// ============================================

Adafruit_NeoPixel pixel(NUM_PIXELS, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);

// Sensor variables
float lastTemperature = 0;
float lastHumidity = 0;
const float CHANGE_THRESHOLD = 0.1;

// LED variables
volatile int blinkDelay = DEFAULT_DELAY;
volatile bool ledState = false;
unsigned long lastBlinkTime = 0;

bool wifiConnected = false;

// HTTP clients
WiFiClientSecure secureClient;
HTTPClient httpSensor;
HTTPClient httpDelay;

// Timing
unsigned long previousSensorMillis = 0;
unsigned long previousDelayMillis = 0;

// ============================================
// FUNCTION DECLARATIONS
// ============================================
void connectToWiFi();
void sendSensorData();
void fetchDelayFromAPI();
void updateLED();

// ============================================
// SETUP
// ============================================
void setup() {
    Serial.begin(115200);
    delay(500);

    // Initialize DHT22
    dht.begin();

    // Initialize NeoPixel
    pixel.begin();
    pixel.setBrightness(PIXEL_BRIGHTNESS);
    pixel.clear();
    pixel.show();

    // Test LED
    pixel.setPixelColor(0, pixel.Color(255, 0, 0)); pixel.show(); delay(200);
    pixel.setPixelColor(0, pixel.Color(0, 255, 0)); pixel.show(); delay(200);
    pixel.setPixelColor(0, pixel.Color(0, 0, 255)); pixel.show(); delay(200);
    pixel.clear(); pixel.show();

    // Connect to WiFi
    connectToWiFi();

    // Configure HTTPS
    secureClient.setInsecure();

    Serial.println("\n✅ System Ready!");

    // Initialize timing
    previousSensorMillis = millis();
    previousDelayMillis = millis();
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
    // Update LED first (highest priority)
    updateLED();

    unsigned long currentMillis = millis();

    // =========================
    // TASK 1: Send Sensor Data
    // =========================
    if (currentMillis - previousSensorMillis >= SENSOR_POLL_INTERVAL) {
        previousSensorMillis = currentMillis;
        if (wifiConnected && WiFi.status() == WL_CONNECTED) {
            sendSensorData();
        } else {
            connectToWiFi();
        }
    }

    // =========================
    // TASK 2: Fetch LED Delay
    // =========================
    if (currentMillis - previousDelayMillis >= DELAY_POLL_INTERVAL) {
        previousDelayMillis = currentMillis;
        if (wifiConnected && WiFi.status() == WL_CONNECTED) {
            fetchDelayFromAPI();
        } else {
            connectToWiFi();
        }
    }

    yield(); // Prevent watchdog reset
}

// ============================================
// UPDATE LED
// ============================================
void updateLED() {
    unsigned long currentMillis = millis();
    if (currentMillis - lastBlinkTime >= (unsigned long)blinkDelay) {
        lastBlinkTime = currentMillis;
        ledState = !ledState;
        pixel.setPixelColor(0, ledState ? pixel.Color(0, 150, 255) : pixel.Color(0, 0, 0));
        pixel.show();
    }
}

// ============================================
// CONNECT TO WIFI
// ============================================
void connectToWiFi() {
    Serial.println("[WiFi] Connecting to: " + String(WIFI_SSID));
    WiFi.disconnect(true, true);
    delay(100);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, ""); // Open network

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(300);
        Serial.print(".");
        attempts++;
        updateLED();
    }

    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        Serial.println("\n✅ WiFi connected! IP: " + WiFi.localIP().toString());
    } else {
        wifiConnected = false;
        Serial.println("\n❌ WiFi connection failed!");
    }
}

// ============================================
// SEND SENSOR DATA
// ============================================
void sendSensorData() {
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature)) {
        Serial.println("[Sensor] Failed to read from DHT22");
        return;
    }

    // Check for significant change
    bool tempChanged = abs(temperature - lastTemperature) >= CHANGE_THRESHOLD;
    bool humidChanged = abs(humidity - lastHumidity) >= CHANGE_THRESHOLD;

    if (tempChanged || humidChanged || lastTemperature == 0) {
        Serial.printf("[Sensor] Sending: T=%.1f°C, H=%.1f%%\n", temperature, humidity);

        StaticJsonDocument<128> jsonDoc;
        jsonDoc["temperature"] = round(temperature * 100) / 100.0;
        jsonDoc["humidity"] = round(humidity * 100) / 100.0;

        String jsonString;
        serializeJson(jsonDoc, jsonString);

        httpSensor.begin(secureClient, API_URL_SENSOR);
        httpSensor.addHeader("Content-Type", "application/json");
        httpSensor.addHeader("Content-Length", String(jsonString.length()));

        int httpCode = httpSensor.POST(jsonString);
        String response = httpSensor.getString();
        httpSensor.end();

        if (httpCode == 200 || httpCode == 201) {
            Serial.println("[Sensor] ✅ Success!");
            lastTemperature = temperature;
            lastHumidity = humidity;
        } else {
            Serial.printf("[Sensor] ❌ HTTP %d: %s\n", httpCode, response.c_str());
        }
    } else {
        Serial.println("[Sensor] No significant change");
    }
}

// ============================================
// FETCH DELAY FROM API
// ============================================
void fetchDelayFromAPI() {
    httpDelay.begin(secureClient, API_URL_DELAY);
    httpDelay.addHeader("Content-Type", "application/json");

    int httpCode = httpDelay.GET();

    if (httpCode == HTTP_CODE_OK) {
        String payload = httpDelay.getString();
        StaticJsonDocument<256> doc;
        DeserializationError error = deserializeJson(doc, payload);

        if (!error) {
            int newDelay = doc["delay"].as<int>();
            newDelay = max(MIN_DELAY, min(MAX_DELAY, newDelay));

            if (newDelay != blinkDelay) {
                Serial.println("\n★ DELAY CHANGED: " + String(newDelay) + "ms");
                blinkDelay = newDelay;
            }
        }
    }

    httpDelay.end();
}