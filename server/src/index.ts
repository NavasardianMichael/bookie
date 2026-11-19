import { createApp } from './app.js'
import { config } from './config.js'
import { startReminderJob } from './jobs/reminderJob.js'
import { startScheduledSwitchJob } from './jobs/scheduledSwitchJob.js'

import './load-env.js'

const app = createApp()

app.listen(config.port, config.host, () => {
  console.log(`Bookie API listening on http://${config.host}:${config.port}`)
  // Here rather than in `createApp`, so tests and scripts that build the app never poll.
  // The flag names the first job; it means "this process runs the background jobs".
  if (config.remindersEnabled) {
    startReminderJob()
    startScheduledSwitchJob()
  }
})
