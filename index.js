require('dotenv').config();

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
} = require('discord.js');

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getBaseUrl() {
  return requireEnv('PUBLIC_BASE_URL').replace(/\/+$/, '');
}

const config = {
  botToken: requireEnv('BOT_TOKEN'),
  guildId: requireEnv('DISCORD_GUILD_ID'),
  verifyChannelId: requireEnv('VERIFY_CHANNEL_ID'),
  unverifiedRoleId: requireEnv('UNVERIFIED_ROLE_ID'),
  verifiedRoleId: requireEnv('VERIFIED_ROLE_ID'),
  autoPostPanel: process.env.AUTO_POST_VERIFICATION_PANEL !== 'false',
  verifyUrl: `${getBaseUrl()}/verify`,
};

const PANEL_MARKER = 'Aether verification panel';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

function buildVerificationEmbed() {
  return new EmbedBuilder()
    .setColor(0x111827)
    .setTitle('Server Verification')
    .setDescription(
      [
        'Complete account verification to unlock access to the Aether server.',
        '',
        'Select Verify to continue to the secure Discord authorization flow.',
      ].join('\n')
    )
    .setFooter({ text: PANEL_MARKER });
}

function buildVerificationRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Verify')
      .setStyle(ButtonStyle.Link)
      .setURL(config.verifyUrl)
  );
}

async function ensureVerificationPanel() {
  const channel = await client.channels.fetch(config.verifyChannelId);

  if (!channel || !channel.isTextBased()) {
    throw new Error('Verification channel is missing or is not a text channel.');
  }

  const recentMessages = await channel.messages.fetch({ limit: 20 });
  const existingPanel = recentMessages.find((message) => {
    if (message.author.id !== client.user.id) {
      return false;
    }

    return message.embeds.some(
      (embed) => embed.footer && embed.footer.text === PANEL_MARKER
    );
  });

  if (existingPanel) {
    console.log('Verification panel already exists in the configured channel.');
    return;
  }

  await channel.send({
    embeds: [buildVerificationEmbed()],
    components: [buildVerificationRow()],
  });

  console.log('Posted verification panel.');
}

async function checkRoleHierarchy() {
  const guild = await client.guilds.fetch(config.guildId);
  const botMember = await guild.members.fetchMe();
  const [unverifiedRole, verifiedRole] = await Promise.all([
    guild.roles.fetch(config.unverifiedRoleId),
    guild.roles.fetch(config.verifiedRoleId),
  ]);

  if (!unverifiedRole || !verifiedRole) {
    throw new Error('One or more configured roles could not be found.');
  }

  const botTopRolePosition = botMember.roles.highest.position;
  const unverifiedPosition = unverifiedRole.position;
  const verifiedPosition = verifiedRole.position;

  if (
    botTopRolePosition <= unverifiedPosition ||
    botTopRolePosition <= verifiedPosition
  ) {
    console.warn(
      'Role hierarchy warning: move the bot role above both Unverified and Verified or role updates will fail.'
    );
    return;
  }

  console.log('Role hierarchy check passed.');
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot logged in as ${readyClient.user.tag}`);

  try {
    await checkRoleHierarchy();

    if (config.autoPostPanel) {
      await ensureVerificationPanel();
    }
  } catch (error) {
    console.error('Startup check failed:', error);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== config.guildId) {
    return;
  }

  try {
    if (!member.roles.cache.has(config.unverifiedRoleId)) {
      await member.roles.add(config.unverifiedRoleId);
    }

    console.log(`Assigned Unverified role to ${member.user.tag}`);
  } catch (error) {
    console.error(`Failed to assign Unverified role to ${member.user.tag}:`, error);
  }
});

client.login(config.botToken).catch((error) => {
  console.error('Discord bot login failed:', error);
  process.exitCode = 1;
});
