const mongoose = require('mongoose')

const placeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    image: { type: String, required: true },
    likedUserIds: [{ type: mongoose.Types.ObjectId }],
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    userId: { type: mongoose.Types.ObjectId, required: true, immutable: true, ref: 'User' }
}, { timestamps: true })

module.exports = mongoose.model('Place', placeSchema)