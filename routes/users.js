const express = require('express')
const usersController = require('../controllers/users-controller')
const { check } = require('express-validator')
const upload = require('../middleware/file-upload')
const auth = require('../middleware/auth')
const authResetPassword = require('../middleware/auth-reset-password')
const router = express.Router()

router.get('/', usersController.getAllUsers)

router.post('/register', upload.single('image'), [
    check('username').notEmpty(),
    check('email').normalizeEmail().isEmail(),
    check('contact').isNumeric().isLength({ min: 10, max: 10 }),
    check('password').isLength({ min: 8 })
], usersController.registerUser)

router.post('/login', usersController.loginUser)

router.post('/forgot-password', [
    check('email').normalizeEmail().isEmail()
], usersController.sendOtp)

router.put('/reset-password', [
    check('email').normalizeEmail().isEmail(),
    check('password').isLength({ min: 8 })
], authResetPassword, usersController.updatePassword)

router.use(auth)

router.put('/:userId', upload.single('image'), [
    check('username').optional({ checkFalsy: true }),
    check('contact').optional({ checkFalsy: true }).isNumeric().isLength({ min: 10, max: 10 }),
    check('email').not().exists()
], usersController.updateUser)

module.exports = router