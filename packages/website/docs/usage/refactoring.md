---
title: Refactoring
layout: home
parent: Usage
nav_order: 4
description: Transform your code with instruction using Gemini Coder's AI-powered refactoring capabilities
---

# Refactoring

Gemini Coder's refactoring feature allows you to modify the current file based on instruction. This is perfect where code insertions at cursor position (Fill-In-the-Middle) aren't enough but it is at the cost of speed as the whole file must be regenerated.

## How it works

### Select Context

Choose relevant files to provide the AI with necessary context about your codebase.

### Choose Target File

Open the file you want to refactor in the editor.

### Run Command

Execute one of the refactoring commands and provide your instruction.

### Review Changes

The AI will generate a complete new version of your file with the requested changes.

## Best practices

### Be Specific

Clearly describe what aspects of the code should change and why.

### Select Text

Optionally select specific code blocks to focus the refactoring on particular sections.

### Include Context

Select relevant files that contain patterns, conventions, or dependencies that should inform the refactoring.

### Review Changes

Always carefully review the AI-generated changes before committing them.

## Example instructions

Here are some effective refactoring instructions:

- "Refactor this code to use async/await instead of promises with .then()"
- "Convert this class-based component to a functional component with hooks"
- "Implement the repository pattern for database access in this file"
- "Extract the duplicate logic into reusable functions"
- "Refactor to follow the SOLID principles, focusing on single responsibility"

## Available commands

### `Gemini Coder: Refactor this File`

Refactors the current file using the default model.

### `Gemini Coder: Refactor this File with...`

Lets you select which model to use for refactoring.

### `Gemini Coder: Refactor to Clipboard`

Instead of applying changes directly, copies the refactoring prompt to your clipboard for use in other tools.

### `Gemini Coder: Change Default Refactoring Model`

Configure which model should be used as the default for refactoring.
