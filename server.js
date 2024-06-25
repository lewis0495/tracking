const express = require('express');
const fetch = require('node-fetch');
const btoa = require('btoa');

const app = express();
const port = process.env.PORT || 3000;

const username = 'bond';
const password = 'Happydays_1';
const icao24List = ['40809a', '40809b', '407fb9', '408099'];

app.get('/api/aircraft', async (req, res) => {
    const baseUrl = 'https://opensky-network.org/api/states/all?';
    const url = baseUrl + 'icao24=' + icao24List.join('&icao24=');

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': 'Basic ' + btoa(username + ':' + password)
            }
        });

        if (!response.ok) {
            return res.status(response.status).send('Error fetching data');
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data from OpenSky Network:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
