import browser from 'webextension-polyfill'

/**
 * Update extension icon based on connection status
 */
export const update_extension_icon = (params: { connected: boolean }) => {
  const backgroundColor = '#0dca3b'
  const color = 'white'
  if (chrome.action) {
    chrome.action.setBadgeBackgroundColor({ color: backgroundColor })
    chrome.action.setBadgeText({ text: params.connected ? '✓' : '' })
    chrome.action.setBadgeTextColor({ color })
  } else {
    browser.browserAction.setBadgeBackgroundColor({ color: backgroundColor })
    browser.browserAction.setBadgeText({ text: params.connected ? '✓' : '' })
    browser.browserAction.setBadgeTextColor({ color })
  }
}
