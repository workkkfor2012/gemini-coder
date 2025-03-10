---
title: Refactoring
layout: home
parent: Usage
nav_order: 4
---

# Refactoring

Gemini Coder's refactoring feature allows you to modify the current file based on natural language instructions. This is perfect for modernizing code, implementing design patterns, or changing implementation approaches without having to rewrite everything manually.

## How It Works

1. **Select Context**: Choose relevant files to provide the AI with necessary context about your codebase.
2. **Choose Target File**: Open the file you want to refactor in the editor.
3. **Run Command**: Execute one of the refactoring commands and provide your instruction.
4. **Review Changes**: The AI will generate a complete new version of your file with the requested changes.

## Available Commands

- **Refactor this File** (`Gemini Coder: Refactor this File`): Refactors the current file using the default model.
- **Refactor with Model Selection** (`Gemini Coder: Refactor this File with...`): Lets you select which model to use for refactoring.
- **Refactor to Clipboard** (`Gemini Coder: Refactor to Clipboard`): Instead of applying changes directly, copies the refactoring prompt to your clipboard for use in other tools.
- **Change Default Model** (`Gemini Coder: Change Default Refactoring Model`): Configure which model should be used as the default for refactoring.

## Best Practices

1. **Be Specific**: Clearly describe what aspects of the code should change and why.
2. **Select Text**: Optionally select specific code blocks to focus the refactoring on particular sections.
3. **Include Context**: Select relevant files that contain patterns, conventions, or dependencies that should inform the refactoring.
4. **Review Changes**: Always carefully review the AI-generated changes before committing them.

## Example Instructions

Here are some effective refactoring instructions:

- "Refactor this code to use async/await instead of promises with .then()"
- "Convert this class-based component to a functional component with hooks"
- "Implement the repository pattern for database access in this file"
- "Extract the duplicate logic into reusable functions"
- "Refactor to follow the SOLID principles, focusing on single responsibility"

{: .note }
For complex refactorings across multiple files, consider using the Chat feature which provides more interactive guidance.

## Tips

### Thinking model

We suggest you using Gemini 2.0 Thinking for its greater output tokens limit (64k) and great reliability on the task.
