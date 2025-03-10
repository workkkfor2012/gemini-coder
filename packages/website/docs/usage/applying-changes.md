---
title: Applying Changes
layout: home
parent: Usage
nav_order: 4
---

# Applying Changes

Gemini Coder's Apply Changes feature helps you implement AI-suggested modifications to your code. When AI tools suggest partial updates to your file (like changing specific sections while preserving others), this feature helps transform those suggestions into a complete updated file.

## How It Works

1. **Copy AI Suggestions**: When an AI suggests changes in chat, copy the output for the given file to your clipboard.
2. **Open Target File**: Make sure the file you want to modify is open and active in the editor.
3. **Run Command**: Execute one of the Apply Changes commands.
4. **Review Updates**: The AI will process the suggestions and generate a complete updated file with all changes properly applied.

## Available Commands

- **Apply Changes** (`Gemini Coder: Apply Changes to this File`): Applies changes to the current file using the default model.
- **Apply Changes with Model Selection** (`Gemini Coder: Apply Changes to this File with...`): Lets you select which model to use for applying changes.
- **Apply Changes to Clipboard** (`Gemini Coder: Apply Changes to Clipboard`): Instead of applying changes directly with API, copies the apply changes prompt to your clipboard for use in other tools.
- **Change Default Model** (`Gemini Coder: Change Default Apply Changes Model`): Configure which model should be used as the default for applying changes.
