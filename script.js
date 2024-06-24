// Initialize the map
const map = L.map('map').setView([0, 0], 2); // Initial view set to [0, 0] with zoom level 2

// Add a tile layer to the map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Define the custom helicopter icon with rotation
const helicopterIcon = L.icon({
    iconUrl: 'helicopter.png', // Path to your helicopter icon image
    iconSize: [32, 32], // Size of the icon (adjust as necessary)
    iconAnchor: [16, 16], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -16], // Point from which the popup should open relative to the iconAnchor
    className: 'helicopter-icon' // Custom class name for styling
});

// ICAO24 codes for aircraft to track
const icao24Codes = ['407fb9', '408099', '40809b', '40809a'];

// Store markers and last known positions by ICAO24 code
const markers = {};
let lastKnownPositions = {};

// Function to fetch data and update the map
async function updateMap() {
    try {
        // Check if current time is within 05:00 to 22:00 GMT
        const currentHourGMT = new Date().getUTCHours();
        if (currentHourGMT < 5 || currentHourGMT >= 22) {
            console.log('Outside allowed hours. Skipping update.');
            return;
        }

        const response = await fetch(`https://opensky-network.org/api/states/all?icao24=${icao24Codes.join('&icao24=')}`, {
            headers: {
                'Authorization': 'Basic ' + btoa('lewis0495:Happydays_1') // Replace with your username and password
            }
        });
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }
        const data = await response.json();
        console.log('Fetched data:', data);

        // Update the map with aircraft markers
        updateMapWithAircraft(data);

    } catch (error) {
        console.error('Error fetching or updating data:', error);
    }
}

// Function to update the map with aircraft markers
function updateMapWithAircraft(data) {
    // Clear existing markers before updating
    for (const icao24 of icao24Codes) {
        if (markers[icao24]) {
            map.removeLayer(markers[icao24]);
            delete markers[icao24];
        }
    }

    // Process aircraft data and create markers
    if (data.states) {
        data.states.forEach(aircraft => {
            const icao24 = aircraft[0];
            const callsign = formatCallsign(aircraft[1]); // Format callsign

            // Check if latitude and longitude are not NULL or undefined
            let latitude = aircraft[6];
            let longitude = aircraft[5];
            if (latitude === null || longitude === null || latitude === "NULL" || longitude === "NULL") {
                // Use last known positions if available
                if (lastKnownPositions[icao24]) {
                    latitude = lastKnownPositions[icao24].lat;
                    longitude = lastKnownPositions[icao24].lon;
                } else {
                    // Default to 0 if no last known position
                    latitude = 0;
                    longitude = 0;
                }
            } else {
                // Update last known position
                lastKnownPositions[icao24] = { lat: latitude, lon: longitude };
            }

            const trackAngle = aircraft[10];

            // Create a marker for each aircraft
            const marker = L.marker([latitude, longitude], {
                icon: helicopterIcon,
                rotationAngle: trackAngle, // Set rotation angle
                rotationOrigin: 'center center' // Set rotation origin
            }).addTo(map);

            // Store marker in the markers object
            markers[icao24] = marker;

            // Bind a tooltip with aircraft details
            marker.bindTooltip(`<b>${callsign}</b>`, {
                permanent: true,
                direction: 'right',
                className: 'transparent-tooltip' // Ensure this class is defined in style.css
            }).openTooltip();

            // Optionally, add more customization to markers (icon, popup, etc.)
        });
    }
}

// Function to format callsign with hyphen
function formatCallsign(callsign) {
    if (callsign.length === 8) {
        return callsign.slice(0, 1) + '-' + callsign.slice(1);
    } else {
        return callsign; // Return unchanged if not 5 characters long
    }
}

// Initial update
updateMap();

// Update the map every 30 seconds (30000 milliseconds)
setInterval(updateMap, 30000);
