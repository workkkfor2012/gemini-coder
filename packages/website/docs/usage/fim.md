---
title: Fill-In-the-Middle (FIM)
layout: home
parent: Usage
nav_order: 3
---

# Fill-In-the-Middle (FIM)

Gemini Coder's FIM feature enables you to insert AI generated code completions directly at cursor's position using the selected context. This feature uses much larger, more sophisticated models than those in other tools' "tab completion" features, which means it operates with a slight delay and requires manual invocation. We believe the trade-off of slightly slower but more accurate completions provides better value than faster but less reliable alternatives.

**Here's how it works:**

1. **Select Context**: Click on the Gemini icon in the activity bar and choose relevant files for context.
2. **Position Cursor**: Place your cursor where you need code inserted in an open file.
3. **Run FIM**: Execute `Gemini Coder: FIM Completion` from the Command Palette to use the default model or use `Gemini Coder: FIM Completion with...` to select a specific model.
4. **Completion**: AI generated code is inserted at the cursor's position.

{: .note }
Bind `Gemini Coder: FIM Completion` to a keyboard shortcut for fastest access.

{: .note }

## Tips

### Use comments

Explain what should be placed at cursor position above it. Remember to remove excessive comments afterwards.

### Switch between traditional and "thinking" models

Code infilling is a difficult task for a model. The default Gemini Flash is fast and generally works great but consider if some of your use cases don't require more "thinking". Gemini Flash 2.0 Thinking is slower but we find it an acceptable trade-off and use with `Gemini Coder: FIM Completion with...` in some demanding cases.
