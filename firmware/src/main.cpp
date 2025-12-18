#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// === CONFIGURATION ===
const char* ssid = "FFC-MISC";  //  REPLACE WITH YOUR ESP32'S WIFI NAME (NO PASSWORD)
//const char* password = "cd6c696d";
const char* serverUrl = "https://monitor-dashboard-newf.vercel.app/api/sensor";
//                                                                       ^ no spaces!

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
  WiFi.begin(ssid, "");

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


history 


// /api/history.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const supabase = createClient(
    'https://uappuwebcylzwndfaqxo.supabase.co',
    process.env.SUPABASE_KEY
  );

  if (!process.env.SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing API key' });
  }

  try {
    const { data, error } = await supabase
      .from('readings')
      .select('recorded_at, temperature, humidity')
      .order('recorded_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('History fetch error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error('Unexpected error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};


latest.js 



const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const supabase = createClient(
    'https://uappuwebcylzwndfaqxo.supabase.co',
    process.env.SUPABASE_KEY
  );

  const { data, error } = await supabase
    .from('readings')
    .select('temperature, humidity, recorded_at')  // ✅ recorded_at
    .order('recorded_at', { ascending: false })   // ✅ recorded_at
    .limit(1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data?.[0] || { temperature: null, humidity: null, recorded_at: null });
};


sensor   

// /api/sensor.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  let data;
  try {
    data = JSON.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { temperature, humidity } = data;

  if (typeof temperature !== 'number' || typeof humidity !== 'number') {
    return res.status(400).json({ error: 'temperature and humidity must be numbers' });
  }

  const supabase = createClient(
    'https://uappuwebcylzwndfaqxo.supabase.co',
    process.env.SUPABASE_KEY
  );

  if (!process.env.SUPABASE_KEY) {
    console.error('❌ SUPABASE_KEY is missing');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    // Fetch last reading using recorded_at
    const { data: lastReadings, error: fetchErr } = await supabase
      .from('readings')
      .select('temperature, humidity')
      .order('recorded_at', { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.error('Supabase fetch error:', fetchErr.message);
      return res.status(500).json({ error: 'Database fetch failed' });
    }

    const last = lastReadings?.[0];
    const hasChanged = !last ||
      Math.abs(parseFloat(last.temperature) - temperature) > 0.1 ||
      Math.abs(parseFloat(last.humidity) - humidity) > 0.1;

    if (hasChanged) {
      const { error: insertErr } = await supabase
        .from('readings')
        .insert([{ temperature, humidity }]); // recorded_at auto-filled by now()

      if (insertErr) {
        console.error('Supabase insert error:', insertErr.message);
        return res.status(500).json({ error: 'Database insert failed' });
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

