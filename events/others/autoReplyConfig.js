const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ModalBuilder, 
    TextInputBuilder,
    StringSelectMenuBuilder 
} = require("discord.js");
const { db, owner } = require("../../database/index");

module.exports = {
    name: "interactionCreate",
    run: async(interaction, client) => {
        const { customId, user, guild, member } = interaction;
        
        // Filtrar apenas interações de auto-reply
        if (!customId || !customId.startsWith("autoreply_")) return;

        // Verificar permissões
        if (owner !== user.id) {
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    content: "❌ Você não tem permissão para usar esta funcionalidade.",
                    ephemeral: true
                });
            }
            return;
        }

        // Verificar se já foi respondido
        if (interaction.replied || interaction.deferred) {
            console.log(`⚠️ Interação auto-reply ${customId} já foi processada`);
            return;
        }

        try {
            console.log(`⚙️ Auto-reply config: ${customId} | Usuário: ${user.username}`);

            switch (customId) {
                case "autoreply_toggle_system":
                    await handleToggleSystem(interaction);
                    break;
                case "autoreply_manage_words":
                    await handleManageWords(interaction);
                    break;
                case "autoreply_settings":
                    await handleSettings(interaction);
                    break;
                case "autoreply_test":
                    await handleTest(interaction);
                    break;
                case "autoreply_stats":
                    await handleStats(interaction);
                    break;
                case "autoreply_reset":
                    await handleReset(interaction);
                    break;
                case "autoreply_add_word":
                    await handleAddWord(interaction);
                    break;
                case "autoreply_add_word_modal":
                    await handleAddWordModal(interaction);
                    break;
                case "autoreply_edit_word":
                    await handleEditWord(interaction);
                    break;
                case "autoreply_delete_word":
                    await handleDeleteWord(interaction);
                    break;
                case "autoreply_back_main":
                    await handleBackToMain(interaction);
                    break;
                default:
                    if (customId.startsWith("autoreply_edit_")) {
                        await handleEditSpecificWord(interaction, customId);
                    } else if (customId.startsWith("autoreply_delete_")) {
                        await handleDeleteSpecificWord(interaction, customId);
                    } else if (customId.startsWith("autoreply_toggle_")) {
                        await handleToggleSpecificWord(interaction, customId);
                    } else {
                        console.log(`❓ CustomId auto-reply não reconhecido: ${customId}`);
                    }
            }

        } catch (error) {
            console.error(`🚫 Erro no autoReplyConfig (${customId}):`, error);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: "❌ Ocorreu um erro ao processar sua solicitação.",
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error("Erro ao responder com erro:", replyError.message);
                }
            }
        }
    }
};

async function handleToggleSystem(interaction) {
    await interaction.deferUpdate();
    
    const config = await db.get("autoReply") || {};
    config.enabled = !config.enabled;
    await db.set("autoReply", config);
    
    await reloadMainPanel(interaction);
}

async function handleManageWords(interaction) {
    const config = await db.get("autoReply") || { triggers: {} };
    const words = Object.keys(config.triggers);

    const embed = new EmbedBuilder()
        .setTitle("📝 Gerenciar Palavras-Chave")
        .setDescription("Adicione, edite ou remova palavras que ativam respostas automáticas.")
        .setColor("#00FFFF");

    let components = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("autoreply_add_word")
                    .setLabel("Adicionar Palavra")
                    .setStyle(3)
                    .setEmoji("➕"),
                new ButtonBuilder()
                    .setCustomId("autoreply_back_main")
                    .setLabel("Voltar")
                    .setStyle(2)
                    .setEmoji("⬅️")
            )
    ];

    if (words.length > 0) {
        let wordsText = "";
        words.forEach((word, index) => {
            const wordConfig = config.triggers[word];
            const status = wordConfig.enabled ? "🟢" : "🔴";
            const type = wordConfig.wholeWordOnly ? "📝 Palavra exata" : "🔤 Contém texto";
            const case_ = wordConfig.caseSensitive ? "Aa" : "aa";
            
            wordsText += `**${index + 1}.** ${status} \`${word}\` (${type}, ${case_})\n`;
            wordsText += `   └ "${wordConfig.embed.title}"\n\n`;
        });

        embed.addFields({
            name: `📋 Palavras Configuradas (${words.length})`,
            value: wordsText.trim()
        });

        // Adicionar select menu para editar/deletar
        const selectOptions = words.map((word, index) => ({
            label: word,
            description: config.triggers[word].embed.title.substring(0, 50),
            value: word,
            emoji: config.triggers[word].enabled ? "🟢" : "🔴"
        }));

        if (selectOptions.length > 0) {
            components.unshift(
                new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("autoreply_word_selected")
                            .setPlaceholder("Selecione uma palavra para editar...")
                            .addOptions(selectOptions.slice(0, 25)) // Máximo 25 opções
                    )
            );
        }
    } else {
        embed.addFields({
            name: "📋 Palavras Configuradas",
            value: "Nenhuma palavra configurada ainda.\nClique em **Adicionar Palavra** para começar."
        });
    }

    await interaction.update({
        embeds: [embed],
        components: components
    });
}

async function handleAddWord(interaction) {
    const modal = new ModalBuilder()
        .setCustomId("autoreply_add_word_modal")
        .setTitle("Adicionar Nova Palavra-Chave");

    const wordInput = new TextInputBuilder()
        .setCustomId("word")
        .setLabel("Palavra-chave")
        .setStyle(1)
        .setMaxLength(50)
        .setPlaceholder("Ex: ip, discord, ajuda")
        .setRequired(true);

    const titleInput = new TextInputBuilder()
        .setCustomId("title")
        .setLabel("Título da resposta")
        .setStyle(1)
        .setMaxLength(256)
        .setPlaceholder("Ex: 🌐 IP do Servidor")
        .setRequired(true);

    const descriptionInput = new TextInputBuilder()
        .setCustomId("description")
        .setLabel("Descrição da resposta")
        .setStyle(2)
        .setMaxLength(4000)
        .setPlaceholder("Ex: Nosso IP é: play.exemplo.com")
        .setRequired(true);

    const colorInput = new TextInputBuilder()
        .setCustomId("color")
        .setLabel("Cor da embed (opcional)")
        .setStyle(1)
        .setMaxLength(7)
        .setPlaceholder("#00FFFF")
        .setRequired(false);

    const footerInput = new TextInputBuilder()
        .setCustomId("footer")
        .setLabel("Rodapé (opcional)")
        .setStyle(1)
        .setMaxLength(2048)
        .setPlaceholder("Ex: Conecte-se e divirta-se!")
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(wordInput),
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(colorInput),
        new ActionRowBuilder().addComponents(footerInput)
    );

    await interaction.showModal(modal);
}

async function handleAddWordModal(interaction) {
    await interaction.deferUpdate();

    const word = interaction.fields.getTextInputValue("word").toLowerCase().trim();
    const title = interaction.fields.getTextInputValue("title");
    const description = interaction.fields.getTextInputValue("description");
    const color = interaction.fields.getTextInputValue("color") || "#00FFFF";
    const footer = interaction.fields.getTextInputValue("footer") || null;

    // Validar palavra
    if (!word || word.length === 0) {
        return await interaction.followUp({
            content: "❌ A palavra-chave não pode estar vazia.",
            ephemeral: true
        });
    }

    const config = await db.get("autoReply") || { triggers: {} };

    if (config.triggers[word]) {
        return await interaction.followUp({
            content: `❌ A palavra "${word}" já está configurada.`,
            ephemeral: true
        });
    }

    // Adicionar nova palavra
    config.triggers[word] = {
        enabled: true,
        embed: {
            title,
            description,
            color,
            footer,
            banner: null
        },
        caseSensitive: false,
        wholeWordOnly: true
    };

    await db.set("autoReply", config);

    await interaction.followUp({
        content: `✅ Palavra "${word}" adicionada com sucesso!`,
        ephemeral: true
    });

    // Voltar para o gerenciamento
    setTimeout(async () => {
        await handleManageWords(interaction);
    }, 1500);
}

async function handleSettings(interaction) {
    const config = await db.get("autoReply") || { settings: {} };
    const settings = config.settings || {};

    const embed = new EmbedBuilder()
        .setTitle("⚙️ Configurações do Auto-Reply")
        .setDescription("Configure o comportamento do sistema de resposta automática.")
        .setColor("#00FFFF")
        .addFields(
            {
                name: "⏱️ Cooldown",
                value: `\`${settings.cooldownSeconds || 5} segundos\``,
                inline: true
            },
            {
                name: "🗑️ Deletar Original",
                value: settings.deleteOriginal ? "`🟢 Sim`" : "`🔴 Não`",
                inline: true
            },
            {
                name: "📊 Max. por Usuário",
                value: `\`${settings.maxTriggersPerUser || 3}\``,
                inline: true
            }
        );

    const components = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("autoreply_toggle_delete")
                    .setLabel(settings.deleteOriginal ? "Não Deletar Original" : "Deletar Original")
                    .setStyle(settings.deleteOriginal ? 4 : 3)
                    .setEmoji("🗑️"),
                new ButtonBuilder()
                    .setCustomId("autoreply_set_cooldown")
                    .setLabel("Alterar Cooldown")
                    .setStyle(2)
                    .setEmoji("⏱️")
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("autoreply_back_main")
                    .setLabel("Voltar")
                    .setStyle(2)
                    .setEmoji("⬅️")
            )
    ];

    await interaction.update({
        embeds: [embed],
        components: components
    });
}

async function handleStats(interaction) {
    const stats = await db.get("autoReplyStats") || {};
    const config = await db.get("autoReply") || { triggers: {} };

    const embed = new EmbedBuilder()
        .setTitle("📊 Estatísticas do Auto-Reply")
        .setDescription("Veja como as palavras estão sendo utilizadas.")
        .setColor("#00FFFF");

    if (Object.keys(stats).length === 0) {
        embed.addFields({
            name: "📈 Estatísticas",
            value: "Nenhuma estatística disponível ainda."
        });
    } else {
        let statsText = "";
        let totalUses = 0;

        // Ordenar por mais utilizadas
        const sortedStats = Object.entries(stats).sort((a, b) => b[1].count - a[1].count);

        for (const [word, data] of sortedStats) {
            totalUses += data.count;
            const lastUsed = data.lastUsed ? new Date(data.lastUsed).toLocaleDateString('pt-BR') : "Nunca";
            statsText += `🎯 **${word}**: ${data.count} uso(s) | Último: ${lastUsed}\n`;
        }

        embed.addFields(
            {
                name: "📈 Total de Usos",
                value: `\`${totalUses}\``,
                inline: true
            },
            {
                name: "📝 Palavras Ativas",
                value: `\`${Object.keys(config.triggers).length}\``,
                inline: true
            },
            {
                name: "🏆 Mais Usadas",
                value: statsText || "Nenhum dado disponível"
            }
        );
    }

    const components = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("autoreply_clear_stats")
                    .setLabel("Limpar Estatísticas")
                    .setStyle(4)
                    .setEmoji("🗑️"),
                new ButtonBuilder()
                    .setCustomId("autoreply_back_main")
                    .setLabel("Voltar")
                    .setStyle(2)
                    .setEmoji("⬅️")
            )
    ];

    await interaction.update({
        embeds: [embed],
        components: components
    });
}

async function handleTest(interaction) {
    await interaction.deferUpdate();

    const config = await db.get("autoReply");
    if (!config || !config.enabled) {
        return await interaction.followUp({
            content: "❌ Sistema auto-reply está desativado.",
            ephemeral: true
        });
    }

    const words = Object.keys(config.triggers);
    if (words.length === 0) {
        return await interaction.followUp({
            content: "❌ Nenhuma palavra configurada para testar.",
            ephemeral: true
        });
    }

    const randomWord = words[Math.floor(Math.random() * words.length)];
    const wordConfig = config.triggers[randomWord];

    const embed = new EmbedBuilder()
        .setTitle("🧪 Teste do Sistema Auto-Reply")
        .setDescription(`Simulando resposta para a palavra: **${randomWord}**`)
        .setColor("#FFA500")
        .addFields({
            name: "📋 Prévia da Resposta",
            value: `**Título:** ${wordConfig.embed.title}\n**Descrição:** ${wordConfig.embed.description}\n**Cor:** ${wordConfig.embed.color}`
        });

    await interaction.followUp({
        embeds: [embed],
        ephemeral: true
    });
}

async function handleReset(interaction) {
    const modal = new ModalBuilder()
        .setCustomId("autoreply_reset_modal")
        .setTitle("Resetar Sistema Auto-Reply");

    const confirmInput = new TextInputBuilder()
        .setCustomId("confirm")
        .setLabel("Digite 'CONFIRMAR' para resetar")
        .setStyle(1)
        .setMaxLength(9)
        .setMinLength(9)
        .setPlaceholder("CONFIRMAR")
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(confirmInput));
    await interaction.showModal(modal);
}

async function handleBackToMain(interaction) {
    // Verificar timeout antes de deferir
    const now = Date.now();
    const interactionTime = interaction.createdTimestamp;
    const timeElapsed = now - interactionTime;
    
    if (timeElapsed > 2500) {
        console.log(`⏰ Interação auto-reply expirou (${timeElapsed}ms) - ignorando`);
        return;
    }

    // Verificação dupla de segurança
    if (interaction.replied || interaction.deferred) {
        console.log('⚠️ Interação auto-reply já foi processada');
        return;
    }

    try {
        await interaction.deferUpdate();
        await reloadMainPanel(interaction);
    } catch (error) {
        console.error('Erro ao voltar ao painel principal:', error);
    }
}

async function reloadMainPanel(interaction) {
    // Implementar a recarga do painel principal aqui
    // (código similar ao comando auto-reply principal)
    const autoReplyConfig = await db.get("autoReply") || {
        enabled: false,
        triggers: {},
        settings: { cooldownSeconds: 5, deleteOriginal: false, maxTriggersPerUser: 3 }
    };

    // Garantir que settings existe
    if (!autoReplyConfig.settings) {
        autoReplyConfig.settings = {
            cooldownSeconds: 5,
            deleteOriginal: false,
            maxTriggersPerUser: 3
        };
        await db.set("autoReply", autoReplyConfig);
    }

    const embed = new EmbedBuilder()
        .setTitle("⚙️ Painel Auto-Reply - Resposta Automática")
        .setDescription("Configure respostas automáticas para palavras específicas.")
        .setColor("#00FFFF")
        .addFields(
            {
                name: "📊 Status do Sistema",
                value: autoReplyConfig.enabled ? "`🟢 Ativado`" : "`🔴 Desativado`",
                inline: true
            },
            {
                name: "🎯 Palavras Configuradas",
                value: Object.keys(autoReplyConfig.triggers).length > 0 
                    ? Object.keys(autoReplyConfig.triggers).map(trigger => `\`${trigger}\``).join(", ")
                    : "`Nenhuma palavra configurada`",
                inline: true
            },
            {
                name: "⏱️ Cooldown",
                value: `\`${autoReplyConfig.settings.cooldownSeconds || 5}s\``,
                inline: true
            }
        )
        .setFooter({ text: "Configure palavras-chave e suas respostas automáticas" })
        .setTimestamp();

    // Verificar se há palavras configuradas
    const hasWords = Object.keys(autoReplyConfig.triggers).length > 0;
    
    // Criar botões de ação
    const components = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("autoreply_toggle_system")
                    .setLabel(autoReplyConfig.enabled ? "Desativar Sistema" : "Ativar Sistema")
                    .setStyle(autoReplyConfig.enabled ? 4 : 3)
                    .setEmoji(autoReplyConfig.enabled ? "🔴" : "🟢"),
                new ButtonBuilder()
                    .setCustomId("autoreply_manage_words")
                    .setLabel("Gerenciar Palavras")
                    .setStyle(1)
                    .setEmoji("📝"),
                new ButtonBuilder()
                    .setCustomId("autoreply_settings")
                    .setLabel("Configurações")
                    .setStyle(2)
                    .setEmoji("⚙️")
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("autoreply_test")
                    .setLabel("Testar Sistema")
                    .setStyle(2)
                    .setEmoji("🧪")
                    .setDisabled(!autoReplyConfig.enabled || !hasWords),
                new ButtonBuilder()
                    .setCustomId("autoreply_stats")
                    .setLabel("Estatísticas")
                    .setStyle(2)
                    .setEmoji("📊"),
                new ButtonBuilder()
                    .setCustomId("autoreply_reset")
                    .setLabel("Resetar Tudo")
                    .setStyle(4)
                    .setEmoji("🗑️")
            )
    ];

    // Adicionar informações detalhadas se houver palavras configuradas
    if (hasWords) {
        let wordsInfo = "";
        for (const [word, config] of Object.entries(autoReplyConfig.triggers)) {
            const status = config.enabled ? "🟢" : "🔴";
            const caseSensitive = config.caseSensitive ? "Aa" : "aa";
            const wholeWord = config.wholeWordOnly ? "📝" : "🔤";
            wordsInfo += `${status} **${word}** (${caseSensitive} ${wholeWord})\n`;
            wordsInfo += `   └ "${config.embed.title}"\n\n`;
        }

        embed.addFields({
            name: "📋 Palavras Configuradas",
            value: wordsInfo.trim(),
            inline: false
        });
    }

    await interaction.editReply({
        embeds: [embed],
        components: components
    });
}