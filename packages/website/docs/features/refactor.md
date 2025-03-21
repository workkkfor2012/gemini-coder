---
hide_table_of_contents: true
sidebar_position: 4
---

# Refactor

Gemini Coder's refactoring feature allows you to modify the current file based on a natural language instructions. This is perfect where code insertions at cursor position (Fill-In-the-Middle) aren't enough but it is at the cost of speed as the whole file must be regenerated.

_Structure of the generated message:_

```
<files>
  <file name="...">...</file>
  ...
</files>
User requested refactor of a file "[PATH]". In your response send fully updated file only, without explanations or any other text.
[Refactoring instructions]
```

## How it works

### Select context

Choose relevant files to provide the AI with necessary context about your codebase.

### Choose target file

Open the file you want to refactor in the editor.

### Run command

Execute one of the refactoring commands and provide your instruction.

### Review changes

The AI will generate a complete new version of your file with the requested changes.

## Best practices

### Be specific

Clearly describe what aspects of the code should change and why.

### Select text

Optionally select specific code blocks to focus the refactoring on particular sections.

### Include context

Select relevant files that contain patterns, conventions, or dependencies that should inform the refactoring.

### Review changes

Always carefully review the AI-generated changes before committing them.

## Example instructions

Here are some effective refactoring instructions:

- "Refactor this code to use async/await instead of promises with .then()"
- "Convert this class-based component to a functional component with hooks"
- "Implement the repository pattern for database access in this file"
- "Extract the duplicate logic into reusable functions"
- "Refactor to follow the SOLID principles, focusing on single responsibility"

## Available commands

##### `Gemini Coder: Refactor this File`

Refactors the current file using the default model.

##### `Gemini Coder: Refactor this File with...`

Lets you select which model to use for refactoring.

##### `Gemini Coder: Refactor to Clipboard`

Instead of applying changes directly, copies the refactoring prompt to your clipboard for use in other tools.

##### `Gemini Coder: Change Default Refactoring Model`

Configure which model should be used as the default for refactoring.
