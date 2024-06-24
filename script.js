// Leaflet map initialization
const map = L.map('map').setView([0, 0], 2); // Initial view set to [0, 0] with zoom level 2

// Add OpenStreetMap tile layer to the map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Function to fetch data from OpenSky Network API
async function fetchData() {
    const username = 'bond';
    const password = 'Happydays_1';
    const icao24List = ['40809a', '40809b', '407fb9', '408099', '4851ad', '4067f0']; // List of ICAO24 addresses

    const baseUrl = 'https://opensky-network.org/api/states/all?';
    const url = baseUrl + 'icao24=' + icao24List.join('&icao24=');

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

    // Custom icon for the aircraft marker
    const helicopterIcon = L.icon({
        iconUrl: 'helicopter.png',
        iconSize: [32, 32], // size of the icon
        iconAnchor: [16, 16], // point of the icon which will correspond to marker's location
        className: 'helicopter-icon' // Add a class for CSS rotation
    });

    // Process aircraft data and create markers
    if (data.states) {
        data.states.forEach(aircraft => {
            const icao24 = aircraft[0];
            let callsign;

            // Assign callsign based on ICAO designator
            if (icao24 === '407fb9') {
                callsign = 'G-PJCD';
            } else if (icao24 === '40809a') {
                callsign = 'G-PJCN';
            } else if (icao24 === '40809b') {
                callsign = 'G-PJCS';
            } else if (icao24 === '408099') {
                callsign = 'G-PJCM';
            } else if (icao24 === '4851ad') {
                callsign = 'G-CIVS';
            } else {
                callsign = icao24; // Default or handle other cases as needed
            }

            const latitude = aircraft[6];
            const longitude = aircraft[5];
            const track = aircraft[10]; // Track angle

            // Create a marker with custom icon and callsign
            const marker = L.marker([latitude, longitude], { icon: helicopterIcon }).addTo(map);

            // Rotate the marker based on track angle
            marker.getElement().style.transform += ` rotate(${track}deg)`;

            // Set marker content to display callsign and other details
            marker.bindTooltip(`<b>${callsign}</b>`, {
                permanent: true, // Make the tooltip permanent (always shown)
                direction: 'right', // Position the tooltip to the right of the marker
                className: 'transparent-tooltip' // Custom CSS class for styling
            }).openTooltip(); // Open the tooltip immediately

            // Optionally, you can add a popup with more details if needed
            // marker.bindPopup(`Aircraft ${icao24}<br/>Callsign: ${callsign}`).openPopup();
        });
    }
}

// Initial fetch and update
fetchData();

// Update every 30 seconds (adjust as needed)
setInterval(fetchData, 30000);
