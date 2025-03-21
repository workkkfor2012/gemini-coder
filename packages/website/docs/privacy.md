---
sidebar_position: 5
hide_table_of_contents: true
---

# Privacy

Gemini Coder is open source, does not collect any data and works 100% locally.

## Core principles

### Open source

The entire codebase is distributed under MIT license.

### No tracking

Gemini Coder does not collect any usage statistics.

### API communication

When using API-based features (FIM completions, File refactoring or Applying changes) your messages are sent directly to the model provider.

### Web browser communication

The VS Code extension sets up the WebSocket server locally on your system, which orchestrates bi-directional message flow between all VS Code processes and the web browser integration.
