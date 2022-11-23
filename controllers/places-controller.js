const HttpError = require('../models/http-error')
const { v4: uuidv4 } = require('uuid')
const Place = require('../models/place-model')
const User = require('../models/user-model')
const { validationResult } = require('express-validator')
const getCoordsFromAddress = require('../util/location')
const { uploadToS3, deleteFileFromS3 } = require('../util/s3-upload')
const fs = require('fs')
const { default: mongoose } = require('mongoose')

const getAllPlaces = async (req, res, next) => {
    const result = await Place.find().exec()
    res.status(200).json({ result })
}

const getPlaceById = async (req, res, next) => {
    try {
        const result = await Place.findById(req.params.placeId).exec()
        if (!result) {
            return next(new HttpError('No place found', 404))
        }
        res.status(200).json({ result })
    } catch (error) {
        next(new HttpError(error.message, 500))
    }
}

const getPlacesByUserId = async (req, res, next) => {
    try {
        const result = await Place.find({ userId: req.params.userId }).exec()
        if (result.length === 0) {
            return next(new HttpError('No places found for user', 404))
        }
        res.status(200).json({ result })
    } catch (error) {
        next(new HttpError(error.message, 500))
    }
}

const createPlace = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty() || !req.file) {
        return next(new HttpError('Invalid input/file size', 422))
    }
    const { title, description, address } = req.body
    // if(req.user._id !== userId) {
    //     return next(new HttpError('You\'re not authorized to create resources', 401))
    // }
    let data
    try {
        data = await getCoordsFromAddress(address)
    } catch (error) {
        return next(error)
    }
    let image
    try {
        image = await uploadToS3(req.file)
    } catch (error) {
        return next(new HttpError(error.message, 500))
    }
    fs.unlink(req.file.path, (err) => {
        if(err) return next(new HttpError(err.message, 500))
    })
    const newPlace = new Place({
        title,
        description,
        address: data.formatted_address,
        location: data.geometry.location,
        image: image.Key,
        userId: req.user._id
    })
    let user
    try {
        user = await User.findById(req.user._id).exec()
        if(!user) {
            return next(new HttpError('User does not exist', 400))
        }
    } catch (error) {
        return next(new HttpError(error.message, 500))
    }
    try {
        const session = await mongoose.startSession()
        await session.withTransaction(async () => {
            await newPlace.save()
            user.places.push(newPlace)
            await user.save()
        })
        await session.endSession()
        res.status(201).json({ result: "Place created successfully for user" })
    } catch (error) {
        next(new HttpError(error.message, 500))
    }
}

const updatePlaceById = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()) {
        return next(new HttpError('Invalid input / Wrong number of arguments', 422))
    }
    const { title, description, address } = req.body
    const oldPlace = await Place.findById(req.params.placeId).exec()
    if(!oldPlace) {
        return next(new HttpError('Could not find place', 404))
    } else if(oldPlace.userId.toString() !== req.user._id) {
        return next(new HttpError('You\'re not authorized to update this resource', 401))
    }
    let image
    if(req.file) {
        try {
            image = await uploadToS3(req.file)
            await deleteFileFromS3(oldPlace.image)
        } catch (error) {
            return next(new HttpError(error.message, 500))
        }
        fs.unlink(req.file.path, (err) => {
            if(err) {
                return next(new HttpError(err.message, 500))
            }
        })
    }
    let data
    try {
        data = await getCoordsFromAddress(address)
    } catch (error) {
        return next(error)
    }
    const updatedPlace = {
        title,
        description,
        address: data.formatted_address,
        location: data.geometry.coordinates,
        image: req.file ? image.Key : oldPlace.image
    }
    try {
        const result = await Place.updateOne({ _id: req.params.placeId }, updatedPlace ).exec()
        res.status(200).json({ result })
    } catch (error) {
        next(new HttpError(error.message, 500))
    }
}

const deletePlaceById = async (req, res, next) => {
    try {
        const place = await Place.findOne({ _id: req.params.placeId }).exec()
        if(!place) {
            return next(new HttpError('No place found', 404))
        } else if(place.userId.toString() !== req.user._id) {
            return next(new HttpError('You\'re not authorized to delete this resource', 401))
        }
        try {
            await deleteFileFromS3(place.image)
        } catch (error) {
            return next(new HttpError(error.message, 500))
        }
        const session = await mongoose.startSession()
        await session.withTransaction(async () => {
            await Place.deleteOne({ _id: place._id }).exec()
            await User.updateOne({ _id: place.userId }, { $pull: { places: req.params.placeId } }).exec()
        })
        await session.endSession()
        res.status(200).json({ result: "Place deleted successfully" })
    } catch (error) {
        next(new HttpError(error.message, 500))
    }
}

const updateLikesForPlace = async (req, res, next) =>{
    const place = await Place.findById(req.params.placeId).exec()
    if(!place) {
        return next(new HttpError('Place not found', 404))
    }
    let result
    try {
        if(place.likedUserIds.includes(mongoose.Types.ObjectId(req.user._id))) {
            result = await Place.updateOne({ _id: place._id }, { $pull: { likedUserIds: req.user._id } })
        } else {
            result = await Place.updateOne({ _id: place._id }, { $push: { likedUserIds: req.user._id } })
        }
    } catch (error) {
        return next(new HttpError('Something went wrong', 500))
    }
    res.status(200).json({ result })
}

module.exports = { getAllPlaces, getPlaceById, getPlacesByUserId, createPlace, updatePlaceById, deletePlaceById, updateLikesForPlace }