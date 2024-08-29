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
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('socials')
    .setDescription('Get our social media links')
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log('Bot is ready!');
  try {
    console.log('Registering slash commands.');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

function searchObjects(query) {
  return objects.filter(x => x.name.toLowerCase().includes(query.toLowerCase()));
}

function getSocialLinks() {
  return [
    { name: 'Linktree', url: 'https://linktr.ee/snailsnft' },
    { name: 'Medium', url: 'https://medium.com/@snailsnft/' },
    { name: 'OmniFlix', url: 'https://omniflix.tv/channel/65182782e1c28773aa199c84' },
    { name: 'YouTube', url: 'https://www.youtube.com/@SNAILS._/videos' }
  ];
}

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
  } else if (interaction.commandName === 'socials') {
    const socialLinks = getSocialLinks();
    let response = 'Here are our social media links:\n';
    socialLinks.forEach(link => {
      response += `${link.name}: ${link.url}\n`;
    });
    await interaction.reply(response);
  }
});

client.login(process.env.TOKEN);
