const { EmbedBuilder } = require("discord.js");
const { db } = require("../../database/index");

// Cache para cooldowns por usuário
const userCooldowns = new Map();

module.exports = {
    name: "messageCreate",
    run: async(message, client) => {
        // Ignorar mensagens do bot e mensagens sem conteúdo
        if (message.author.bot || !message.content || !message.guild) return;

        try {
            // Carregar configuração do auto-reply
            const autoReplyConfig = await db.get("autoReply");
            
            // Verificar se o sistema está ativado
            if (!autoReplyConfig || !autoReplyConfig.enabled) return;

            // Verificar se há palavras configuradas
            if (!autoReplyConfig.triggers || Object.keys(autoReplyConfig.triggers).length === 0) return;

            // Verificar cooldown do usuário
            const userId = message.author.id;
            const now = Date.now();
            const cooldownTime = (autoReplyConfig.settings?.cooldownSeconds || 5) * 1000;
            
            if (userCooldowns.has(userId)) {
                const lastTrigger = userCooldowns.get(userId);
                if (now - lastTrigger < cooldownTime) {
                    console.log(`⏰ Usuário ${message.author.username} em cooldown`);
                    return;
                }
            }

            // Analisar a mensagem
            const messageContent = message.content;
            
            // Procurar por palavras-chave
            for (const [triggerWord, config] of Object.entries(autoReplyConfig.triggers)) {
                if (!config.enabled) continue;

                let found = false;

                if (config.wholeWordOnly) {
                    // Verificar palavra exata (não parte de outra palavra)
                    const regex = new RegExp(`\\b${escapeRegex(triggerWord)}\\b`, config.caseSensitive ? 'g' : 'gi');
                    found = regex.test(messageContent);
                } else {
                    // Verificar se contém a palavra (pode ser parte de outra)
                    if (config.caseSensitive) {
                        found = messageContent.includes(triggerWord);
                    } else {
                        found = messageContent.toLowerCase().includes(triggerWord.toLowerCase());
                    }
                }

                if (found) {
                    console.log(`🎯 Palavra "${triggerWord}" detectada na mensagem de ${message.author.username}`);
                    
                    // Definir cooldown
                    userCooldowns.set(userId, now);
                    
                    // Limpar cooldown após o tempo definido
                    setTimeout(() => {
                        userCooldowns.delete(userId);
                    }, cooldownTime);

                    // Enviar resposta
                    await sendAutoReply(message, config, triggerWord);
                    
                    // Deletar mensagem original se configurado
                    if (autoReplyConfig.settings?.deleteOriginal) {
                        try {
                            await message.delete();
                        } catch (error) {
                            console.log("Não foi possível deletar mensagem original:", error.message);
                        }
                    }

                    // Atualizar estatísticas
                    await updateStats(triggerWord);
                    
                    // Só responder à primeira palavra encontrada
                    break;
                }
            }

        } catch (error) {
            console.error("🚫 Erro no sistema auto-reply:", error);
        }
    }
};

/**
 * Envia a resposta automática
 */
async function sendAutoReply(message, config, triggerWord) {
    try {
        const embed = new EmbedBuilder()
            .setTitle(config.embed.title || "Auto-Reply")
            .setDescription(config.embed.description || "Resposta automática")
            .setColor(config.embed.color || "#00FFFF");

        if (config.embed.banner) {
            embed.setImage(config.embed.banner);
        }

        if (config.embed.footer) {
            embed.setFooter({ text: config.embed.footer });
        }

        embed.setTimestamp();

        // Responder à mensagem original
        await message.reply({
            embeds: [embed]
        });

        console.log(`✅ Auto-reply enviado para palavra "${triggerWord}"`);

    } catch (error) {
        console.error("❌ Erro ao enviar auto-reply:", error);
    }
}

/**
 * Atualiza estatísticas de uso
 */
async function updateStats(triggerWord) {
    try {
        const currentStats = await db.get("autoReplyStats") || {};
        
        if (!currentStats[triggerWord]) {
            currentStats[triggerWord] = {
                count: 0,
                lastUsed: null,
                firstUsed: new Date().toISOString()
            };
        }

        currentStats[triggerWord].count++;
        currentStats[triggerWord].lastUsed = new Date().toISOString();

        await db.set("autoReplyStats", currentStats);

    } catch (error) {
        console.error("❌ Erro ao atualizar estatísticas:", error);
    }
}

/**
 * Escapa caracteres especiais para regex
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}