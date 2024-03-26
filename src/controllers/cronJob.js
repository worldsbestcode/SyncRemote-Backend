const cron = require('node-cron')
const cronSchedule = '0 0 * * *'
const syncRegistration = require('./../modals/registration/syncRegistration')

const cronTask = async () => {
  try {
    const userList = await syncRegistration.find()
    userList?.forEach(async (item) => {
      if (item?.deletedData?.status === true) {
        const totalTime = Date.now() - 1296000000
        if (item?.deletedData?.deleteTime < totalTime) {
          item.email = `example${item.email}`
          await syncRegistration.updateOne({ _id: item?._id }, item)
        }
      }
    })
  } catch (err) {
    console.log(err.message)
  }
}

// Schedule the cron job
cron.schedule(cronSchedule, cronTask)
