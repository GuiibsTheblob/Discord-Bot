const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const axios = require('axios');
const dayjs = require('dayjs');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const { DISCORD_BOT_TOKEN, HOLODEX_API_KEY, CLIENT_ID, GUILD_ID, ROLE_ID } = process.env;
const HOLOEARTH_OFFICIAL_CHANNEL_URL = 'https://holodex.net/channel/UCfpWrWvbA34LmrZ9h4Lbwag';

const commands = [
  { name: 'holoearth', description: 'Get videos related to Holoearth' },
  { name: 'holoearthofficial', description: 'Get the latest video from Holoearth official channel' },
  { name: 'latestholoearthvideo', description: 'Fetches the latest video from Holoearth' }
];

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

// Function to fetch videos from Holodex API
const fetchVideos = async (params) => {
  try {
    const finalParams = { ...params, org: 'Hololive' };  // Adding Hololive as the organization filter
    const response = await axios.get('https://holodex.net/api/v2/videos', {
      headers: { 'X-APIKEY': HOLODEX_API_KEY },
      params: finalParams,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
};

// Set up global variables
let sentVideoIds = new Set();
let noNewContent = true;

// Helper function to extract channel ID from URL
const extractChannelId = (url) => url.match(/channel\/([a-zA-Z0-9_-]+)/)?.[1] || null;

// Function to send videos to a Discord channel
const sendVideos = async (channel, params) => {
  const videos = await fetchVideos(params);
  for (const video of videos) {
    if (!sentVideoIds.has(video.id)) {
      const now = dayjs();
      const uploadDate = dayjs(video.available_at); // Assuming `available_at` is when the video is available
      const startTime = video.start_scheduled ? dayjs(video.start_scheduled) : null;
      const timeUntilStart = startTime ? startTime.diff(now, 'minute') : 'N/A';
      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`; // Construct the URL using video ID

      const videoMessage = `
      Oh! A new video appeared.
      <@&${ROLE_ID}>
      **Date:** ${uploadDate.format('YYYY-MM-DD')}
      **Time:** ${uploadDate.format('HH:mm')} UTC
      **Starts in:** ${timeUntilStart} minutes
      **Title:** ${video.title}
      **URL:** ${videoUrl}
      `;
      await channel.send(videoMessage);
      sentVideoIds.add(video.id);
      noNewContent = false;
    }
  }
};

// Function to start continuous checks for new videos
const startContinuousChecks = (channel) => {
  setInterval(async () => {
    await sendVideos(channel, { search: 'Holoearth OR ホロアース', limit: 10 });
    await sendVideos(channel, { channel_id: extractChannelId(HOLOEARTH_OFFICIAL_CHANNEL_URL), limit: 10 });
  }, 300000); // 5 minutes

  // Log if no new content is found for 24 hours
  setTimeout(() => {
    if (noNewContent) console.log("No new content about Holoearth today");
    noNewContent = true;
  }, 86400000); // 24 hours
};

// Client event: once ready, start continuous checks for videos
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  const channel = client.channels.cache.get('1129735652955652179'); 
  if (channel) startContinuousChecks(channel);
  else console.error('Channel not found!');
});

// Client event: handle interactions (slash commands)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'holoearth') {
    await interaction.reply('Started continuous checking for new Holoearth videos every 5 minutes for the next 24 hours.');
    const channel = interaction.channel;
    if (channel) startContinuousChecks(channel);
    else await interaction.followUp('Channel not found.');
  } else if (commandName === 'holoearthofficial') {
    const videos = await fetchVideos({ channel_id: extractChannelId(HOLOEARTH_OFFICIAL_CHANNEL_URL), limit: 1 });
    if (videos.length > 0) {
      const video = videos[0];
      const now = dayjs();
      const uploadDate = dayjs(video.available_at); // Assuming `available_at` is when the video is available
      const startTime = video.start_scheduled ? dayjs(video.start_scheduled) : null;
      const timeUntilStart = startTime ? startTime.diff(now, 'minute') : 'N/A';
      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`; // Construct the URL using video ID

      const videoMessage = `
      Oh! A new video appeared.
      <@&${ROLE_ID}>
      **Date:** ${uploadDate.format('YYYY-MM-DD')}
      **Time:** ${uploadDate.format('HH:mm')} UTC
      **Starts in:** ${timeUntilStart} minutes
      **Title:** ${video.title}
      **URL:** ${videoUrl}
      `;
      await interaction.reply(videoMessage);
    } else {
      await interaction.reply('No videos found.');
    }
  }
});

// Extend the interaction handler to support the new command
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'latestholoearthvideo') {
    const lastHoloEarthVideoConfig = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://holodex.net/api/v2/videos?channel_id=UCfpWrWvbA34LmrZ9h4Lbwag&limit=1',
      headers: {
        'X-APIKEY': HOLODEX_API_KEY
      }
    };

    axios.request(lastHoloEarthVideoConfig)
      .then((response) => {
        const video = response.data[0];
        if (video) {
          const now = dayjs();
          const uploadDate = dayjs(video.available_at); // Assuming `available_at` is when the video is available
          const startTime = video.start_scheduled ? dayjs(video.start_scheduled) : null;
          const timeUntilStart = startTime ? startTime.diff(now, 'minute') : 'N/A';
          const videoUrl = `https://www.youtube.com/watch?v=${video.id}`; // Construct the URL using video ID

          const videoMessage = `
          Oh! A new video appeared.
          <@&${ROLE_ID}>
          **Date:** ${uploadDate.format('YYYY-MM-DD')}
          **Time:** ${uploadDate.format('HH:mm')} UTC
          **Starts in:** ${timeUntilStart} minutes
          **Title:** ${video.title}
          **URL:** ${videoUrl}
          `;
          interaction.reply(videoMessage);
        } else {
          interaction.reply('No latest video found.');
        }
      })
      .catch((error) => {
        console.error('Failed to fetch video:', error);
        interaction.reply('Failed to fetch the latest video.');
      });
  }
});

client.login(DISCORD_BOT_TOKEN);