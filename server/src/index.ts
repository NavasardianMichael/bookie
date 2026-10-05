import { createApp } from './app.js'
import { config } from './config.js'
import { startReminderJob } from './jobs/reminderJob.js'

import './load-env.js'

const app = createApp()

app.listen(config.port, config.host, () => {
  console.log(`Bookie API listening on http://${config.host}:${config.port}`)
  // Here rather than in `createApp`, so tests and scripts that build the app never poll.
  if (config.remindersEnabled) startReminderJob()
})
