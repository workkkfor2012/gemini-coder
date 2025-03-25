---
hide_table_of_contents: true
sidebar_position: 5
---

# Apply changes

The feature helps you integrate AI-suggested changes to your codebase with a single click. You can either copy the whole response or just one file. Then come back to the editor and hit "Apply changes" button in the status bar.

- If you copied updates to a specific file, make sure its original version is currently seen (active editor)
- If you copied whole response, this is what happens:
  - text surrounding code blocks is discarded
  - 

When AI tools suggest partial updates to your file (like changing specific sections while preserving others), this feature helps transform those suggestions into a complete updated file. To use the feature, copy chat response and click "Apply changes" in the VS Code's status bar.

_Structure of the generated message:_

```
<file>...</file>
User requested refactor of a file. In your response send fully updated <file> only, without explanations or any other text.
[Clipboard-stored instructions]
```

## Available commands

##### `Gemini Coder: Apply Changes`

Applies changes to the current file using the default model.

##### `Gemini Coder: Apply Changes with...`

Lets you select which model to use for applying changes.

##### `Gemini Coder: Apply Changes to Clipboard`

Instead of applying changes directly with API, copies the apply changes prompt to your clipboard for use in other tools.

##### `Gemini Coder: Change Default Apply Changes Model`

Configure which model should be used as the default for applying changes.
