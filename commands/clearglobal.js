const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Se șterg toate comenzile globale vechi...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log('GATA! Comenzile globale au fost șterse. Acum rulează deploy-commands.js.');
  } catch (error) {
    console.error(error);
  }
})();