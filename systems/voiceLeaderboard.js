const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../voiceData.json');

// Funcție ajutătoare pentru a citi datele în siguranță
function readData() {
    if (!fs.existsSync(dataPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

// Funcție ajutătoare pentru a salva datele
function saveData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// Obiect local pentru a ține minte când a intrat fiecare utilizator activ
const activeSessions = new Map();

module.exports = (client) => {
    client.on('voiceStateUpdate', (oldState, newState) => {
        const member = newState.member || oldState.member;
        if (!member) return;
        
        // 🛑 REGULĂ DE AUR: Ignorăm complet boții!
        if (member.user.bot) return;

        const userId = member.id;

        // Cazul 1: Utilizatorul s-a conectat la un canal de voice (nu era înainte și acum este într-un canal)
        if (!oldState.channelId && newState.channelId) {
            // Nu contorizăm dacă stă singur sau dacă canalul este AFK (opțional, dar lasă-l simplu momentan)
            activeSessions.set(userId, Date.now());
        }

        // Cazul 2: Utilizatorul s-a deconectat complet de pe voice
        if (oldState.channelId && !newState.channelId) {
            const joinTime = activeSessions.get(userId);
            if (joinTime) {
                const elapsed = Date.now() - joinTime;
                activeSessions.delete(userId);

                if (elapsed > 0) {
                    const data = readData();
                    if (!data[userId]) {
                        data[userId] = { time: 0 };
                    }
                    data[userId].time += elapsed;
                    saveData(data);
                }
            }
        }

        // Cazul 3: Schimbă canalele între ele fără să iasă de tot
        if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            const joinTime = activeSessions.get(userId);
            if (joinTime) {
                const elapsed = Date.now() - joinTime;
                
                // Salvăm timpul din canalul vechi
                if (elapsed > 0) {
                    const data = readData();
                    if (!data[userId]) data[userId] = { time: 0 };
                    data[userId].time += elapsed;
                    saveData(data);
                }
            }
            // Resetăm timpul de pornire pentru noul canal
            activeSessions.set(userId, Date.now());
        }
    });

    // Gestionare închidere bot: dacă botul primește restart/crash în timp ce oamenii sunt pe voice,
    // le salvăm timpul acumulat până în acea secundă ca să nu piardă orele de activitate.
    client.once('ready', () => {
        // Când botul pornește, verifică dacă sunt deja oameni în canale (ex: botul a dat restart)
        client.guilds.cache.forEach(guild => {
            guild.voiceStates.cache.forEach((state, userId) => {
                const m = state.member;
                if (m && !m.user.bot && state.channelId) {
                    activeSessions.set(userId, Date.now());
                }
            });
        });
    });
};