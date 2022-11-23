const jwt = require('jsonwebtoken')
const HttpError = require('../models/http-error')
const User = require('../models/user-model')

module.exports = async (req, res, next) => {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]
    if(!token) return next(new HttpError('Authorization failed', 403))
    let user
    try {
        user = await User.findOne({ email: req.body.email }).exec()
        if(!user) return next(new HttpError('User does not exist', 404))
    } catch (error) {
        return next(new HttpError(error.message, 500))
    }
    const secret = process.env.ACCESS_TOKEN_SECRET + user.password
    jwt.verify(token, secret, (err, payload) => {
        if(err) return next(new HttpError('Token invalid/expired', 403))
        req.user = payload
        next()
    })
}