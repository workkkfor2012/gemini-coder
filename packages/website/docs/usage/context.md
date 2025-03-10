---
title: Context
layout: home
parent: Usage
nav_order: 1
description: Manage which files are included in your AI prompts with Gemini Coder's powerful context control features
---

# Context

Gemini Coder allows you to granularly control which files are included when using API features (FIM, Refactor, Apply changes) and chat. The extension provides two context related views that effectively replace the original Explorer view - list of open editors and workspace tree. To better understand the "weight" of each folder and file the extension calculates approximate token count where each character is counted as 0.25 tokens.

{: .note }
For the best results keep context focused on task at hand. A good pracitice is including other files helping understand your team's coding conventions.

---

## Views

### Open Editors

The open editors view shows your currently open files. Configuration option `Gemini Coder: Attach Open Files` determines if newly opened files are automatically included in the context.

### Workspace

The workspace view shows all files in your project and allows batch selections. Gitignored files and non-code files are automatically excluded. You can exclude additional file extensions by adjusting configuration option `Gemini Coder: Ignored Extensions`.

---

## Related features

### Total tokens badge

Activity bar icon's badge shows approximate number of selected tokens. The count does not take into account additional XML tags wrapping each file `...`.

## Available Commands

### `Gemini Coder: Copy Context`

Use the command to copy the current context to the clipboard. This is useful for grabbing context for use in other tools.
