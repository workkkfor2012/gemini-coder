const express = require('express');
const app = express();
const port = 12345;

app.use(express.json());

app.all('/chat/completions', (req, res) => {
    const userContent = req.body;
    console.log('Received from client:', userContent); // Log all client content
    const fs = require('fs');
    fs.appendFile('1.json', JSON.stringify(userContent, null, 4) + '\n', (err) => {
        if (err) {
            console.error('Error writing to file', err);
        } else {
            console.log('Content written to 1.json');
        }
    });

    const openapiResponse = {
        "id": "chatcmpl-123",
        "object": "chat.completion",
        "created": 1712112000,
        "model": "gpt-4o",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": `Okay, I will create the file \`hello.py\` with the content \`print("Hello World!")\`.
<write_to_file>
<path>hello.py</path>
<content>
print("Hello World!")
</content>
<line_count>1</line_count>
</write_to_file>`
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 14,
            "completion_tokens": 16,
            "total_tokens": 30
        }
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(openapiResponse);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
