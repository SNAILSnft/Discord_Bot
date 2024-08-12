require('dotenv').config();
const objects = require('./list.js');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for an object')
    .addStringOption(option => 
      option.setName('query')
        .setDescription('The name to search for')
        .setRequired(true))
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log('Bot is ready!');
  
  // Get the ID of the first guild the bot is in
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.log('Bot is not in any guild');
    return;
  }

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(client.user.id, guild.id),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

// Function to search objects
function searchObjects(query) {
  return objects.filter(x => x.name.toLowerCase().includes(query.toLowerCase()));
}

// Handle message creation event (existing functionality)
client.on("messageCreate", (message) => {
  if (message.author.bot) return; // Ignore messages from bots

  try {
    let res = searchObjects(message.content);
    if (res.length > 0) {
      if (res[0].URL) {
        message.channel.send(res[0].URL);
      }
    } else {
      console.log("No matching object found for message:", message.content);
    }
  } catch (error) {
    console.error(`Error processing message: ${error}`);
  }
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'search') {
    const query = interaction.options.getString('query');
    let res = searchObjects(query);

    if (res.length > 0) {
      if (res[0].URL) {
        await interaction.reply(res[0].URL);
      } else {
        await interaction.reply('Found an object, but it has no URL.');
      }
    } else {
      await interaction.reply('No matching object found.');
    }
  }
});

client.login(process.env.TOKEN);