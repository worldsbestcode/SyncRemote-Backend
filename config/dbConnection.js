const mongoose = require('mongoose')

const connectDatabase = () => {
  mongoose
    .connect(process.env.DB_URL, {
      useNewUrlParser: 'true',
      useUnifiedTopology: 'true'
    })
    .then(() => {
      console.log('Database Connected')
    })
}

module.exports = connectDatabase
