// Leaflet map initialization
const initialLatitude = 53.276895;
const initialLongitude = 1.480952;
const initialZoom = 9;

const map = L.map('map').setView([initialLatitude, initialLongitude], initialZoom);

// Add OpenStreetMap tile layer to the map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Object to store the last known values for each aircraft
const lastKnownValues = {
    '40809a': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCN' },
    '40809b': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCS' },
    '407fb9': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCD' },
    '408099': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCM' },
};

// Object to store the current markers on the map
const currentMarkers = {};

// Function to fetch data from OpenSky Network API
async function fetchData() {
    const username = 'bond';
    const password = 'Happydays_1';
    const icao24List = ['40809a', '40809b', '407fb9', '408099']; // List of ICAO24 addresses

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
    // Custom icon for the aircraft marker
    const helicopterIcon = L.icon({
        iconUrl: 'helicopter.png',
        iconSize: [32, 32], // size of the icon
        iconAnchor: [16, 16], // point of the icon which will correspond to marker's location
        className: 'helicopter-icon' // Add a class for CSS rotation
    });

    // Track number of aircraft at each position
    const positionCounts = {};

    // Process aircraft data and create markers
    const updatedAircraft = new Set();
    if (data.states) {
        data.states.forEach(aircraft => {
            const icao24 = aircraft[0];
            updatedAircraft.add(icao24);

            const latitude = aircraft[6] !== null ? aircraft[6] : lastKnownValues[icao24]?.latitude;
            const longitude = aircraft[5] !== null ? aircraft[5] : lastKnownValues[icao24]?.longitude;
            const track = aircraft[10] !== null ? aircraft[10] : lastKnownValues[icao24]?.track;

            if (latitude !== undefined && longitude !== undefined) {
                // Update last known values
                lastKnownValues[icao24] = { latitude, longitude, track, callsign: lastKnownValues[icao24].callsign };

                // Remove existing marker if present
                if (currentMarkers[icao24]) {
                    map.removeLayer(currentMarkers[icao24]);
                }

                // Track number of aircraft at this position
                const positionKey = `${latitude},${longitude}`;
                if (!positionCounts[positionKey]) {
                    positionCounts[positionKey] = 0;
                }
                positionCounts[positionKey]++;

                // Create a marker with custom icon and callsign
                const marker = L.marker([latitude, longitude], { icon: helicopterIcon }).addTo(map);

                // Rotate the marker based on track angle
                marker.setRotationAngle(track);

                // Calculate tooltip offset to avoid overlap
                const baseOffset = 20; // Base offset to move the list lower down
                const offset = [0, baseOffset - 10 * positionCounts[positionKey]]; // Reduced gap to 10 pixels

                // Set marker content to display callsign and other details
                marker.bindTooltip(`<b>${lastKnownValues[icao24].callsign}</b>`, {
                    permanent: true, // Make the tooltip permanent (always shown)
                    direction: 'right', // Position the tooltip to the right of the marker
                    className: 'transparent-tooltip', // Custom CSS class for styling
                    offset: offset
                }).openTooltip(); // Open the tooltip immediately

                // Store the marker for later reference
                currentMarkers[icao24] = marker;
            }
        });
    }

    // Ensure all aircraft have markers, even if no data was received
    Object.keys(lastKnownValues).forEach(icao24 => {
        if (!updatedAircraft.has(icao24)) {
            const { latitude, longitude, track, callsign } = lastKnownValues[icao24];

            // Remove existing marker if present
            if (currentMarkers[icao24]) {
                map.removeLayer(currentMarkers[icao24]);
            }

            // Track number of aircraft at this position
            const positionKey = `${latitude},${longitude}`;
            if (!positionCounts[positionKey]) {
                positionCounts[positionKey] = 0;
            }
            positionCounts[positionKey]++;

            // Create a marker with custom icon and callsign
            const marker = L.marker([latitude, longitude], { icon: helicopterIcon }).addTo(map);

            // Rotate the marker based on track angle
            marker.setRotationAngle(track);

            // Calculate tooltip offset to avoid overlap
            const baseOffset = 20; // Base offset to move the list lower down
            const offset = [0, baseOffset - 10 * positionCounts[positionKey]]; // Reduced gap to 10 pixels

            // Set marker content to display callsign and other details
            marker.bindTooltip(`<b>${callsign}</b>`, {
                permanent: true, // Make the tooltip permanent (always shown)
                direction: 'right', // Position the tooltip to the right of the marker
                className: 'transparent-tooltip', // Custom CSS class for styling
                offset: offset
            }).openTooltip(); // Open the tooltip immediately

            // Store the marker for later reference
            currentMarkers[icao24] = marker;
        }
    });
}

// Function to load and display oil rig data
async function loadOilRigs() {
    try {
        const response = await fetch('oilrigs.json');
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }

        const rigs = await response.json();
        console.log('Loaded oil rigs:', rigs);

        // Custom icon for the oil rig marker
        const oilRigIcon = L.icon({
            iconUrl: 'oilrig.png',
            iconSize: [16, 16], // size of the icon
            iconAnchor: [16, 16], // point of the icon which will correspond to marker's location
            className: 'oil-rig-icon' // Add a class for CSS styling
        });

        rigs.forEach(rig => {
            const { name, latitude, longitude } = rig;

            // Create a marker for each oil rig
            const marker = L.marker([latitude, longitude], { icon: oilRigIcon }).addTo(map);

            // Set marker content to display the rig name
            marker.bindTooltip(`<b>${name}</b>`, {
                permanent: true, // Make the tooltip permanent (always shown)
                direction: 'left', // Position the tooltip to the right of the marker
                className: 'transparent-tooltip1' // Custom CSS class for styling
            }).openTooltip(); // Open the tooltip immediately

            // Optionally, you can add a popup with more details if needed
            // marker.bindPopup(`Oil Rig: ${name}`).openPopup();
        });

    } catch (error) {
        console.error('Error loading or displaying oil rigs:', error);
    }
}

// Initial fetch and update
fetchData();
loadOilRigs();

// Update every 30 seconds (adjust as needed)
setInterval(fetchData, 30000);
