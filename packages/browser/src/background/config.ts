// Central configuration file for shared constants

export const CONFIG = {
  // WebSocket configuration
  RECONNECT_DELAY: 5000, // 5 seconds

  // Server health check
  // Keep-alive configuration
  KEEPALIVE_ALARM_NAME: 'websocket-keepalive',
  KEEPALIVE_INTERVAL: 1, // minutes

  // UI settings
  BADGE_COLOR: '#0dca3b',
  BADGE_TEXT_COLOR: 'white',
  CONNECTED_BADGE: '✓',
  DISCONNECTED_BADGE: ''
}