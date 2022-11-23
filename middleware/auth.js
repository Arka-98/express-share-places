const jwt = require('jsonwebtoken')
const HttpError = require('../models/http-error')

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]
    if(!token) return next(new HttpError('Authorization Failed', 403))
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if(err) return next(new HttpError('Token invalid/expired', 403))
        req.user = user
        next()
    })
}