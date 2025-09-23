const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ChannelSelectMenuBuilder, 
    RoleSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    ChannelType 
} = require("discord.js");
const { db, owner } = require("../../database/index");

module.exports = {
    name: "interactionCreate",
    run: async(interaction, client) => {
        const { customId, user, guild, member } = interaction;
        if (!customId || !customId.startsWith("clan_")) return;

        if (owner !== user.id) return interaction.deferUpdate();

        try {
            if (customId === "clan_toggle_system") {
                await interaction.deferUpdate();
                const clanConfig = await db.get("clanSystem") || {};
                clanConfig.enabled = !clanConfig.enabled;
                await db.set("clanSystem", clanConfig);
                
                await reloadClanPanel(interaction);
            }

            else if (customId === "clan_config_channels") {
                const embed = new EmbedBuilder()
                    .setTitle("📋 Configuração de Canais")
                    .setDescription("Selecione os canais que serão utilizados pelo sistema de clãs.")
                    .setColor("#00FFFF")
                    .addFields(
                        {
                            name: "📋 Canal Staff",
                            value: "Canal onde chegam as solicitações para aprovação/reprovação."
                        },
                        {
                            name: "📢 Canal Público",
                            value: "Canal onde serão anunciados os clãs aprovados."
                        }
                    );

                const components = [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId("clan_select_staff_channel")
                                .setLabel("Selecionar Canal Staff")
                                .setStyle(1)
                                .setEmoji("📋"),
                            new ButtonBuilder()
                                .setCustomId("clan_select_public_channel")
                                .setLabel("Selecionar Canal Público")
                                .setStyle(1)
                                .setEmoji("📢")
                        ),
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId("clan_back_to_main")
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

            else if (customId === "clan_select_staff_channel") {
                const select = new ChannelSelectMenuBuilder()
                    .setCustomId("clan_staff_channel_selected")
                    .setChannelTypes(ChannelType.GuildText)
                    .setPlaceholder("Selecione o canal staff")
                    .setMaxValues(1);

                const component = new ActionRowBuilder().addComponents(select);
                const backButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("clan_config_channels")
                            .setLabel("Voltar")
                            .setStyle(2)
                            .setEmoji("⬅️")
                    );

                await interaction.update({
                    content: "📋 Selecione o canal onde as solicitações de clãs serão enviadas:",
                    embeds: [],
                    components: [component, backButton]
                });
            }

            else if (customId === "clan_select_public_channel") {
                const select = new ChannelSelectMenuBuilder()
                    .setCustomId("clan_public_channel_selected")
                    .setChannelTypes(ChannelType.GuildText)
                    .setPlaceholder("Selecione o canal público")
                    .setMaxValues(1);

                const component = new ActionRowBuilder().addComponents(select);
                const backButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("clan_config_channels")
                            .setLabel("Voltar")
                            .setStyle(2)
                            .setEmoji("⬅️")
                    );

                await interaction.update({
                    content: "📢 Selecione o canal onde os clãs aprovados serão anunciados:",
                    embeds: [],
                    components: [component, backButton]
                });
            }

            else if (customId === "clan_staff_channel_selected") {
                await interaction.deferUpdate();
                const clanConfig = await db.get("clanSystem") || {};
                if (!clanConfig.channels) clanConfig.channels = {};
                clanConfig.channels.staff = interaction.values[0];
                await db.set("clanSystem", clanConfig);
                
                await interaction.followUp({
                    content: `✅ Canal staff configurado: <#${interaction.values[0]}>`,
                    ephemeral: true
                });

                setTimeout(async () => {
                    try {
                        const embed = new EmbedBuilder()
                            .setTitle("📋 Configuração de Canais")
                            .setDescription("Selecione os canais que serão utilizados pelo sistema de clãs.")
                            .setColor("#00FFFF")
                            .addFields(
                                {
                                    name: "📋 Canal Staff",
                                    value: "Canal onde chegam as solicitações para aprovação/reprovação."
                                },
                                {
                                    name: "📢 Canal Público",
                                    value: "Canal onde serão anunciados os clãs aprovados."
                                }
                            );

                        const components = [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId("clan_select_staff_channel")
                                        .setLabel("Selecionar Canal Staff")
                                        .setStyle(1)
                                        .setEmoji("📋"),
                                    new ButtonBuilder()
                                        .setCustomId("clan_select_public_channel")
                                        .setLabel("Selecionar Canal Público")
                                        .setStyle(1)
                                        .setEmoji("📢")
                                ),
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId("clan_back_to_main")
                                        .setLabel("Voltar")
                                        .setStyle(2)
                                        .setEmoji("⬅️")
                                )
                        ];

                        await interaction.editReply({
                            content: "",
                            embeds: [embed],
                            components: components
                        });
                    } catch (error) {
                        console.error("Erro ao voltar para configuração de canais:", error);
                    }
                }, 1500);
            }

            else if (customId === "clan_public_channel_selected") {
                await interaction.deferUpdate();
                const clanConfig = await db.get("clanSystem") || {};
                if (!clanConfig.channels) clanConfig.channels = {};
                clanConfig.channels.public = interaction.values[0];
                await db.set("clanSystem", clanConfig);
                
                await interaction.followUp({
                    content: `✅ Canal público configurado: <#${interaction.values[0]}>`,
                    ephemeral: true
                });

                setTimeout(async () => {
                    try {
                        const embed = new EmbedBuilder()
                            .setTitle("📋 Configuração de Canais")
                            .setDescription("Selecione os canais que serão utilizados pelo sistema de clãs.")
                            .setColor("#00FFFF")
                            .addFields(
                                {
                                    name: "📋 Canal Staff",
                                    value: "Canal onde chegam as solicitações para aprovação/reprovação."
                                },
                                {
                                    name: "📢 Canal Público",
                                    value: "Canal onde serão anunciados os clãs aprovados."
                                }
                            );

                        const components = [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId("clan_select_staff_channel")
                                        .setLabel("Selecionar Canal Staff")
                                        .setStyle(1)
                                        .setEmoji("📋"),
                                    new ButtonBuilder()
                                        .setCustomId("clan_select_public_channel")
                                        .setLabel("Selecionar Canal Público")
                                        .setStyle(1)
                                        .setEmoji("📢")
                                ),
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId("clan_back_to_main")
                                        .setLabel("Voltar")
                                        .setStyle(2)
                                        .setEmoji("⬅️")
                                )
                        ];

                        await interaction.editReply({
                            content: "",
                            embeds: [embed],
                            components: components
                        });
                    } catch (error) {
                        console.error("Erro ao voltar para configuração de canais:", error);
                    }
                }, 1500);
            }

            else if (customId === "clan_config_roles") {
                const select = new RoleSelectMenuBuilder()
                    .setCustomId("clan_roles_selected")
                    .setPlaceholder("Selecione os cargos autorizados")
                    .setMaxValues(10);

                const component = new ActionRowBuilder().addComponents(select);
                const backButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("clan_back_to_main")
                            .setLabel("Voltar")
                            .setStyle(2)
                            .setEmoji("⬅️")
                    );

                await interaction.update({
                    content: "👥 Selecione os cargos que poderão aprovar/reprovar clãs:",
                    embeds: [],
                    components: [component, backButton]
                });
            }

            else if (customId === "clan_roles_selected") {
                await interaction.deferUpdate();
                const clanConfig = await db.get("clanSystem") || {};
                if (!clanConfig.roles) clanConfig.roles = {};
                clanConfig.roles.authorized = interaction.values;
                await db.set("clanSystem", clanConfig);
                
                const roleNames = interaction.values
                    .map(roleId => guild.roles.cache.get(roleId)?.name)
                    .filter(name => name)
                    .join(", ");

                await interaction.followUp({
                    content: `✅ Cargos autorizados configurados: ${roleNames}`,
                    ephemeral: true
                });

                setTimeout(async () => {
                    await reloadClanPanel(interaction);
                }, 1500);
            }

            else if (customId === "clan_config_embed") {
                const modal = new ModalBuilder()
                    .setCustomId("clan_embed_modal")
                    .setTitle("Configurar Embed");

                const clanConfig = await db.get("clanSystem") || {};
                const embedConfig = clanConfig.embed || {};

                const titleInput = new TextInputBuilder()
                    .setCustomId("embed_title")
                    .setLabel("Título da Embed")
                    .setStyle(1)
                    .setMaxLength(256)
                    .setValue(embedConfig.title || "🏰 Confirmação de Clã")
                    .setRequired(true);

                const descInput = new TextInputBuilder()
                    .setCustomId("embed_description")
                    .setLabel("Descrição da Embed")
                    .setStyle(2)
                    .setMaxLength(4000)
                    .setValue(embedConfig.description || "Clique no botão abaixo para solicitar a confirmação do seu clã no servidor!")
                    .setRequired(true);

                const colorInput = new TextInputBuilder()
                    .setCustomId("embed_color")
                    .setLabel("Cor da Embed (formato HEX)")
                    .setStyle(1)
                    .setMaxLength(7)
                    .setValue(embedConfig.color || "#FFD700")
                    .setPlaceholder("#FFD700")
                    .setRequired(false);

                const bannerInput = new TextInputBuilder()
                    .setCustomId("embed_banner")
                    .setLabel("URL da Imagem (opcional)")
                    .setStyle(1)
                    .setValue(embedConfig.banner || "")
                    .setPlaceholder("https://example.com/image.png")
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(titleInput),
                    new ActionRowBuilder().addComponents(descInput),
                    new ActionRowBuilder().addComponents(colorInput),
                    new ActionRowBuilder().addComponents(bannerInput)
                );

                await interaction.showModal(modal);
            }

            else if (customId === "clan_embed_modal") {
                await interaction.deferUpdate();
                
                const title = interaction.fields.getTextInputValue("embed_title");
                const description = interaction.fields.getTextInputValue("embed_description");
                const color = interaction.fields.getTextInputValue("embed_color") || "#FFD700";
                const banner = interaction.fields.getTextInputValue("embed_banner") || null;

                const clanConfig = await db.get("clanSystem") || {};
                clanConfig.embed = {
                    title,
                    description,
                    color,
                    banner
                };
                
                await db.set("clanSystem", clanConfig);

                await interaction.followUp({
                    content: "✅ Configurações da embed salvas com sucesso!",
                    ephemeral: true
                });

                setTimeout(async () => {
                    await reloadClanPanel(interaction);
                }, 1500);
            }

            else if (customId === "clan_preview_message") {
                await interaction.deferUpdate();
                const clanConfig = await db.get("clanSystem") || {};
                const embedConfig = clanConfig.embed || {};

                const previewEmbed = new EmbedBuilder()
                    .setTitle(embedConfig.title || "🏰 Confirmação de Clã")
                    .setDescription(embedConfig.description || "Clique no botão abaixo para solicitar a confirmação do seu clã no servidor!")
                    .setColor(embedConfig.color || "#FFD700")
                    .setTimestamp();

                if (embedConfig.banner) {
                    previewEmbed.setImage(embedConfig.banner);
                }

                const confirmButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("clan_confirm_request")
                            .setLabel("Confirmar Clã")
                            .setStyle(1)
                            .setEmoji("🏰")
                            .setDisabled(true)
                    );

                await interaction.followUp({
                    content: "👀 **Prévia da mensagem:**",
                    embeds: [previewEmbed],
                    components: [confirmButton],
                    ephemeral: true
                });
            }

            else if (customId === "clan_send_message") {
                const select = new ChannelSelectMenuBuilder()
                    .setCustomId("clan_send_channel_selected")
                    .setChannelTypes(ChannelType.GuildText)
                    .setPlaceholder("Selecione onde enviar a mensagem")
                    .setMaxValues(1);

                const component = new ActionRowBuilder().addComponents(select);
                const backButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("clan_back_to_main")
                            .setLabel("Voltar")
                            .setStyle(2)
                            .setEmoji("⬅️")
                    );

                await interaction.update({
                    content: "📤 Selecione o canal onde deseja enviar a mensagem de confirmação de clãs:",
                    embeds: [],
                    components: [component, backButton]
                });
            }

            else if (customId === "clan_send_channel_selected") {
                await interaction.deferUpdate();
                const clanConfig = await db.get("clanSystem");
                const embedConfig = clanConfig.embed;

                const channel = guild.channels.cache.get(interaction.values[0]);
                if (!channel) {
                    return interaction.followUp({
                        content: "❌ Canal não encontrado.",
                        ephemeral: true
                    });
                }

                const botMember = guild.members.cache.get(client.user.id);
                if (!channel.permissionsFor(botMember).has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
                    return interaction.followUp({
                        content: "❌ O bot não tem permissões suficientes neste canal.\n**Permissões necessárias:** Ver Canal, Enviar Mensagens, Inserir Links",
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle(embedConfig.title)
                    .setDescription(embedConfig.description)
                    .setColor(embedConfig.color)
                    .setTimestamp();

                if (embedConfig.banner) {
                    embed.setImage(embedConfig.banner);
                }

                const confirmButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("clan_confirm_request")
                            .setLabel("Confirmar Clã")
                            .setStyle(1)
                            .setEmoji("🏰")
                    );

                try {
                    await channel.send({
                        embeds: [embed],
                        components: [confirmButton]
                    });

                    await interaction.followUp({
                        content: `✅ Mensagem enviada com sucesso em ${channel}!`,
                        ephemeral: true
                    });
                } catch (error) {
                    await interaction.followUp({
                        content: "❌ Erro ao enviar mensagem. Verifique as permissões do bot no canal.",
                        ephemeral: true
                    });
                }
            }

            else if (customId === "clan_back_to_main") {
                await interaction.deferUpdate();
                await reloadClanPanel(interaction);
            }

        } catch (error) {
            console.error("Erro no clanConfig:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ Ocorreu um erro ao processar sua solicitação.",
                    ephemeral: true
                });
            }
        }
    }
};

async function reloadClanPanel(interaction) {
    try {
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
            content: "",
            embeds: [embed],
            components: components
        });

    } catch (error) {
        console.error("Erro ao recarregar painel:", error);
        await interaction.editReply({
            content: "❌ Erro ao recarregar o painel de configuração.",
            embeds: [],
            components: []
        });
    }
}