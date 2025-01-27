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
    .setDescription('Get a random snail fact'),
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
        const helpMessage = `
**Available Commands:**

**/help** - Get help with using the bot  
**/snails** - Get a random snail fact  
**/search** - Search for an object  
**/socials** - Get our social media links  
  `;

        await interaction.reply({
          content: helpMessage,
          flags: ['Ephemeral'] // Sends the help message as ephemeral (only the user sees it)
        });
        break;
      case 'snails':
        // Handle the snails command
        await interaction.deferReply();
        try {
          // Get a random fact from the snailFacts array
          const randomFact = snailFacts[Math.floor(Math.random() * snailFacts.length)];

          // Create different variations of the response message
          const messages = [
            `🐌 did you know? ${randomFact}`,
            `🐌 Here’s a cool snail fact: ${randomFact}`,
            `🐌 Fun fact for you: ${randomFact}`,
            `🐌 check out this snail fact: ${randomFact}`,
          ];

          // Pick a random message from the list
          const selectedMessage = messages[Math.floor(Math.random() * messages.length)];

          // Send the selected message
          await interaction.editReply(selectedMessage);
        } catch (error) {
          console.error('Error fetching snail fact:', error);

          // Send an error message if something goes wrong
          await interaction.followUp({
            content: "Sorry, I couldn't fetch a snail fact right now. Please try again later.",
            ephemeral: true // Ensures the error message is private
          });
        }
        break;
      case 'socials':
        // Handle the socials command
        const socialLinks = [
          { name: 'Linktree', url: 'https://linktr.ee/snailsnft', emoji: '🔗' },
          { name: 'Medium', url: 'https://medium.com/@snailsnft/', emoji: '📝' },
          { name: 'OmniFlix', url: 'https://omniflix.tv/snails', emoji: '📺' },
          { name: 'YouTube', url: 'https://www.youtube.com/@SNAILS._/videos', emoji: '🎥' }
        ];

        // Create a row to hold the buttons
        let row = new ActionRowBuilder();

        // Loop through each social link and create a clickable button with emojis
        socialLinks.forEach(link => {
          row.addComponents(
            new ButtonBuilder()
              .setLabel(`${link.emoji} ${link.name}`) // Add emoji for better visual appeal
              .setURL(link.url)
              .setStyle(ButtonStyle.Link) // Ensures it's a clickable link button
          );
        });

        // Send the reply with the buttons
        await interaction.reply({
          content: 'Check out our social media links below to stay connected with Snails!',
          components: [row],
          flags: 64  // Ephemeral flag, meaning only the user sees the message
        });
        break;
      case 'search':
        // Handle the search command
        const query = interaction.options.getString('query');

        // Find if the query matches any direct URL
        let res = objects.filter(item => item.name.toLowerCase() === query.toLowerCase());

        if (res.length > 0) {
          // If direct match is found, reply directly with the URL and thumbnail (if available)
          await interaction.reply({
            content: `You selected: **${res[0].name}**.\n[Click here to visit](${res[0].URL})`,
            embeds: [
              {
                title: res[0].name,
                url: res[0].URL,
                image: {
                  url: res[0].thumbnail || '', // Show thumbnail if available
                },
              },
            ],
            flags: 64 // Ephemeral flag
          });
          return;
        }

        // If no direct match, find if the query matches any options-based search
        let optionsRes = options.find(item => item.name.toLowerCase() === query.toLowerCase());

        if (optionsRes) {
          // Show the buttons for the user to choose from
          const row = new ActionRowBuilder().addComponents(
            optionsRes.options.map((option, index) =>
              new ButtonBuilder()
                .setCustomId(`option_${index + 1}`)
                .setLabel(option.name)
                .setStyle(ButtonStyle.Primary)
            )
          );

          // Send the options with buttons (no reply message here)
          const message = await interaction.reply({
            content: 'Please choose an option from the list below:',
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

            // Prepare the response after selection
            let responseText = `You selected: **${selectedOption.name}**.`;
            if (selectedOption.URL) {
              responseText += `\n[Click here to visit](${selectedOption.URL})`;
            } else {
              responseText += `\nNo URL available.`;
            }

            // Reply with the selected option's details and thumbnail (if available)
            await i.reply({
              content: responseText,
              embeds: [
                {
                  title: selectedOption.name,
                  url: selectedOption.URL,
                  image: {
                    url: selectedOption.thumbnail || '', // Show thumbnail if available
                  },
                },
              ],
              flags: 64 // Ephemeral flag
            });

            // Disable the buttons after the user selects one
            const disabledRow = new ActionRowBuilder().addComponents(
              optionsRes.options.map((option, index) =>
                new ButtonBuilder()
                  .setCustomId(`disabled_${index + 1}`)
                  .setLabel('Option Disabled')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true)
              )
            );

            // Edit the original message with disabled buttons (optional)
            await message.edit({
              content: 'You have selected an option.',
              components: [disabledRow],
            });

            // Delete the options message after the user selects an option
            try {
              await message.delete();
            } catch (error) {
              console.error('Error deleting message:', error);
            }

            // Stop the collector after responding
            collector.stop();
          });

          collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
              const timeoutMessage = `Hey ${interaction.user}, looks like you took too long to respond!`;
              await interaction.followUp({
                content: timeoutMessage,
                flags: 64  // Ephemeral flag
              });

              // Delete the options message after timeout
              try {
                await message.delete();
              } catch (error) {
                console.error('Error deleting message:', error);
              }
            }

            // Disable the buttons and update the message if no response was collected
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
          // If no match was found in the list or options, reply that nothing was found
          await interaction.reply({
            content: `No matching object found for "${query}".`,
            flags: 64 // Ephemeral flag
          });
        }
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
