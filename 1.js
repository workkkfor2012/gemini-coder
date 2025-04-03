const express = require('express');
const app = express();
const port = 12345;

app.use(express.json());

app.all('/chat/completions', (req, res) => {
  const userContent = req.body;
  console.log('Received from client:', userContent); // Log all client content
  const fs = require('fs');
  fs.appendFile('1.json', JSON.stringify(userContent,null,4) + '\n', (err) => {
    if (err) {
      console.error('Error writing to file', err);
    } else {
      console.log('Content written to 1.json');
    }
  });

  const response = {
    id: "unique-id",
    object: "chat.completion",
    created: Date.now(),
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "This is a response based on the provided parameters."
        },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30
    }
  };

  res.json(response);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
