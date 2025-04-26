---
hide_table_of_contents: true
sidebar_position: 3
---

# Context selection

What sets Gemini Coder apart from other AI coding assistants is its focus on manual context selection.

The extension gives you full control over which files are attached to chats, FIM, or refactoring requests. Our design choice supports traditional, thoughtful programming, allowing you to maximize AI capabilities while minimizing spending.

Gemini Coder provides three context-related views:

- open editors
- workspace tree
- websites (managed by the web browser integration)

To better understand the "weight" of each item the extension calculates approximate token count where each character is counted as 0.25 tokens.

:::tip
For the best results keep context focused on task at hand. A good practice is
including additional files helping AI understand coding conventions it should follow.
:::

_The structure of context:_

```
<files>
  <text title="">...</text>   (checked websites, enabled for context in the web browser extension's popup)
  <file path="...">...</file> (checked files in workspace tree/open editors)
  ...
</files>
```

## Views

### Open editors

Your currently open files. Configuration option `Gemini Coder: Attach Open Files` determines if newly opened files are automatically included in the context.

### Workspace

All files in your project and allows batch selections. Gitignored or non-code files are automatically excluded.

### Websites

Websites selected in the popup of the [web browser integration](/docs/installation/web-browser-integration).

## Available commands

##### `Gemini Coder: Copy Context`

Use the command to copy the current context to the clipboard. This is useful for grabbing context for use in other tools.
