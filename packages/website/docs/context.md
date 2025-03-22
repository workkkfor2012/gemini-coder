---
hide_table_of_contents: true
sidebar_position: 3
---

# Context

What sets Gemini Coder apart from other AI coding assistants is its focus on context.

> Too many tokens fighting for attention may *decrease* performance due to being too "distracting", diffusing attention too broadly and decreasing a signal to noise ratio in the features. ~Andrej Karpathy

The extension gives the programmer full control over of what data is sent in each message, to a single token. Our design choice praises traditional, thoughtful programming and lets you squeeze maximum of AI capabilities.

Gemini Coder provides context related views that mimic the default Explorer view for common uses like opening editors or creating files:

- open editors
- workspace tree
- websites (managed by the web browser integration)

To better understand the "weight" of each item the extension calculates approximate token count where each character is counted as 0.25 tokens.

:::tip
For the best results keep context focused on task at hand. A good practice is
including additional files helping AI understand your team's coding conventions.
:::

_The structure of context:_

```
<files>
  <text title="">...</text>   (websites managed by the web browser integration)
  <file name="...">...</file>
  ...
</files>
```

## Views

### Open editors

The open editors view shows your currently open files. Configuration option `Gemini Coder: Attach Open Files` determines if newly opened files are automatically included in the context.

### Workspace

The workspace view shows all files in your project and allows batch selections. Gitignored files and non-code files are automatically excluded. You can exclude additional file extensions by adjusting configuration option `Gemini Coder: Ignored Extensions`.

### Websites

The websites view shows websites selected in the popup of the [web browser integration](/docs/installation/web-browser-integration).

## Available commands

##### `Gemini Coder: Copy Context`

Use the command to copy the current context to the clipboard. This is useful for grabbing context for use in other tools.
