import app from './app'
import socketLogic from './controllers/socketProfile'
require('dotenv').config({ path: './config/config.env' })
const connectDatabase = require('../config/dbConnection')

// Handling Uncaught Exception
// process.on('uncaughtException', (err) => {
//   console.log(`Error: ${err.message}`)
//   console.log('Shutting down the server due to Uncaught Exception')
//   process.exit(1)
// })

connectDatabase()

const server = app.listen(process.env.PORT, () => {
  console.log('Server is running.')
})

socketLogic(server)
// Unhandled Promise Rejection
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err}`)
  console.log('Shutting down the server due to Unhandled Promise Rejection')

  server.close(() => {
    process.exit(1)
  })
})
