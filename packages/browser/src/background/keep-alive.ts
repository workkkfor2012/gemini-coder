import browser from 'webextension-polyfill'

/**
 * Initialize the keepalive mechanism for Chromium browsers
 */
export function setup_keep_alive() {
  // Keep alive with alarms in chromium browsers
  if (!browser.browserAction) {
    const create_keep_alive_alarm = async () => {
      try {
        chrome.alarms.create('keep-alive', {
          when: Date.now() + 1000 * 30
        }) // 1 minute interval
      } catch (error) {
        console.error('Error creating KeepAlive alarm:', error)
      }
    }

    chrome.runtime.onStartup.addListener(create_keep_alive_alarm)
    chrome.runtime.onInstalled.addListener(create_keep_alive_alarm)
    chrome.alarms.onAlarm.addListener(() => {
      create_keep_alive_alarm()
    })
  }
}
