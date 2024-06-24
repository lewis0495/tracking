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

// Define the ICAO URLs to track
const icaoUrls = [
    { url: 'https://api.airplanes.live/v2/icao/407fb9', label: 'G-PJCD' },
    { url: 'https://api.airplanes.live/v2/icao/408099', label: 'G-PJCM' },
    { url: 'https://api.airplanes.live/v2/icao/40809b', label: 'G-PJCS' },
    { url: 'https://api.airplanes.live/v2/icao/40809a', label: 'G-PJCN' }
];

// Store markers and last known positions by ICAO
const markers = {};
const lastKnownPositions = {};

// Function to fetch data and update the map
async function updateMap() {
    for (const icao of icaoUrls) {
        try {
            const response = await fetch(icao.url);
            const data = await response.json();

            // Extract the first aircraft's data from the array
            const aircraft = data.ac[0];
            const latitude = aircraft.lat || (lastKnownPositions[icao.url] ? lastKnownPositions[icao.url].lat : 0);
            const longitude = aircraft.lon || (lastKnownPositions[icao.url] ? lastKnownPositions[icao.url].lon : 0);
            const trackAngle = aircraft.track || (lastKnownPositions[icao.url] ? lastKnownPositions[icao.url].track : 0);

            // Update the last known position
            lastKnownPositions[icao.url] = { lat: latitude, lon: longitude, track: trackAngle };

            // Update the page title with the last known Lat, Lon, and Track of the first aircraft
            if (icao === icaoUrls[0]) {
                document.title = `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}, Track: ${trackAngle.toFixed(2)}`;
            }

            // Update the map with the new coordinates
            if (markers[icao.url]) {
                markers[icao.url].setLatLng([latitude, longitude]);
                markers[icao.url].setRotationAngle(trackAngle); // Update rotation angle
            } else {
                markers[icao.url] = L.marker([latitude, longitude], {
                    icon: helicopterIcon,
                    rotationAngle: trackAngle, // Initial rotation angle
                    rotationOrigin: 'center center' // Set rotation origin
                }).addTo(map);
                markers[icao.url].bindTooltip(icao.label, { permanent: true, direction: 'right', className: 'transparent-tooltip' }).openTooltip();
            }
        } catch (error) {
            console.error('Error fetching or updating data for', icao.url, error);
        }
    }
}

// Initial update
updateMap();

// Update the map every 30 seconds
setInterval(updateMap, 30000);
