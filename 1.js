const express = require('express');
const app = express();
const port = 12345;



const content = `Okay, I will create the file \`hello.py\` with the content \`print("Hello World!")\`.
<write_to_file>
<path>hello.py</path>
<content>
print("Hello World!")
</content>
<line_count>1</line_count>
</write_to_file>` 


app.post('/chat/completions', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    const sendChunk = (content) => {
        const chunk = JSON.stringify({
            id: "chatcmpl-123",
            object: "chat.completion.chunk",
            created: 1694268190,
            model: "gpt-4o-mini",
            system_fingerprint: "fp_44709d6fcb",
            choices: [{
                index: 0,
                delta: content,
                logprobs: null,
                finish_reason: null
            }]
        });
        res.write(chunk + '\n');
    };

    sendChunk({ role: "assistant", content: "" });
    await new Promise(resolve => setTimeout(resolve, 100));
    sendChunk({ content: "Hello" });
    await new Promise(resolve => setTimeout(resolve, 100));
    sendChunk({});
    await new Promise(resolve => setTimeout(resolve, 100));

    res.end();
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
