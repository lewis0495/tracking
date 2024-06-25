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
    '40809a': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCN' },
    '40809b': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCS' },
    '407fb9': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCD' },
    '408099': { latitude: 52.676895, longitude: 1.280952, track: 0, callsign: 'G-PJCM' },
};

// Object to store the current markers on the map
const currentMarkers = {};

// Function to fetch data from the new API source
async function fetchData() {
    const icao24List = ['40809a', '40809b', '407fb9', '408099']; // List of ICAO24 addresses
    const url = `https://api.airplanes.live/v2/icao/${icao24List.join(',')}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }

        const data = await response.json();
        console.log('Fetched data from airplanes.live:', data);

        // Update map with aircraft markers from airplanes.live
        updateMapWithAircraft(data.ac, 'airplanes.live');

        // Check if any aircraft did not have position data
        const missingAircraft = icao24List.filter(icao24 => !data.ac.some(aircraft => aircraft.hex === icao24));
        if (missingAircraft.length > 0) {
            console.log('Fetching missing aircraft data from opensky-network for:', missingAircraft);
            await fetchFromOpenSky(missingAircraft);
        }

    } catch (error) {
        console.error('Error fetching or updating data from airplanes.live:', error);
    }
}

// Function to fetch data from OpenSky Network API
async function fetchFromOpenSky(icao24List) {
    const username = 'lewis0495';
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

        // Check if data is null or not an object/array
        if (!data || !Array.isArray(data.states)) {
            throw new Error('Data from OpenSky Network API is not in expected format.');
        }

        console.log('Fetched data from opensky-network:', data);

        // Update map with aircraft markers from opensky-network
        updateMapWithAircraft(data.states, 'OpenSky Network');

    } catch (error) {
        console.error('Error fetching or updating data from opensky-network:', error);
    }
}


// Function to update map with aircraft markers
function updateMapWithAircraft(data, source) {
    // Check if data is valid before processing
    if (!Array.isArray(data)) {
        console.error('Invalid data format for updating map:', data);
        return;
    }

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
    data.forEach(aircraft => {
        const [icao24, callsign, latitude, longitude, track] = aircraft;

        if (latitude !== null && longitude !== null) {
            // Update last known values
            lastKnownValues[icao24] = { latitude, longitude, track, callsign };

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

            // Set marker content to display only callsign initially
            marker.bindTooltip(`<b>${callsign}</b>`, {
                permanent: true, // Make the tooltip permanent (always shown)
                direction: 'right', // Position the tooltip to the right of the marker
                className: 'transparent-tooltip', // Custom CSS class for styling
                offset: offset
            });

            // Store the marker for later reference
            currentMarkers[icao24] = marker;

            // Add event listeners to show data source on hover or click
            marker.on('mouseover', function(e) {
                marker.openTooltip(`<b>${callsign}</b><br>Data Source: ${source}`, {
                    direction: 'right', // Position the tooltip to the right of the marker
                    offset: offset,
                    className: 'transparent-tooltip' // Ensure transparent styling
                });
            });

            marker.on('mouseout', function(e) {
                marker.setTooltipContent(`<b>${callsign}</b>`);
            });

            marker.on('click', function(e) {
                marker.setTooltipContent(`<b>${callsign}</b><br>Data Source: ${source}`);
            });
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

            // Create a marker with custom icon and callsign
            const marker = L.marker([latitude, longitude], { icon: helicopterIcon }).addTo(map);

            // Rotate the marker based on track angle
            marker.setRotationAngle(track);

            // Calculate tooltip offset to avoid overlap
            const baseOffset = 20; // Base offset to move the list lower down
            const offset = [0, baseOffset - 10 * positionCounts[positionKey]]; // Reduced gap to 10 pixels

            // Set marker content to display only callsign initially
            marker.bindTooltip(`<b>${callsign}</b>`, {
                permanent: true, // Make the tooltip permanent (always shown)
                direction: 'right', // Position the tooltip to the right of the marker
                className: 'transparent-tooltip', // Custom CSS class for styling
                offset: offset
            });

            // Store the marker for later reference
            currentMarkers[icao24] = marker;

            // Add event listeners to show data source on hover or click
            marker.on('mouseover', function(e) {
                marker.openTooltip(`<b>${callsign}</b><br>Data Source: ${source}`, {
                    direction: 'right', // Position the tooltip to the right of the marker
                    offset: offset,
                    className: 'transparent-tooltip' // Ensure transparent styling
                });
            });

            marker.on('mouseout', function(e) {
                marker.setTooltipContent(`<b>${callsign}</b>`);
            });

            marker.on('click', function(e) {
                marker.setTooltipContent(`<b>${callsign}</b><br>Data Source: ${source}`);
            });
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
            className: 'oilrig-icon' // Add a class for CSS rotation
        });

        // Add markers for each oil rig
        rigs.forEach(rig => {
            L.marker([rig.latitude, rig.longitude], { icon: oilRigIcon }).addTo(map)
                .bindTooltip(`<b>${rig.name}`, {
                    permanent: true, // Non-permanent tooltip
                    direction: 'left', // Position the tooltip above the marker
                    className: 'transparent-tooltip1', // Custom CSS class for styling
                    offset: [-2, -9] // Offset to adjust the tooltip position
                });
        });

    } catch (error) {
        console.error('Error loading oil rigs data:', error);
    }
}

// Initialize the map and fetch data
fetchData();
loadOilRigs();
setInterval(fetchData, 30000); // Refresh data 30 seconds
