const axios = require("axios").default;
const Parser = require("rss-parser");

const httpService = axios.create({
  baseURL: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`,
});

async function sendWelcomeMessage(chatId) {
  await httpService.post(
    "/sendMessage",
    JSON.stringify({
      chat_id: chatId,
      text: "Please, select your preference programming language.",
      parse_mode: "markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "JavaScript",
              callback_data: "javascript",
            },
            {
              text: "Golang",
              callback_data: "golang",
            },
            {
              text: "Python",
              callback_data: "python",
            },
          ],
          [
            {
              text: "AWS",
              callback_data: "aws",
            },
            {
              text: "Serverless",
              callback_data: "serverless",
            },
            {
              text: "Azure",
              callback_data: "azure",
            },
          ],
        ],
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

async function sendJobOffers(chatId, messageId, term) {
  const stackOverFlowRSS = `https://stackoverflow.com/jobs/feed?q=${term}&sort=pubDate`;
  const parser = new Parser();
  const feed = await parser.parseURL(stackOverFlowRSS);

  const jobs = feed.items.slice(0, 10);

  await httpService.post(
    "/editMessageText",
    JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: `Your search term selected was: ${term}.`,
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  for (const job of jobs) {
    job.string = `**${job.title}**\n\nCategories: ${job.categories
      .map((j) => "#" + j)
      .join(" ")}\n\n${job.link}`;

    await httpService.post(
      "/sendMessage",
      JSON.stringify({
        chat_id: chatId,
        text: job.string,
        parse_mode: "markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Apply now",
                url: job.link,
              },
            ],
          ],
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}

async function sendErrorMessage(chatId) {
  await httpService.post(
    "/sendMessage",
    JSON.stringify({
      chat_id: chatId,
      text: "Sorry, I can't search jobs offers right now 😥",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

module.exports = async function (context, req) {
  try {
    const { callback_query } = req.body;
    if (callback_query) {
      const chatId = callback_query.message.chat.id;
      const messageId = callback_query.message.message_id;
      const term = callback_query.data;

      await sendJobOffers(chatId, messageId, term);
    } else {
      const chatId = req.body.message.chat.id;
      await sendWelcomeMessage(chatId);
    }
  } catch (ex) {
    await sendErrorMessage();
    context.log.error(ex);
  } finally {
    context.res = {
      ok: true,
    };
  }
};
