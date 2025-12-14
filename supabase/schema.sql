-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sensors table (if you want to manage multiple sensors)
CREATE TABLE IF NOT EXISTS sensors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create readings table for storing sensor data
CREATE TABLE IF NOT EXISTS readings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sensor_id UUID REFERENCES sensors(id),
    temperature DECIMAL(5,2) NOT NULL,
    humidity DECIMAL(5,2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Create changes table (only when values change)
CREATE TABLE IF NOT EXISTS value_changes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sensor_id UUID REFERENCES sensors(id),
    temperature DECIMAL(5,2) NOT NULL,
    humidity DECIMAL(5,2) NOT NULL,
    previous_temperature DECIMAL(5,2),
    previous_humidity DECIMAL(5,2),
    change_type VARCHAR(50), -- 'temperature', 'humidity', 'both'
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_readings_sensor_id ON readings(sensor_id);
CREATE INDEX idx_readings_recorded_at ON readings(recorded_at DESC);
CREATE INDEX idx_value_changes_recorded_at ON value_changes(recorded_at DESC);