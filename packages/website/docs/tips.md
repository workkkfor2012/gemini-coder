---
title: Tips
layout: home
nav_order: 4
description: Collection of tips and best practices for using Gemini Coder effectively
---

# Tips

Here are some tips and best practices for using Gemini Coder effectively.

---

## Context

- Select only relevant files to avoid overwhelming the AI with unnecessary information
- Include files that demonstrate your team's coding conventions
- Monitor the token count to stay within reasonable context lengths
- Regularly clear unnecessary files from context to maintain focus

## Chat

- Compare responses across different AI platforms for challenging problems
- Create task-specific presets (debugging, refactoring, explaining)
- Configure appropriate temperature settings for different use cases
- Add helpful prompt prefixes and suffixes to guide the AI

## FIM (Fill-In-the-Middle)

- Use Gemini Flash for quick, straightforward completions
- Switch to Gemini Flash 2.0 Thinking for more complex cases requiring deeper context understanding
- Bind the FIM completion command to a keyboard shortcut for faster access
- Add comments above the cursor position to explain what code should be generated
- Remove excessive comments after getting the completion

## Refactoring

- Be specific about what aspects of the code should change and why
- Select relevant text blocks to focus the refactoring on particular sections
- Include context files containing patterns or conventions that should inform the refactoring
- Use Gemini 2.0 Thinking for its greater output tokens limit (64k)
- Consider using the Chat feature for complex refactorings across multiple files
- Always review the AI-generated changes before committing them

## Applying changes

- Review the suggested changes carefully before applying
- Use Gemini 2.0 Thinking for its larger output lenghts, code generation speed and reliability
