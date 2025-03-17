---
sidebar_position: 5
hide_table_of_contents: true
---

# Privacy

TLDR; Gemini Coder does not collect any user data.

## Core principles

### No data collection

Neither the VS Code extension nor the web browser integration sends any of your code or instructions to any servers and does not track usage.

### Direct API communication

When using API-based features (FIM, Refactoring or Apply Changes) your messages are sent directly to the provider (e.g. Gemini API).

### Local WebSocket server

The VS Code extension sets up the WebSocket server locally on your system, which orchestrates message flow between all VS Code processes and the web browser integration extension.
