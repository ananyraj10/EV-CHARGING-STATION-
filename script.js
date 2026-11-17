/*
  EV Wireless Charging Dashboard
  --------------------------------
  CURRENT:
  - Works without hardware.
  - Shows "No Car Detected", "Not Charging", "-- °C", etc.

  FUTURE:
  - ESP32 -> Spring Boot API -> this dashboard.
  - Spring Boot can store readings in MySQL.
*/

// Change this to true when your Spring Boot API is ready.
const USE_REAL_API = false;

// Recommended future API endpoint.
// Example response:
// {
//   "esp32Online": true,
//   "vehicleDetected": true,
//   "charging": true,
//   "temperature": 38.4,
//   "relayOn": true
// }
const API_URL = "http://localhost:8080/api/iot/status";

let currentState = {
  esp32Online: false,
  vehicleDetected: false,
  charging: false,
  temperature: null,
  relayOn: false,
  lastUpdated: null
};

let history = JSON.parse(localStorage.getItem("evTemperatureHistory") || "[]");

function getElement(id) {
  return document.getElementById(id);
}

function render(state) {
  currentState = state;

  // Connection
  getElement("connectionText").textContent =
    state.esp32Online ? "ESP32 Online" : "ESP32 Offline";

  getElement("connectionDot").className =
    "dot " + (state.esp32Online ? "online" : "offline");

  getElement("systemStatus").textContent =
    state.esp32Online ? "System Online" : "System Offline";

  getElement("systemStatusDot").className =
    "big-dot " + (state.esp32Online ? "online" : "offline");

  getElement("lastUpdated").textContent = state.lastUpdated
    ? "Last update: " + state.lastUpdated
    : "No data received yet";

  // Vehicle
  getElement("vehicleStatus").textContent =
    state.vehicleDetected ? "Car Detected" : "No Car Detected";

  getElement("vehicleSub").textContent =
    state.vehicleDetected ? "Vehicle is present" : "Waiting for vehicle";

  // Charging
  getElement("chargingStatus").textContent =
    state.charging ? "Charging" : "Not Charging";

  getElement("chargingSub").textContent =
    state.charging ? "Charging is active" : "Charging is inactive";

  // Temperature
  getElement("temperatureValue").textContent =
    state.temperature === null ? "-- °C" : Number(state.temperature).toFixed(1) + " °C";

  getElement("temperatureSub").textContent =
    state.temperature === null ? "No temperature data" : "Live temperature";

  // Relay
  getElement("relayStatus").textContent = state.relayOn ? "ON" : "OFF";
  getElement("relaySub").textContent =
    state.relayOn ? "Relay is active" : "Relay is inactive";

  // ESP32
  getElement("esp32Status").textContent =
    state.esp32Online ? "Online" : "Offline";

  getElement("esp32Sub").textContent =
    state.esp32Online ? "Device connected" : "No device connected";

  // Live table
  getElement("liveVehicle").textContent =
    state.vehicleDetected ? "Yes" : "No";

  getElement("liveCharging").textContent =
    state.charging ? "Yes" : "No";

  getElement("liveTemperature").textContent =
    state.temperature === null ? "-- °C" : Number(state.temperature).toFixed(1) + " °C";

  getElement("liveRelay").textContent =
    state.relayOn ? "ON" : "OFF";

  getElement("liveEsp32").textContent =
    state.esp32Online ? "Online" : "Offline";

  getElement("recordCount").textContent = history.length;
  getElement("browserRecords").textContent = history.length;

  if (state.lastUpdated) {
    getElement("collectionTime").textContent = state.lastUpdated;
  } else {
    getElement("collectionTime").textContent = "No data";
  }

  drawChart();
}

function addReadingToHistory(temperature) {
  if (temperature === null || temperature === undefined) return;

  history.push({
    time: new Date().toLocaleTimeString(),
    temperature: Number(temperature)
  });

  // Keep only the latest 30 browser readings.
  if (history.length > 30) {
    history.shift();
  }

  localStorage.setItem("evTemperatureHistory", JSON.stringify(history));
}

async function fetchRealData() {
  if (!USE_REAL_API) return;

  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("API returned " + response.status);
    }

    const data = await response.json();

    const newState = {
      esp32Online: Boolean(data.esp32Online),
      vehicleDetected: Boolean(data.vehicleDetected),
      charging: Boolean(data.charging),
      temperature:
        data.temperature === null || data.temperature === undefined
          ? null
          : Number(data.temperature),
      relayOn: Boolean(data.relayOn),
      lastUpdated: new Date().toLocaleString()
    };

    if (newState.temperature !== null) {
      addReadingToHistory(newState.temperature);
    }

    setApiStatus("API Connected", "good");
    render(newState);

  } catch (error) {
    console.log("API not available:", error);
    setApiStatus("API Offline", "bad");

    // Do not show fake sensor data.
    // If API stops responding, dashboard returns to no-data state.
    render({
      esp32Online: false,
      vehicleDetected: false,
      charging: false,
      temperature: null,
      relayOn: false,
      lastUpdated: null
    });
  }
}

function setApiStatus(text, type) {
  const element = getElement("apiStatus");
  element.textContent = text;
  element.className = "status-pill " + type;
}

function runDemo() {
  const demoState = {
    esp32Online: true,
    vehicleDetected: true,
    charging: true,
    temperature: 36.8 + Math.random() * 2.5,
    relayOn: true,
    lastUpdated: new Date().toLocaleString()
  };

  addReadingToHistory(demoState.temperature);
  setApiStatus("Demo Data", "good");
  render(demoState);
}

function resetDashboard() {
  history = [];
  localStorage.removeItem("evTemperatureHistory");

  setApiStatus("API Not Connected", "neutral");

  render({
    esp32Online: false,
    vehicleDetected: false,
    charging: false,
    temperature: null,
    relayOn: false,
    lastUpdated: null
  });
}

function drawChart() {
  const canvas = getElement("temperatureChart");
  const empty = getElement("emptyChart");

  if (!history.length) {
    canvas.style.display = "none";
    empty.style.display = "flex";
    return;
  }

  canvas.style.display = "block";
  empty.style.display = "none";

  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  const padding = 35;
  const values = history.map(item => item.temperature);

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    min -= 1;
    max += 1;
  }

  min -= 1;
  max += 1;

  // Grid
  ctx.strokeStyle = "#e2e7ef";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = padding + ((height - padding * 2) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Temperature line
  ctx.strokeStyle = "#2563c7";
  ctx.lineWidth = 3;
  ctx.beginPath();

  history.forEach((item, index) => {
    const x = history.length === 1
      ? width / 2
      : padding + (index / (history.length - 1)) * (width - padding * 2);

    const y =
      height - padding -
      ((item.temperature - min) / (max - min)) * (height - padding * 2);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Points
  history.forEach((item, index) => {
    const x = history.length === 1
      ? width / 2
      : padding + (index / (history.length - 1)) * (width - padding * 2);

    const y =
      height - padding -
      ((item.temperature - min) / (max - min)) * (height - padding * 2);

    ctx.fillStyle = "#2563c7";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#6f7b90";
  ctx.font = "11px Arial";
  ctx.fillText(max.toFixed(1) + " °C", 5, padding);
  ctx.fillText(min.toFixed(1) + " °C", 5, height - padding);
}

// Button events
getElement("demoButton").addEventListener("click", runDemo);
getElement("resetButton").addEventListener("click", resetDashboard);

// Start with no-data state.
render(currentState);

// Future API polling.
// Once USE_REAL_API = true, the dashboard checks for new data every 3 seconds.
if (USE_REAL_API) {
  fetchRealData();
  setInterval(fetchRealData, 3000);
}

