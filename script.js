// Leaflet map initialization
const map = L.map('map').setView([0, 0], 2); // Initial view set to [0, 0] with zoom level 2

// Add OpenStreetMap tile layer to the map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Function to fetch data from OpenSky Network API
async function fetchData() {
    const username = 'lewis0495';
    const password = 'Happydays_1';
    const url = 'https://opensky-network.org/api/states/all?icao24=407fb9&icao24=4078f7';

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': 'Basic ' + btoa(username + ':' + password)
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }

        const data = await response.json();
        console.log('Fetched data:', data);

        // Update map with aircraft markers
        updateMapWithAircraft(data);

    } catch (error) {
        console.error('Error fetching or updating data:', error);
    }
}

// Function to update map with aircraft markers
function updateMapWithAircraft(data) {
    // Clear existing markers before updating
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // Process aircraft data and create markers
    if (data.states) {
        data.states.forEach(aircraft => {
            const icao24 = aircraft[0];
            const callsign = aircraft[1];
            const latitude = aircraft[6];
            const longitude = aircraft[5];

            // Create a marker for each aircraft
            const marker = L.marker([latitude, longitude]).addTo(map);

            // Bind a popup with aircraft details
            marker.bindPopup(`<b>Aircraft ${icao24}</b><br/>Callsign: ${callsign}<br/>Lat: ${latitude}, Lon: ${longitude}`);

            // Optionally, add more customization to markers (icon, tooltip, etc.)
        });
    }
}

// Initial fetch and update
fetchData();

// Update every 30 seconds (adjust as needed)
setInterval(fetchData, 30000);
