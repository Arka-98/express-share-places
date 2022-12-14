const multer = require('multer')
const { v4: uuidv4 } = require('uuid')

const MIME_TYPE_MAP = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/jpg': 'jpg'
}

const upload = multer({
    limits: {  fileSize: 3000000 },
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'public/images')
        },
        filename: (req, file, cb) => {
            const ext = MIME_TYPE_MAP[file.mimetype]
            cb(null, uuidv4() + '.' + ext)
        }
    }),
    fileFilter: (req, file, cb) => {
        const isValid = !!MIME_TYPE_MAP[file.mimetype]
        const error = isValid ? null : new Error('Invalid image type')
        cb(error, isValid)
    }
})

module.exports = upload