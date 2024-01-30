// Import dotenv and configure it
require('dotenv').config()
const objects = require('./list.js');
// Import necessary classes from discord.js
const { Client, GatewayIntentBits } = require('discord.js');
const Discord = require('discord.js');
// Create a new Discord client
const client = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
})
// Handle message creation event
client.on("messageCreate", (message) => {
  try {
    let res = objects.filter((x) => message.content.toLowerCase().includes(x.name));
    if (res.length > 0) {
      if (res[0].URL) {
        message.channel.send(res[0].URL);
      }
    } else {
      console.log("");
    }
  } catch (error) {
    console.error(`Error: ${error}`);
  }
});





client.login(process.env.TOKEN);
