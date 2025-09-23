const { ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ChannelType } = require("discord.js");
const { db, owner } = require("../../database/index");

module.exports = {
    name: "clan-panel",
    description: "Configurar sistema de confirmação de clãs",
    type: ApplicationCommandType.ChatInput,
    run: async(client, interaction) => {
        if (owner !== interaction.user.id) {
            return interaction.reply({
                content: "❌ Você não tem permissão para usar este comando.",
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            const clanConfig = await db.get("clanSystem") || {
                enabled: false,
                channels: {
                    staff: null,
                    public: null
                },
                roles: {
                    authorized: []
                },
                embed: {
                    title: "🏰 Confirmação de Clã",
                    description: "Clique no botão abaixo para solicitar a confirmação do seu clã no servidor!",
                    color: "#FFD700",
                    banner: null
                }
            };

            const staffChannel = clanConfig.channels.staff ? 
                interaction.guild.channels.cache.get(clanConfig.channels.staff) : null;
            const publicChannel = clanConfig.channels.public ? 
                interaction.guild.channels.cache.get(clanConfig.channels.public) : null;

            const authorizedRoles = clanConfig.roles.authorized
                .map(roleId => interaction.guild.roles.cache.get(roleId))
                .filter(role => role)
                .map(role => role.toString())
                .join(", ") || "`Nenhum cargo definido`";

            const embed = new EmbedBuilder()
                .setTitle("⚙️ Painel de Configuração - Sistema de Clãs")
                .setDescription("Configure o sistema de confirmação de clãs do servidor.")
                .setColor("#00FFFF")
                .addFields(
                    {
                        name: "📊 Status do Sistema",
                        value: clanConfig.enabled ? "`🟢 Ativado`" : "`🔴 Desativado`",
                        inline: true
                    },
                    {
                        name: "📋 Canal Staff",
                        value: staffChannel ? staffChannel.toString() : "`Não configurado`",
                        inline: true
                    },
                    {
                        name: "📢 Canal Público",
                        value: publicChannel ? publicChannel.toString() : "`Não configurado`",
                        inline: true
                    },
                    {
                        name: "👥 Cargos Autorizados",
                        value: authorizedRoles
                    }
                )
                .setFooter({ text: "Configure todas as opções antes de ativar o sistema" })
                .setTimestamp();

            let permissionWarnings = [];
            const botMember = interaction.guild.members.cache.get(client.user.id);
            
            if (staffChannel && !staffChannel.permissionsFor(botMember).has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
                permissionWarnings.push("⚠️ **Canal Staff:** Bot sem permissões suficientes");
            }
            
            if (publicChannel && !publicChannel.permissionsFor(botMember).has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
                permissionWarnings.push("⚠️ **Canal Público:** Bot sem permissões suficientes");
            }

            if (permissionWarnings.length > 0) {
                embed.addFields({
                    name: "🚨 Avisos de Permissão",
                    value: permissionWarnings.join("\n") + "\n\n**Permissões necessárias:** Ver Canal, Enviar Mensagens, Inserir Links",
                    inline: false
                });
            }

            const components = [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("clan_toggle_system")
                            .setLabel(clanConfig.enabled ? "Desativar Sistema" : "Ativar Sistema")
                            .setStyle(clanConfig.enabled ? 4 : 3)
                            .setEmoji(clanConfig.enabled ? "🔴" : "🟢"),
                        new ButtonBuilder()
                            .setCustomId("clan_config_channels")
                            .setLabel("Configurar Canais")
                            .setStyle(1)
                            .setEmoji("📋"),
                        new ButtonBuilder()
                            .setCustomId("clan_config_roles")
                            .setLabel("Configurar Cargos")
                            .setStyle(1)
                            .setEmoji("👥")
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("clan_config_embed")
                            .setLabel("Configurar Embed")
                            .setStyle(2)
                            .setEmoji("🎨"),
                        new ButtonBuilder()
                            .setCustomId("clan_preview_message")
                            .setLabel("Prévia da Mensagem")
                            .setStyle(2)
                            .setEmoji("👀"),
                        new ButtonBuilder()
                            .setCustomId("clan_send_message")
                            .setLabel("Enviar Mensagem")
                            .setStyle(3)
                            .setEmoji("📤")
                            .setDisabled(!clanConfig.enabled || !staffChannel || !publicChannel)
                    )
            ];

            await interaction.editReply({
                embeds: [embed],
                components: components
            });

        } catch (error) {
            console.error("Erro no clan-panel:", error);
            
            const errorMsg = "❌ Ocorreu um erro ao carregar o painel de configuração.";
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
        }
    }
}