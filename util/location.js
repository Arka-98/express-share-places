const fetch = require('node-fetch')
const HttpError = require('../models/http-error')

const API_KEY = process.env.GEOCODING_API_KEY

async function getCoordsFromAddress(address) {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURI(address)}&key=${API_KEY}`)
    const data = await response.json()

    if(data.status === 'ZERO_RESULTS') {
        throw new HttpError('No coordinates found for address', 404)
    }

    return data.results[0]
}

module.exports = getCoordsFromAddress