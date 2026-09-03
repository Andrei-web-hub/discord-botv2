require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cron = require('node-cron');
const { postSmokeToForum } = require('./tiktokSmokes');

const FORUM_CHANNEL_ID = '1544593475545079838';

process.removeAllListeners('warning');

// ==========================================
// 1. CONFIGURARE SERVER WEB PENTRU RENDER
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Botul este online și rulează 24/7!');
});

app.listen(PORT, () => {
    console.log(`[Web Server] Ascultă pe portul ${PORT}`);
});

// ==========================================
// 2. INIȚIALIZARE CLIENT DISCORD
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();

const configFile = './config.json';
let antiSpamConfig = { enabled: true, limit: 3, interval: 3000, timeout: 60000 };

try {
    if (fs.existsSync(configFile)) {
        antiSpamConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    }
} catch (err) {
    console.log("⚠️ Config anti-spam invalid sau lipsă, s-au folosit setările implicite.");
}

function saveConfig() {
    fs.writeFileSync(configFile, JSON.stringify(antiSpamConfig, null, 2));
}

// ==========================================
// 3. ÎNCĂRCARE COMANDE SLASH DIN FOLDERUL /commands
// ==========================================
const commandsPath = path.join(__dirname, 'commands');
const commandsArray = [];

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commandsArray.push(command.data.toJSON());
        }
    }
}

// ==========================================
// 4. ÎNCĂRCARE DINAMICĂ SISTEME
// ==========================================
const systemsPath = path.join(__dirname, 'systems');
if (fs.existsSync(systemsPath)) {
    const systemFiles = fs.readdirSync(systemsPath).filter(file => file.endsWith('.js'));
    for (const file of systemFiles) {
        try {
            const system = require(path.join(systemsPath, file));
            if (typeof system === 'function') {
                system(client);
                console.log(`[Sisteme] Sistemul "${file}" a fost încărcat.`);
            }
        } catch (error) {
            console.error(`[Eroare Sisteme] ${file}:`, error);
        }
    }
}

// ==========================================
// 5. HANDLER INTERACȚIUNI
// ==========================================
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction, client, { antiSpamConfig, saveConfig });
        }
        
        else if (interaction.isButton()) {
            if (interaction.customId.startsWith('track_')) {
                const trackCommand = client.commands.get('track');
                if (trackCommand && trackCommand.handleButton) {
                    await trackCommand.handleButton(interaction);
                }
            }
        }
        
        else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'track_modal_steam') {
                const trackCommand = client.commands.get('track');
                if (trackCommand && trackCommand.handleModal) {
                    await trackCommand.handleModal(interaction);
                }
            }
        }
    } catch (error) {
        console.error("❌ Eroare la gestionarea interacțiunii:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'A apărut o eroare la procesarea acestei acțiuni.', ephemeral: true }).catch(() => {});
        }
    }
});

// ==========================================
// 6. EVENT VOCAL
// ==========================================
client.on("voiceStateUpdate", (oldState, newState) => {
    try {
        const handler = require("./events/voiceStateUpdate");
        if (handler && typeof handler.execute === 'function') handler.execute(oldState, newState);
    } catch (err) {}
});

// ==========================================
// 7. READY EVENT & DEPLOY AUTOMAT COMENZI (PE GUILD)
// ==========================================
const onReady = async () => {
    console.log(`✅ [Discord] Botul este online ca ${client.user.tag}!`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('🔄 Se actualizează comenzile instant pe servere...');
        
        // Înregistrăm comenzile pe fiecare server în parte pentru a aplica instant permisiunile
        for (const guildId of client.guilds.cache.keys()) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commandsArray },
            );
        }
        console.log('✨ Toate comenzile au fost înregistrate instant pe servere!');
    } catch (error) {
        console.error('❌ Eroare la înregistrarea comenzilor:', error);
    }

    // Programarea automată (cron job): rulează în fiecare zi la ora 12:00 PM
    cron.schedule('0 12 * * *', async () => {
        const filePath = path.join(__dirname, 'smokesQueue.json');
        if (!fs.existsSync(filePath)) return;

        let queue = [];
        try {
            queue = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            return;
        }

        if (queue.length === 0) {
            console.log('Coada de TikTok-uri CS2 este goală.');
            return;
        }

        const currentItem = queue.shift();
        await postSmokeToForum(client, FORUM_CHANNEL_ID, currentItem.url, currentItem.rawTitle);

        fs.writeFileSync(filePath, JSON.stringify(queue, null, 2), 'utf8');
        console.log('Coada a fost actualizată automat după postare.');
    });
};

client.once('ready', onReady);
client.once('clientReady', onReady);

// ==========================================
// 8. PREVENIRE CRASH-URI
// ==========================================
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Eroare Critică:', err);
});

client.login(process.env.TOKEN);
