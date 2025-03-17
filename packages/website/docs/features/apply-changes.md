---
hide_table_of_contents: true
sidebar_position: 5
---

# Apply changes

Gemini Coder's Apply Changes feature helps you implement AI-suggested modifications to your code. When AI tools suggest partial updates to your file (like changing specific sections while preserving others), this feature helps transform those suggestions into a complete updated file.

_Structure of the generated message:_

```
<file>...</file>
User requested refactor of a file. In your response send fully updated <file> only, without explanations or any other text.
[Clipboard-stored instructions]
```

## How it works

### Copy AI suggestions

When an AI suggests changes in chat, copy the output for the given file to your clipboard.

### Open target file

Make sure the file you want to modify is open and active in the editor.

### Run command

Execute one of the Apply Changes commands.

### Review updates

The AI will process the suggestions and generate a complete updated file with all changes properly applied.

## Available commands

##### `Gemini Coder: Apply Changes to this File`

Applies changes to the current file using the default model.

##### `Gemini Coder: Apply Changes to this File with...`

Lets you select which model to use for applying changes.

##### `Gemini Coder: Apply Changes to Clipboard`

Instead of applying changes directly with API, copies the apply changes prompt to your clipboard for use in other tools.

##### `Gemini Coder: Change Default Apply Changes Model`

Configure which model should be used as the default for applying changes.
