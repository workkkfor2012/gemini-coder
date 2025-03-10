---
title: Fill-In-the-Middle (FIM)
layout: home
parent: Usage
nav_order: 3
description: Generate intelligent code completions at your cursor position using Gemini Coder's Fill-In-the-Middle (FIM) feature
---

# Fill-In-the-Middle (FIM)

Gemini Coder's FIM feature enables you to insert AI generated code completions directly at cursor's position using the selected context. This feature uses much larger, more sophisticated models than those in other tools' "tab completion" features, which means it operates with a slight delay and requires manual invocation. We believe the trade-off of slightly slower but more accurate completions provides better value than faster but less reliable alternatives.

---

## How it works

### Select Context

Click on the Gemini icon in the activity bar and choose relevant files for context.

### Position Cursor

Place your cursor where you need code inserted in an open file.

### Run FIM

Execute `Gemini Coder: FIM Completion` from the Command Palette to use the default model or use `Gemini Coder: FIM Completion with...` to select a specific model.

### Completion

AI generated code is inserted at the cursor's position.

{: .note }
Bind `Gemini Coder: FIM Completion` to a keyboard shortcut for fastest access.

{: .note }

## Available Commands

### `Gemini Coder: FIM Completion`

Get fill-in-the-middle completion using the default model.

### `Gemini Coder: FIM Completion with...`

Lets you select which model to use for FIM completion.

### `Gemini Coder: FIM Completion to Clipboard`

Instead of inserting completion directly, copies the FIM completion content to your clipboard for use in other tools.

### `Gemini Coder: Change Default FIM Model`

Configure which model should be used as the default for FIM completions.
