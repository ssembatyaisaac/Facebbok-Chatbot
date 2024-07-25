const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 5000, () => {
    console.log('proccess.env.PORT:', process.env.PORT);
    console.log('Express servier listening on port %d in %s mode',
        server.address().port, app.settings.env);
});

// For Facebook Validation
app.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] && req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    }
    else {
        res.status(403).end();
    }
});

/* Handling all messenges */
app.post('/webhook', (req, res) => {
    console.log(req.body);
    if (req.body.object === 'page') {
        req.body.entry.forEach((entry) => {
            entry.messaging.forEach(async (event) => {
                if (event.message && event.message.text) {
                    await sendMessage(event);
                }
            });
        });
        res.status(200).end();
    }
});

const request = require('request');
async function sendMessage(event) {
    let sender = event.sender.id;
    let text = await samSays(event.message.text);

    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: process.env.FB_ACCESS_TOKEN },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: { text: text }
        }
    }, function (error, response) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

const openai = new OpenAI();

async function samSays(text) {
    try {
        openai.apiKey = process.env.OPENAI_API_KEY;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: text }],
            model: "gpt-4o-mini",
        });

        let responseText = completion.choices[0].message.content;

        // Trim the response to a length of 2000 characters
        if (responseText.length > 2000) {
            responseText = responseText.substring(0, 2000);
        }

        return responseText;
    } catch (error) {
        return `Error: ${error.message}`;
    }
}