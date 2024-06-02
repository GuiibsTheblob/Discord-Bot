const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const axios = require('axios');
const dayjs = require('dayjs');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const HOLODEX_API_KEY = process.env.HOLODEX_API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID; 

const commands = [
  {
    name: 'holoearth',
    description: 'Get videos related to Holoearth',
  },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

async function getHoloearthVideos() {
  try {
    const response = await axios.get('https://holodex.net/api/v2/videos', {
      headers: {
        'X-APIKEY': HOLODEX_API_KEY,
      },
      params: {
        search: 'Holoearth',
        limit: 5,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'holoearth') {
    const videos = await getHoloearthVideos();
    if (videos.length > 0) {
      for (const video of videos) {
        const uploadDate = dayjs(video.uploaded_at).format('YYYY-MM-DD HH:mm');
        const liveTime = video.start_actual ? dayjs(video.start_actual).format('YYYY-MM-DD HH:mm') : 'N/A';

        const videoMessage = `
          <@&${ROLE_ID}> 
          **Title:** ${video.title}
          **URL:** ${video.url}
          **Upload Date:** ${uploadDate}
          **Broadcast Time:** ${liveTime}
        `;
        await interaction.reply(videoMessage);
      }
    } else {
      await interaction.reply('No videos found.');
    }
  }
});

client.login(DISCORD_BOT_TOKEN);
