require('dotenv').config()
const express = require('express')
const path = require('path')
const cors = require('cors')
const fs = require('fs')
const usersRouter = require('./routes/users')
const placesRouter = require('./routes/places')
const HttpError = require('./models/http-error')
const mongoose = require('mongoose')
const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

app.use('/api/users', usersRouter)
app.use('/api/places', placesRouter)

app.use((req, res, next) => {
    throw new HttpError('No route found', 404)
})

app.use((error, req, res, next) => {
    if(req.file) {
        fs.unlink(req.file.path, (err) => {
            if(err) {
                console.log(err)
            }
        })
    }
    if(res.headerSent) {
        return next(error)
    }
    res.status(error.code || 500).json({ message: error.message || 'Internal server error' })
})

mongoose.connect(`mongodb+srv://${process.env.ATLAS_USERNAME}:${process.env.ATLAS_PASSWORD}@cluster0.wenaq.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`)
.then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Listening on port ${process.env.PORT}...`)
    })
})
.catch(error => console.log(error))