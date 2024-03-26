const nodeMailer = require('nodemailer')

const sendContactEmail = async (options) => {
  const transporter = nodeMailer.createTransport({
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD
    }
  })

  const mailOptions = {
    from: `${options.name} <${options.email}>`,
    to: `${options.to}`,
    subject: `${options.subject}`,
    text: options.message,
    replyTo: options.email
  }

  await transporter.sendMail(mailOptions)
}

module.exports = sendContactEmail
