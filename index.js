// Load environment variables from the .env file
require('dotenv').config();

// Import necessary Discord.js classes
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require('discord.js');

// Import objects and options from external files
const objects = require('./list.js');   // Contains direct URL queries
const options = require('./options.js'); // Contains queries requiring user input
const snailFacts = require('./snails.js'); // Contains snail facts

// Create the bot client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Define slash commands
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
    .setDescription('Get our social media links'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with using the bot'),
  new SlashCommandBuilder()
    .setName('snails')
    .setDescription('Get a random snail fact')
];

// Set up REST API instance
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Register commands when the bot is ready
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

// Handle interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'help':
        const helpMessage = `Available commands:
        /help - Get help with using the bot
        /snails - Get a random snail fact
        /search - Search for an object
        /socials - Get our social media links`;
        await interaction.reply({
          content: helpMessage,
          flags: ['Ephemeral'] // Sends the help message as ephemeral (only the user sees it)
        });
        break;

      case 'snails':
        // Handle the chuck command
        await interaction.deferReply();
        try {
          // Get a random fact from the snailFacts array
          const randomFact = snailFacts[Math.floor(Math.random() * snailFacts.length)];
          await interaction.editReply(randomFact);
        } catch (error) {
          console.error('Error fetching snail fact:', error);
          await interaction.followUp({
            content: "Sorry, I couldn't fetch a snail fact right now. Please try again later.",
            flags: ['Ephemeral']
          });
        }
        break;

      case 'search':
        // Handle the search command
        const query = interaction.options.getString('query');

        // Find if the query matches any direct URL
        let res = objects.filter(item => item.name.toLowerCase() === query.toLowerCase());

        if (res.length > 0) {
          // If direct match is found, send URL
          await interaction.reply({
            content: `You selected: ${res[0].name}. Here's the link: ${res[0].URL}`,
            flags: 64 // Ephemeral flag
          });
          return;
        }

        // Find if the query matches any options-based search
        let optionsRes = options.find(item => item.name.toLowerCase() === query.toLowerCase());

        if (optionsRes) {
          // Send buttons for the user to choose
          let response = `Please choose an option from the list below:\n`;

          // Create an ActionRowBuilder with ButtonBuilder components
          const row = new ActionRowBuilder().addComponents(
            optionsRes.options.map((option, index) =>
              new ButtonBuilder()
                .setCustomId(`option_${index + 1}`)
                .setLabel(option.name)
                .setStyle(ButtonStyle.Primary)
            )
          );

          // Send the options with buttons
          const message = await interaction.reply({
            content: response,
            components: [row],
            flags: 64,  // Ephemeral flag
          });

          // Listen for the button click event
          const filter = i => i.user.id === interaction.user.id && i.isButton();
          const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

          collector.on('collect', async i => {
            // Ignore the button click if the user already responded
            if (i.replied) return;

            const buttonIndex = parseInt(i.customId.split('_')[1]) - 1;
            const selectedOption = optionsRes.options[buttonIndex];

            // Respond with the selected option and its link
            if (selectedOption.URL) {
              await i.reply({
                content: `You selected: ${selectedOption.name}. Here's the link: ${selectedOption.URL}`,
                flags: 64 // Ephemeral flag
              });
            } else {
              await i.reply({
                content: `You selected: ${selectedOption.name}. No URL available.`,
                flags: 64 // Ephemeral flag
              });
            }

            // Disable the buttons after the user selects one
            const disabledRow = new ActionRowBuilder().addComponents(
              optionsRes.options.map((option, index) =>
                new ButtonBuilder()
                  .setCustomId(`disabled_${index + 1}`) // Ensure custom_id is still included
                  .setLabel('Option Disabled')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true)
              )
            );

            // Edit the original message with disabled buttons
            await message.edit({
              content: `You selected: ${selectedOption.name}. Here's the link: ${selectedOption.URL || 'No URL available.'}`,
              components: [disabledRow],
            });

            // Stop the collector right away after responding
            collector.stop();
          });

          collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
              const timeoutMessage = `Hey ${interaction.user}, looks like you took too long to respond!`;
              await interaction.followUp({
                content: timeoutMessage,
                flags: 64  // Ephemeral flag
              });
            }

            // Only disable the buttons and update the message if no response was collected
            if (reason === 'time') {
              const disabledRow = new ActionRowBuilder().addComponents(
                optionsRes.options.map((option, index) =>
                  new ButtonBuilder()
                    .setCustomId(`disabled_${index + 1}`)
                    .setLabel('Option Disabled')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
                )
              );

              try {
                await message.edit({
                  content: "You took too long to respond. The options are now disabled.",
                  components: [disabledRow],
                });
              } catch (error) {
                console.error('Error editing message:', error);
              }
            }
          });
        } else {
          await interaction.reply({
            content: `No matching object found for "${query}".`,
            flags: 64 // Ephemeral flag
          });
        }
        break;

      case 'socials':
        // Handle the socials command
        const socialLinks = [
          { name: 'Linktree', url: 'https://linktr.ee/snailsnft' },
          { name: 'Medium', url: 'https://medium.com/@snailsnft/' },
          { name: 'OmniFlix', url: 'https://omniflix.tv/channel/65182782e1c28773aa199c84' },
          { name: 'YouTube', url: 'https://www.youtube.com/@SNAILS._/videos' }
        ];

        let response = 'Here are our social media links:\n';
        socialLinks.forEach(link => {
          response += `${link.name}: ${link.url}\n`;
        });

        await interaction.reply({
          content: response,
          flags: 64  // Ephemeral flag
        });
        break;

      default:
        break;
    }
  } catch (error) {
    console.error(`Error handling ${interaction.commandName} command:`, error);
    await interaction.reply({
      content: "An error occurred. Please try again later.",
      flags: ['Ephemeral']
    });
  }
});

// Error handling for client
client.on('error', error => {
  console.error('Discord client error:', error);
});

// Log in the bot using the token
client.login(process.env.TOKEN).catch(error => {
  console.error('Error logging in:', error);
});
