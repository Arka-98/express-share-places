const express = require('express')
const placesController = require('../controllers/places-controller')
const { check } = require('express-validator')
const upload = require('../middleware/file-upload')
const auth = require('../middleware/auth')
const router = express.Router()

router.get('/user/:userId', placesController.getPlacesByUserId)

router.get('/:placeId', placesController.getPlaceById)

router.use(auth)

router.post('/', upload.single('image'), [
    check('title').notEmpty(),
    check('description').isLength({ min: 5 }),
    check('address').notEmpty(),
], placesController.createPlace)

router.get('/', placesController.getAllPlaces)

router.put('/:placeId', upload.single('image'), [
    check('title').notEmpty(),
    check('description').isLength({ min: 5 }),
    check('address').notEmpty(),
    check('userId').not().exists()
], placesController.updatePlaceById)

router.delete('/:placeId', placesController.deletePlaceById)

router.put('/:placeId/like', placesController.updateLikesForPlace)

module.exports = router