// Leaflet map initialization
const initialLatitude = 53.276895;
const initialLongitude = 1.480952;
const initialZoom = 9;

// Create the map centered at initial coordinates
const map = L.map('map').setView([initialLatitude, initialLongitude], initialZoom);

// Base layers
const openStreetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Overlay layer (OpenSeaMap)
const openSeaMapLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
    maxZoom: 18
});

// Create a layer control object with base layers and overlays
const baseLayers = {
    "OpenStreetMap": openStreetMapLayer
};

const overlays = {
    "OpenSeaMap": openSeaMapLayer
};

// Add layer control to the map
L.control.layers(baseLayers, overlays).addTo(map);

// Object to store the last known values for each aircraft
const lastKnownValues = {
    '40809a': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCN', timestamp: Date.now() },
    '40809b': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCS', timestamp: Date.now() },
    '407fb9': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCD', timestamp: Date.now() },
    '408099': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCM', timestamp: Date.now() },
};

// Object to store the current markers on the map
const currentMarkers = {};

// Alternating between APIs
let useAirplanesLive = true;

// Function to fetch data from airplanes.live API
async function fetchFromAirplanesLive(icao24List) {
    const url = `https://api.airplanes.live/v2/icao/${icao24List.join(',')}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }

        const data = await response.json();
        console.log('Fetched data from airplanes.live:', data);

        // Update map with aircraft markers
        updateMapWithAircraft(data.ac);

    } catch (error) {
        console.error('Error fetching or updating data from airplanes.live:', error);
        // If an error occurs, update the map using last known positions
        updateMapWithAircraft(null);
    }
}

// Function to fetch data from OpenSky Network API
async function fetchFromOpenSky(icao24List) {
    const username = useAirplanesLive ? 'bond' : 'lewis0495';
    const password = 'Happydays_1';

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
        console.log('Fetched data from opensky-network:', data);

        // Update map with aircraft markers from opensky-network
        updateMapWithAircraft(data.states);

    } catch (error) {
        console.error('Error fetching or updating data from opensky-network:', error);
        // If an error occurs, update the map using last known positions
        updateMapWithAircraft(null);
    }
}

// Helicopter icons for animation frames
const helicopterIcons = [
    L.icon({
        iconUrl: 'helicopter1.png',
        iconSize: [32, 32], // size of the icon
        iconAnchor: [16, 16], // point of the icon which will correspond to marker's location
        className: 'helicopter-icon' // Add a class for CSS rotation
    }),
    L.icon({
        iconUrl: 'helicopter2.png',
        iconSize: [32, 32], // size of the icon
        iconAnchor: [16, 16], // point of the icon which will correspond to marker's location
        className: 'helicopter-icon' // Add a class for CSS rotation
    }),
    L.icon({
        iconUrl: 'helicopter3.png',
        iconSize: [32, 32], // size of the icon
        iconAnchor: [16, 16], // point of the icon which will correspond to marker's location
        className: 'helicopter-icon' // Add a class for CSS rotation
    })
];

// Function to create a new aircraft marker
function createAircraftMarker(latitude, longitude, track, icao24, icon, offset) {
    const callsign = lastKnownValues[icao24]?.callsign;
    const marker = L.marker([latitude, longitude], { icon: icon }).addTo(map);

    // Rotate the marker based on track angle
    marker.setRotationAngle(track);

    // Set marker content to display callsign and other details
    marker.bindTooltip(`<b>${callsign}</b>`, {
        permanent: true, // Make the tooltip permanent (always shown)
        direction: 'right', // Position the tooltip to the right of the marker
        className: 'transparent-tooltip', // Custom CSS class for styling
        offset: offset // Apply the offset to avoid overlap
    }).openTooltip(); // Open the tooltip immediately

    return marker;
}

// Function to update map with aircraft markers
function updateMapWithAircraft(data) {
    const positionCounts = {};
    const updatedAircraft = new Set();

    const aircraftData = data || Object.keys(lastKnownValues).map(icao24 => {
        const { latitude, longitude, track, callsign } = lastKnownValues[icao24];
        return [icao24, callsign, null, null, null, longitude, latitude, null, null, null, track];
    });

    aircraftData.forEach(aircraft => {
        const icao24 = aircraft[0];
        const latitude = aircraft[6];
        const longitude = aircraft[5];
        const track = aircraft[10];

        updatedAircraft.add(icao24);

        if (latitude !== undefined && longitude !== undefined) {
            // Update last known values and timestamp
            lastKnownValues[icao24] = { latitude, longitude, track, callsign: lastKnownValues[icao24]?.callsign, timestamp: Date.now() };

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

            // Calculate tooltip offset to avoid overlap
            const baseOffset = 20; // Base offset to move the list lower down
            const offset = [0, baseOffset - 10 * positionCounts[positionKey]]; // Reduced gap to 10 pixels

            // Create a marker with the first frame icon
            const marker = createAircraftMarker(latitude, longitude, track, icao24, helicopterIcons[0], offset);

            // Store the marker for later reference
            currentMarkers[icao24] = marker;
        }
    });

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

            // Calculate tooltip offset to avoid overlap
            const baseOffset = 20; // Base offset to move the list lower down
            const offset = [0, baseOffset - 10 * positionCounts[positionKey]]; // Reduced gap to 10 pixels

            // Create a marker with the first frame icon
            const marker = createAircraftMarker(latitude, longitude, track, icao24, helicopterIcons[0], offset);

            // Store the marker for later reference
            currentMarkers[icao24] = marker;
        }
    });
}

// Function to fetch data from the appropriate API based on the flag
function fetchData() {
    const icao24List = Object.keys(lastKnownValues);

    if (useAirplanesLive) {
        fetchFromAirplanesLive(icao24List);
    } else {
        fetchFromOpenSky(icao24List);
    }

    // Toggle flag for next fetch
    useAirplanesLive = !useAirplanesLive;
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
            iconSize: [12, 12], // size of the icon
            iconAnchor: [0, 0], // point of the icon which will correspond to marker's location
            className: 'oil-rig-icon' // Add a class for CSS styling
        });

        rigs.forEach(rig => {
            const { name, latitude, longitude } = rig;

            // Create a marker for each oil rig
            const marker = L.marker([latitude, longitude], { icon: oilRigIcon }).addTo(map);

              // Set marker content to display the rig name with pixel offset for the tooltip
            const offset = [-2, -8]; // Adjust these values as needed to reposition the tooltip
            marker.bindTooltip(`<b>${name}</b>`, {
                permanent: true, // Make the tooltip permanent (always shown)
                direction: 'left', // Position the tooltip to the right of the marker
                className: 'transparent-tooltip1', // Custom CSS class for styling
                offset: offset // Apply pixel offset
            }).openTooltip(); // Open the tooltip immediately
        });

    } catch (error) {
        console.error('Error loading or displaying oil rigs:', error);
    }
}

// Initial fetch and update
fetchData();
loadOilRigs();

// Set interval to alternate between APIs
setInterval(fetchData, 30000); // 30 seconds

// Animation interval
let currentFrame = 0;
setInterval(() => {
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000;

    Object.keys(currentMarkers).forEach(icao24 => {
        const marker = currentMarkers[icao24];
        const lastUpdate = lastKnownValues[icao24]?.timestamp;

        if (lastUpdate && (now - lastUpdate) <= twoMinutes) {
            currentFrame = (currentFrame + 1) % helicopterIcons.length;
            marker.setIcon(helicopterIcons[currentFrame]);
        } else {
            // If the timestamp is older than 2 minutes, stop the animation by setting the icon to the first frame
            marker.setIcon(helicopterIcons[0]);
        }
    });
}, 500); // Change frame every 500ms
