const HttpError = require('../models/http-error')
const { validationResult } = require('express-validator')
const { v4: uuidv4 } = require('uuid')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const User = require('../models/user-model')
const fs = require('fs')
const sendMail = require('../util/send-mail')
const { uploadToS3, deleteFileFromS3 } = require('../util/s3-upload')

const getAllUsers = async (req, res, next) => {
    const result = await User.find({}, '-password').exec()
    if(result.length === 0) {
        return next(new HttpError('No users found', 404))
    }
    res.status(200).json({ result })
}

const loginUser = async (req, res, next) => {
    const { email, password } = req.body
    const user = await User.findOne({ email }).exec()
    if(!user) {
        return next(new HttpError('Invalid email/password', 401))
    }
    let isValidPassword = false
    try {
        isValidPassword = await bcrypt.compare(password, user.password)
    } catch (error) {
        return next(new HttpError('Something went wrong. Please try again', 500))
    }
    if(!isValidPassword) {
        return next(new HttpError('Invalid email/password', 403))
    }
    const userData = {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        contact: user.contact,
        image: user.image
    }
    let accessToken
    jwt.sign({ _id: user._id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' }, (err, token) => {
        if(err) return next(new HttpError('Could not log you in, Please try again', 500))
        accessToken = token
        res.status(200).json({ result: { userData, accessToken } })
    })
}

const registerUser = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty() || !req.file) {
        return next(new HttpError('Invalid input', 422))
    }
    const { username, email, password, contact } = req.body
    let hashedPassword
    try {
        hashedPassword = await bcrypt.hash(password, 12)
    } catch (error) {
        return next(new HttpError('Something went wrong. Please try again', 500))
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
    try {
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            contact,
            image: image.Key,
            places: [],
        })
        const result = await newUser.save()
    } catch(error) {
        return next(new HttpError(error.code === 11000 ? "Email already registered" : error.message, 500))
    }
    res.status(201).json({ result: 'User registered successfully' })
}

const updateUser = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()) {
        return next(new HttpError('Invalid input', 422))
    }
    const user = await User.findById(req.params.userId).exec()
    if(!user) {
        return next(new HttpError('User does not exist', 401))
    }
    const { username, contact } = req.body
    let image
    if(req.file) {
        try {
            image = await uploadToS3(req.file)
            await deleteFileFromS3(user.image)
        } catch (error) {
            return next(new HttpError(error.message, 500))
        }
        fs.unlink(req.file.path, (err) => {
            if(err) return next(new HttpError(err.message, 500))
        })
    }
    const updatedUser = {
        username,
        contact,
        image: req.file ? image.Key : user.image
    }
    try {
        const result = await User.updateOne({ _id: req.params.userId }, updatedUser).exec()
        res.status(200).json({ result })
    } catch (error) {
        next(new HttpError(error.message, 500))
    }
}

const sendOtp = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()) {
        return next(new HttpError('Invalid input', 422))
    }
    const { email } = req.body
    const user = await User.findOne({ email })
    if(!user) return next(new HttpError('Email not registered', 404))
    const payload = { id: user._id, email: user.email }
    const secret = process.env.ACCESS_TOKEN_SECRET + user.password
    let token
    try {
        token = jwt.sign(payload, secret, { expiresIn: '5m' })
    } catch (error) {
        return next(new HttpError('Something went wrong. Please try again', 500))
    }
    const otp = Math.floor(Math.random() * 1000000)
    try {
        await sendMail(email, 'OTP for password reset', `OTP for resetting your password at SharePlaces is <b>${otp}</b>`)
    } catch (error) {
        return next(error)
    }
    res.status(200).json({ result: { otp, token } })
}

const updatePassword = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()) {
        return next(new HttpError('Invalid input', 422))
    }
    let newHashedPassword
    try {
        newHashedPassword = await bcrypt.hash(req.body.password, 12)
    } catch (error) {
        return next(new HttpError('Something went wrong. Please try again', 500))
    }
    try {
        const result = await User.updateOne({ _id: req.user.id }, { $set: { password: newHashedPassword } })
        if(!result.matchedCount) return next(new HttpError('Could not find user', 404))
    } catch (error) {
        return next(new HttpError(error.message, 500))
    }
    res.status(200).json({ result: 'Updated password for user' })
}

module.exports = { getAllUsers, loginUser, registerUser, updateUser, sendOtp, updatePassword }