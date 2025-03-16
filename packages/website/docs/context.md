---
hide_table_of_contents: true
sidebar_position: 3
---

# Context

Gemini Coder allows you to granularly control which files are included when using API features (FIM, file refactoring) and chat. The extension provides three context related views that effectively replace the original Explorer view for common uses like opening editors or creating files:

- open editors
- workspace tree
- websites

To better understand the "weight" of each item the extension calculates approximate token count where each character is counted as 0.25 tokens.

Selection of available websites for the context is possible in the popup of the [web browser integration](/docs/installation/web-browser-integration).

:::tip
For the best results keep context focused on task at hand. A good practice is
including additional files helping AI understand your team's coding conventions.
:::

_The structure of context:_

```
<files>
  <text title="">...</text>   (website)
  <file path="...">...</file>
  ...
</files>
```

## Views

### Open Editors

The open editors view shows your currently open files. Configuration option `Gemini Coder: Attach Open Files` determines if newly opened files are automatically included in the context.

### Workspace

The workspace view shows all files in your project and allows batch selections. Gitignored files and non-code files are automatically excluded. You can exclude additional file extensions by adjusting configuration option `Gemini Coder: Ignored Extensions`.

### Websites

The websites view shows websites selected in the popup of the [web browser integration](/docs/installation/web-browser-integration).

## Available Commands

##### `Gemini Coder: Copy Context`

Use the command to copy the current context to the clipboard. This is useful for grabbing context for use in other tools.