const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const dayjs = require('dayjs');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const HOLODEX_API_KEY = process.env.HOLODEX_API_KEY;

// Replace 'ROLE_ID' with the actual ID of the role you want to mention
const ROLE_ID = 'YOUR_ROLE_ID';

async function getHoloearthVideos() {
  try {
    const response = await axios.get('https://holodex.net/api/v2/videos', {
      headers: {
        'X-APIKEY': HOLODEX_API_KEY,
      },
      params: {
        search: 'Holoearth',
        limit: 5, // Limit the number of results, adjust as needed
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

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('$holoearth')) {
    const videos = await getHoloearthVideos();
    if (videos.length > 0) {
      videos.forEach(video => {
        const uploadDate = dayjs(video.uploaded_at).format('YYYY-MM-DD HH:mm');
        const liveTime = video.start_actual ? dayjs(video.start_actual).format('YYYY-MM-DD HH:mm') : 'N/A';
        
        const videoMessage = `
        <@&${ROLE_ID}>
          **Title:** ${video.title}
          **URL:** ${video.url}
          **Upload Date:** ${uploadDate}
          **Broadcast Time:** ${liveTime}
        `;
        message.channel.send(videoMessage);
      });
    } else {
      message.channel.send('No videos found.');
    }
  }
});

client.login(DISCORD_BOT_TOKEN);
