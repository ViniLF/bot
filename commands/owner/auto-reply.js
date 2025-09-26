const { ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { db, owner } = require("../../database/index");

module.exports = {
    name: "auto-reply",
    description: "Configurar sistema de auto-resposta por palavras",
    type: ApplicationCommandType.ChatInput,
    run: async(client, interaction) => {
        // Verificar permissões do usuário
        if (owner !== interaction.user.id) {
            return interaction.reply({
                content: "❌ Você não tem permissão para usar este comando.",
                ephemeral: true
            });
        }

        try {
            console.log(`⚙️ Comando auto-reply executado por ${interaction.user.username} no servidor ${interaction.guild.name}`);

            await interaction.deferReply({ ephemeral: true });

            // Carregar ou criar configuração padrão
            const autoReplyConfig = await db.get("autoReply") || {
                enabled: false,
                triggers: {
                    "ip": {
                        enabled: true,
                        embed: {
                            title: "🌐 Servidor IP",
                            description: "Nosso IP do servidor é: **play.exemplo.com**",
                            color: "#00FFFF",
                            banner: null,
                            footer: "Conecte-se e divirta-se!"
                        },
                        caseSensitive: false,
                        wholeWordOnly: true
                    }
                },
                settings: {
                    deleteOriginal: false,
                    cooldownSeconds: 5,
                    maxTriggersPerUser: 3
                }
            };

            // Garantir que settings existe
            if (!autoReplyConfig.settings) {
                autoReplyConfig.settings = {
                    deleteOriginal: false,
                    cooldownSeconds: 5,
                    maxTriggersPerUser: 3
                };
                await db.set("autoReply", autoReplyConfig);
            }

            // Criar embed principal
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
                        value: `\`${autoReplyConfig.settings.cooldownSeconds}s\``,
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

            console.log(`✅ Painel auto-reply carregado com sucesso para ${interaction.user.username}`);

        } catch (error) {
            console.error("🚫 Erro no auto-reply:", error);
            
            const errorMsg = "❌ Ocorreu um erro ao carregar o painel de auto-resposta.";
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
        }
    }
};