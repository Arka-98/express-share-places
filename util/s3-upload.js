const fs = require('fs');
const AWS = require('aws-sdk')

const bucketName = process.env.AWS_BUCKET_NAME
const bucketRegion = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_KEY

const s3 = new AWS.S3({
    region: bucketRegion,
    credentials: {
        accessKeyId,
        secretAccessKey
    }
});

const uploadToS3 = (file) => {
    const fileStream = fs.createReadStream(file.path)

    const uploadParams = {
        Bucket: bucketName,
        Key: file.filename,
        Body: fileStream
    }

    return s3.upload(uploadParams).promise()
}

const deleteFileFromS3 = (fileKey) => {
    const deleteParams = {
        Bucket: bucketName,
        Key: fileKey
    }

    return s3.deleteObject(deleteParams).promise()
}

module.exports = { uploadToS3, deleteFileFromS3 }