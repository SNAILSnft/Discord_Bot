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

// Set this to false since we're moving to guild-specific commands
const useGlobalCommands = false;

async function removeGlobalCommands() {
  try {
    console.log('Removing all global application (/) commands.');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: [] }
    );
    console.log('Successfully removed all global application (/) commands.');
  } catch (error) {
    console.error('Error removing global commands:', error);
  }
}

async function removeGuildCommands() {
  try {
    console.log('Removing guild-specific application (/) commands.');
    const guilds = await client.guilds.fetch();
    for (const [guildId, guild] of guilds) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: [] }
      );
      console.log(`Successfully removed all application (/) commands for guild ${guild.name} (${guildId}).`);
    }
    console.log('Finished removing guild-specific application (/) commands.');
  } catch (error) {
    console.error('Error removing guild commands:', error);
  }
}

async function registerGuildCommands() {
  try {
    console.log('Registering guild-specific application (/) commands.');
    const guilds = await client.guilds.fetch();
    for (const [guildId, guild] of guilds) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: commands }
      );
      console.log(`Successfully registered application (/) commands for guild ${guild.name} (${guildId}).`);
    }
    console.log('Finished registering guild-specific application (/) commands.');
  } catch (error) {
    console.error('Error registering guild commands:', error);
  }
}

client.once('ready', async () => {
  console.log('Bot is ready!');
  
  // Remove global commands
  // await removeGlobalCommands();
  
  // Remove and re-register guild-specific commands
  await removeGuildCommands();
  await registerGuildCommands();
});

client.on('guildCreate', async (guild) => {
  console.log(`Joined new guild: ${guild.name} (${guild.id})`);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, guild.id),
      { body: commands }
    );
    console.log(`Successfully registered commands for new guild ${guild.name} (${guild.id}).`);
  } catch (error) {
    console.error(`Error registering commands for new guild ${guild.name} (${guild.id}):`, error);
  }
});

function searchObjects(query) {
  return objects.filter(x => x.name.toLowerCase().includes(query.toLowerCase()));
}

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  try {
    let res = searchObjects(message.content);
    if (res.length > 0 && res[0].URL) {
      message.channel.send(res[0].URL);
    }
  } catch (error) {
    console.error(`Error processing message: ${error}`);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'search') {
    const query = interaction.options.getString('query');
    let res = searchObjects(query);

    if (res.length > 0 && res[0].URL) {
      await interaction.reply(res[0].URL);
    } else {
      await interaction.reply('No matching object found or no URL available.');
    }
  }
});

client.login(process.env.TOKEN);