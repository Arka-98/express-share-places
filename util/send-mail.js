const nodemailer = require('nodemailer');
const HttpError = require('../models/http-error');

async function sendMail(to, subject, body) {

    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
            user: process.env.SENDER_MAIL_ADDRESS,
            pass: process.env.SENDER_PASSWORD
        },
        secure: true
    });
  
    try {
        let info = await transporter.sendMail({
            from: `"Share Places Admin" <${process.env.SENDER_MAIL_ADDRESS}>`, // sender address
            to: to, // list of receivers
            subject: `shareplaces.com : ${subject}`, // Subject line
            html: body + '<br><br><p>This is an auto generated message. Please do not reply.<br><br>Thanks and regards,<br>Admin @SharePlaces' // plain text body
            // html: "<b>Hello world?</b>", // html body
        });
    } catch (error) {
        throw new HttpError(error.message, 500)
    }
  }

  module.exports = sendMail