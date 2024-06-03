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
  {
    name: 'holoearthofficial',
    description: 'Get the latest video from Holoearth official channel',
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

let sentVideoIds = new Set();
let noNewContent = true;

async function getHoloearthVideos() {
  try {
    const response = await axios.get('https://holodex.net/api/v2/videos', {
      headers: {
        'X-APIKEY': HOLODEX_API_KEY,
      },
      params: {
        search: 'Holoearth OR ホロアース',
        limit: 5,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

async function getHoloearthOfficialVideos() {
  try {
    const response = await axios.get('https://holodex.net/api/v2/videos', {
      headers: {
        'X-APIKEY': HOLODEX_API_KEY,
      },
      params: {
        channel_id: 'UCfpWrWvbA34LmrZ9h4Lbwa',
        limit: 5,
        sort: 'newest',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

async function sendHoloearthVideos(channel) {
  const videos = await getHoloearthVideos();
  if (videos.length > 0) {
    for (const video of videos) {
      if (!sentVideoIds.has(video.id)) {
        const uploadDate = dayjs(video.uploaded_at).format('YYYY-MM-DD HH:mm');
        const liveTime = video.start_actual ? dayjs(video.start_actual).format('YYYY-MM-DD HH:mm') : 'N/A';

        const videoMessage = `
          <@&${ROLE_ID}> 
          **Title:** ${video.title}
          **URL:** ${video.url}
          **Upload Date:** ${uploadDate}
          **Broadcast Time:** ${liveTime}
        `;
        await channel.send(videoMessage);
        sentVideoIds.add(video.id);
        noNewContent = false;
      }
    }
  }
}

async function sendHoloearthOfficialVideos(channel) {
  const videos = await getHoloearthOfficialVideos();
  if (videos.length > 0) {
    for (const video of videos) {
      if (!sentVideoIds.has(video.id)) {
        const uploadDate = dayjs(video.uploaded_at).format('YYYY-MM-DD HH:mm');
        const liveTime = video.start_actual ? dayjs(video.start_actual).format('YYYY-MM-DD HH:mm') : 'N/A';

        const videoMessage = `
          <@&${ROLE_ID}> 
          **Title:** ${video.title}
          **URL:** ${video.url}
          **Upload Date:** ${uploadDate}
          **Broadcast Time:** ${liveTime}
        `;
        await channel.send(videoMessage);
        sentVideoIds.add(video.id);
        noNewContent = false;
      }
    }
  }
}

function startContinuousChecks(channel) {
  setInterval(async () => {
    await sendHoloearthVideos(channel);
    await sendHoloearthOfficialVideos(channel);
  }, 300000); // 300000 ms = 5 minutes

  setTimeout(() => {
    if (noNewContent) {
      console.log("No new content about Holoearth today");
    }
    noNewContent = true; // Reset for the next 24 hours
  }, 86400000); // 86400000 ms = 24 hours
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  const channel = client.channels.cache.get('YOUR_CHANNEL_ID'); // Replace with your channel ID

  if (channel) {
    startContinuousChecks(channel);
  } else {
    console.error('Channel not found!');
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'holoearth') {
    await interaction.reply('Started continuous checking for new Holoearth videos every 5 minutes for the next 24 hours.');
    const channel = interaction.channel;
    if (channel) {
      startContinuousChecks(channel);
    } else {
      await interaction.followUp('Channel not found.');
    }
  } else if (commandName === 'holoearthofficial') {
    const videos = await getHoloearthOfficialVideos();
    if (videos.length > 0) {
      const video = videos[0]; // Get the latest video
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
    } else {
      await interaction.reply('No videos found.');
    }
  }
});

client.login(DISCORD_BOT_TOKEN);