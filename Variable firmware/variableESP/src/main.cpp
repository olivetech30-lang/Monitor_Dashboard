#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_NeoPixel.h>
#include <WiFiClientSecure.h>

// ===== Constants =====
#define LED_PIN            48
#define NUM_PIXELS         1
#define WIFI_SSID          "YOUR_WIFI_SSID"
#define WIFI_PASS          "YOUR_WIFI_PASSWORD"
#define API_URL            "https://your-vercel-app.vercel.app/api/delay"
#define API_POLL_INTERVAL_MS 1000
#define MIN_DELAY_MS       500
#define MAX_DELAY_MS       5000

// ===== Global State =====
Adafruit_NeoPixel pixels(NUM_PIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);
volatile unsigned long blinkDelayMs = 1000; // Initial delay (ms)
unsigned long lastBlinkTime = 0;
unsigned long lastApiPollTime = 0;
bool ledState = false;

// ===== HTTPS Setup (for Vercel) =====
// Vercel uses Let's Encrypt certs → use root CA bundle
// You can use a minimal cert or use setInsecure() for dev (not recommended for prod)
// For simplicity in dev, we use setInsecure(); in production, use a proper cert.
WiFiClientSecure client;

// ===== Helper: Clamp delay to valid range =====
unsigned long clampDelay(unsigned long delay) {
    if (delay < MIN_DELAY_MS) return MIN_DELAY_MS;
    if (delay > MAX_DELAY_MS) return MAX_DELAY_MS;
    return delay;
}

// ===== Helper: Fetch delay from Vercel API =====
void fetchDelayFromApi() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient https;
    https.setTimeout(5000); // 5s timeout

    if (!https.begin(client, API_URL)) {
        Serial.println("HTTPS begin failed");
        return;
    }

    int httpCode = https.GET();
    if (httpCode == HTTP_CODE_OK) {
        String payload = https.getString();
        // Parse JSON: {"delay": 1234}
        int start = payload.indexOf("\"delay\":");
        if (start != -1) {
            start = payload.indexOf(':', start) + 1;
            int end = payload.indexOf('}', start);
            if (end != -1) {
                String delayStr = payload.substring(start, end);
                delayStr.trim();
                unsigned long newDelay = delayStr.toInt();
                blinkDelayMs = clampDelay(newDelay);
                Serial.printf("Updated delay: %lu ms\n", blinkDelayMs);
            }
        }
    } else {
        Serial.printf("HTTP GET failed, error: %s\n", https.errorToString(httpCode).c_str());
    }

    https.end();
}

// ===== Setup =====
void setup() {
    Serial.begin(115200);
    pixels.begin();
    pixels.clear();
    pixels.show();

    // Connect to Wi-Fi
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(250);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected");

    // For HTTPS (accept any cert – OK for dev; use CA cert in prod)
    client.setInsecure();
}

// ===== Loop =====
void loop() {
    unsigned long now = millis();

    // ✅ Non-blocking API polling every 1s
    if (now - lastApiPollTime >= API_POLL_INTERVAL_MS) {
        lastApiPollTime = now;
        fetchDelayFromApi();
    }

    // ✅ Non-blocking LED blinking using millis()
    if (now - lastBlinkTime >= blinkDelayMs) {
        lastBlinkTime = now;
        ledState = !ledState;

        if (ledState) {
            pixels.setPixelColor(0, pixels.Color(50, 0, 0)); // Dim red
        } else {
            pixels.clear();
        }
        pixels.show();
    }

    // Keep Wi-Fi alive (Arduino WiFi handles this in background)
    // No blocking calls → everything stays responsive
}