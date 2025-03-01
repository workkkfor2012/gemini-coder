import browser from 'webextension-polyfill'
import { connect_websocket } from './websocket'

// Configuration for keepalive
export const KEEPALIVE_ALARM_NAME = 'websocket-keepalive'
export const KEEPALIVE_INTERVAL = 1 // minutes

/**
 * Initialize the keepalive mechanism for Chromium browsers
 */
export function setup_keep_alive() {
  // Keep alive with alarms in chromium browsers
  if (!browser.browserAction) {
    // Setup keep-alive mechanism using alarms
    chrome.alarms.create(KEEPALIVE_ALARM_NAME, {
      periodInMinutes: KEEPALIVE_INTERVAL
    })

    // Listen for alarm events to keep the service worker alive
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name == KEEPALIVE_ALARM_NAME) {
        connect_websocket()
      }
    })
  }
}