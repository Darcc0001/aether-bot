require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

console.log('BOT STARTING...');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

const VERIFY_CHANNEL_ID = '1493853290335703182';
const UNVERIFIED_ROLE_ID = '1493852376187273317';
const OAUTH_URL = 'https://discord.com/oauth2/authorize?client_id=1493836596213186712&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&scope=identify+guilds+guilds.join';

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(VERIFY_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor(0x1f2328)
      .setTitle('Verification Required')
      .setDescription(
        'Authentication is required before access is granted.\n\nSelect Verify below to continue.'
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Verify')
        .setStyle(ButtonStyle.Link)
        .setURL(OAUTH_URL)
    );

    await channel.send({
      embeds: [embed],
      components: [row],
    });
  } catch (err) {
    console.error('Error sending verification panel:', err);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await member.roles.add(UNVERIFIED_ROLE_ID);
    console.log(`Assigned Unverified to ${member.user.tag}`);
  } catch (err) {
    console.error('Role assign failed:', err);
  }
});

client.login(process.env.BOT_TOKEN).catch(console.error);