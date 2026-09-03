const axios = require('axios');

async function generateCleanTitle(rawTitle) {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'google/gemini-2.5-flash',
                messages: [
                    {
                        role: 'system',
                        content: 'Ești un asistent specializat pe Counter-Strike 2. Sarcina ta este să primești un titlu brut sau o descriere de pe TikTok pentru un video cu un smoke/utilitară și să generezi un titlu scurt, curat și standardizat pentru un forum Discord, în formatul: [Harta] Numele Smoke-ului / Poziția. Fără tag-uri (#), fără emoji-uri excesive. Doar titlul clar.'
                    },
                    {
                        role: 'user',
                        content: `Titlu brut: "${rawTitle}"`
                    }
                ],
                temperature: 0.3,
                max_tokens: 60
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Eroare la generarea titlului cu AI:', error.message);
        return 'CS2 Instant Smoke - TikTok Tutorial';
    }
}

async function postSmokeToForum(client, forumChannelId, tiktokUrl, rawTitle) {
    try {
        const forumChannel = await client.channels.fetch(forumChannelId);
        
        if (!forumChannel || forumChannel.type !== 15) {
            console.error('Canalul specificat nu este de tip Forum sau nu a fost găsit!');
            return;
        }

        console.log('Se procesează titlul cu AI...');
        const cleanTitle = await generateCleanTitle(rawTitle);

        const thread = await forumChannel.threads.create({
            name: cleanTitle,
            message: {
                content: `🔥 **Nou smoke rapid descoperit pe TikTok!**\n\n🔗 **Link Direct:** ${tiktokUrl}\n💡 *Discutați aici dacă funcționează pe sub-tick sau dacă aveți nevoie de un jumpthrow specific!*`
            }
        });

        console.log(`Thread creat cu succes în forum: ${cleanTitle}`);
        return thread;
    } catch (error) {
        console.error('Eroare la crearea thread-ului în forum:', error);
    }
}

module.exports = { postSmokeToForum };