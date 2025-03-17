---
sidebar_position: 5
hide_table_of_contents: true
---

# Privacy

Gemini Coder does not collect any user data.

## Core privacy principles

### No data collection

Neither the VS Code extension nor the web browser integration sends any of your code or instructions to any servers.

### Local processing

Context processing happens entirely within VS Code.

### Direct API connections

When using API-based features (FIM, Refactoring or Apply Changes), your selected context and instructions are sent directly to the provider.

### Local WebSocket server

The VS Code extension sets up separate process for the WebSocket server which orchestrate message flow between all VS Code processes and the web browser integration extension.