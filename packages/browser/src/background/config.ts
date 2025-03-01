// Central configuration file for shared constants

export const CONFIG = {
  // WebSocket configuration
  WS_URL: 'ws://localhost:55155',
  WS_TOKEN: 'gemini-coder',
  RECONNECT_DELAY: 5000, // 5 seconds

  // Server health check
  HEALTH_CHECK_URL: 'http://localhost:55155/health',

  // Keep-alive configuration
  KEEPALIVE_ALARM_NAME: 'websocket-keepalive',
  KEEPALIVE_INTERVAL: 1, // minutes

  // UI settings
  BADGE_COLOR: '#0dca3b',
  BADGE_TEXT_COLOR: 'white',
  CONNECTED_BADGE: '✓',
  DISCONNECTED_BADGE: ''
}
