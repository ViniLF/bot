const { ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ChannelType } = require("discord.js");
const { db, owner } = require("../../database/index");
const PermissionChecker = require("../../utils/permissionChecker");

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
            console.log(`🎛️ Comando clan-panel executado por ${interaction.user.username} no servidor ${interaction.guild.name}`);

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
                },
                stats: {
                    totalRequests: 0,
                    approved: 0,
                    rejected: 0,
                    pending: 0
                }
            };

            const configValidation = PermissionChecker.validateSystemConfig(clanConfig, interaction.guild);
            
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

            const botMember = interaction.guild.members.cache.get(client.user.id);
            let permissionWarnings = [];
            let hasPermissionIssues = false;

            if (staffChannel) {
                const staffCheck = PermissionChecker.checkChannelPermissions(staffChannel, botMember);
                if (!staffCheck.hasAllPermissions) {
                    permissionWarnings.push(`⚠️ **Canal Staff (${staffChannel.name}):** ${staffCheck.permissionNames.join(', ')}`);
                    hasPermissionIssues = true;
                }
            }
            
            if (publicChannel) {
                const publicCheck = PermissionChecker.checkChannelPermissions(publicChannel, botMember);
                if (!publicCheck.hasAllPermissions) {
                    permissionWarnings.push(`⚠️ **Canal Público (${publicChannel.name}):** ${publicCheck.permissionNames.join(', ')}`);
                    hasPermissionIssues = true;
                }
            }

            if (configValidation.issues.length > 0 || configValidation.warnings.length > 0 || permissionWarnings.length > 0) {
                let warningText = "";
                
                if (configValidation.issues.length > 0) {
                    warningText += "❌ **Problemas críticos:**\n" + configValidation.issues.map(issue => `• ${issue}`).join("\n") + "\n\n";
                }
                
                if (permissionWarnings.length > 0) {
                    warningText += "🚨 **Problemas de Permissão:**\n" + permissionWarnings.join("\n") + "\n\n";
                    warningText += "**Como resolver:** Vá nas configurações do canal → Permissões → Adicione o bot com as permissões necessárias.\n\n";
                }
                
                if (configValidation.warnings.length > 0) {
                    warningText += "⚠️ **Avisos:**\n" + configValidation.warnings.map(warning => `• ${warning}`).join("\n");
                }

                embed.addFields({
                    name: "🔧 Status da Configuração",
                    value: warningText.trim(),
                    inline: false
                });
            }

            if (clanConfig.enabled && staffChannel) {
                const stats = clanConfig.stats || {};
                embed.addFields({
                    name: "📈 Estatísticas",
                    value: `Total: \`${stats.totalRequests || 0}\` | Aprovados: \`${stats.approved || 0}\` | Reprovados: \`${stats.rejected || 0}\``,
                    inline: false
                });
            }

            const isFullyConfigured = staffChannel && publicChannel && !hasPermissionIssues;
            
            const components = [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("clan_toggle_system")
                            .setLabel(clanConfig.enabled ? "Desativar Sistema" : "Ativar Sistema")
                            .setStyle(clanConfig.enabled ? 4 : 3)
                            .setEmoji(clanConfig.enabled ? "🔴" : "🟢")
                            .setDisabled(!isFullyConfigured && !clanConfig.enabled), // Só permite desativar se já estiver ativo
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
                            .setDisabled(!clanConfig.enabled || !isFullyConfigured)
                    )
            ];

            if (hasPermissionIssues || configValidation.issues.length > 0) {
                components.push(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId("clan_permission_report")
                                .setLabel("Relatório Detalhado")
                                .setStyle(2)
                                .setEmoji("📊"),
                            new ButtonBuilder()
                                .setCustomId("clan_fix_permissions")
                                .setLabel("Como Corrigir")
                                .setStyle(2)
                                .setEmoji("🔧")
                        )
                );
            }

            await interaction.editReply({
                embeds: [embed],
                components: components
            });

            console.log(`✅ Painel clan-panel carregado com sucesso para ${interaction.user.username}`);

        } catch (error) {
            console.error("🚫 Erro no clan-panel:", error);
            
            const errorMsg = "❌ Ocorreu um erro ao carregar o painel de configuração.";
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
        }
    }
};