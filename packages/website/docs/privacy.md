---
sidebar_position: 5
hide_table_of_contents: true
---

# Privacy

Gemini Coder does not collect any personal data or usage statistics.

## Core principles

### Open source

The entire codebase is open source and available on GitHub for public review.

### No tracking

Neither the VS Code extension nor the web browser integration track its usage.

### API communication

When using API-based features (FIM, Refactoring or Apply Changes) your messages are sent directly to the provider's endpoint (e.g. Gemini API).

### Web browser communication

The VS Code extension sets up the WebSocket server locally on your system, which orchestrates message flow between all VS Code processes and the web browser integration.
