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
const PermissionChecker = require("../../utils/permissionChecker");

module.exports = {
    name: "interactionCreate",
    run: async(interaction, client) => {
        const { customId, user, guild, member } = interaction;
        
        // Este handler só processa interações de CONFIGURAÇÃO de clãs
        // Interações de SOLICITAÇÃO são tratadas pelo clanRequests.js
        if (!customId || !customId.startsWith("clan_")) return;

        // Filtrar apenas interações de configuração (não solicitações)
        const configOnlyIds = [
            "clan_toggle_system", "clan_config_channels", "clan_select_staff_channel",
            "clan_select_public_channel", "clan_staff_channel_selected", 
            "clan_public_channel_selected", "clan_config_roles", "clan_roles_selected",
            "clan_config_embed", "clan_embed_modal", "clan_preview_message",
            "clan_send_message", "clan_send_channel_selected", "clan_back_to_main"
        ];

        const isConfigInteraction = configOnlyIds.some(id => 
            customId === id || customId.startsWith(id)
        );

        if (!isConfigInteraction) {
            // Não é uma interação de configuração, ignorar
            return;
        }

        // Verificar se é o owner
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
            console.log(`⚠️ Interação ${customId} já foi processada pelo usuário ${user.username}`);
            return;
        }

        try {
            // Log da ação para debug
            console.log(`🔧 Configuração de clã: ${customId} | Usuário: ${user.username}`);

            switch (customId) {
                case "clan_toggle_system":
                    await handleToggleSystem(interaction);
                    break;
                case "clan_config_channels":
                    await handleConfigChannels(interaction);
                    break;
                case "clan_select_staff_channel":
                    await handleSelectStaffChannel(interaction);
                    break;
                case "clan_select_public_channel":
                    await handleSelectPublicChannel(interaction);
                    break;
                case "clan_staff_channel_selected":
                    await handleStaffChannelSelected(interaction);
                    break;
                case "clan_public_channel_selected":
                    await handlePublicChannelSelected(interaction);
                    break;
                case "clan_config_roles":
                    await handleConfigRoles(interaction);
                    break;
                case "clan_roles_selected":
                    await handleRolesSelected(interaction);
                    break;
                case "clan_config_embed":
                    await handleConfigEmbed(interaction);
                    break;
                case "clan_embed_modal":
                    await handleEmbedModal(interaction);
                    break;
                case "clan_preview_message":
                    await handlePreviewMessage(interaction);
                    break;
                case "clan_send_message":
                    await handleSendMessage(interaction);
                    break;
                case "clan_send_channel_selected":
                    await handleSendChannelSelected(interaction, client);
                    break;
                case "clan_back_to_main":
                    await handleBackToMain(interaction);
                    break;
                default:
                    console.log(`⚠️ CustomId não reconhecido: ${customId}`);
            }

        } catch (error) {
            console.error(`🚫 Erro no clanConfig (${customId}):`, error);
            
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
    const clanConfig = await db.get("clanSystem") || {};
    clanConfig.enabled = !clanConfig.enabled;
    await db.set("clanSystem", clanConfig);
    
    await reloadClanPanel(interaction);
}

async function handleConfigChannels(interaction) {
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

async function handleSelectStaffChannel(interaction) {
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

async function handleSelectPublicChannel(interaction) {
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

async function handleStaffChannelSelected(interaction) {
    await interaction.deferUpdate();
    
    const channelId = interaction.values[0];
    const channel = interaction.guild.channels.cache.get(channelId);
    
    // Verificar permissões do bot no canal selecionado
    const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
    const permissionCheck = PermissionChecker.checkChannelPermissions(channel, botMember);
    
    if (!permissionCheck.hasAllPermissions) {
        await interaction.followUp({
            content: `❌ O bot não tem permissões suficientes no canal ${channel}.\n**Permissões em falta:** ${permissionCheck.permissionNames.join(', ')}\n\nConfigure as permissões e tente novamente.`,
            ephemeral: true
        });
        return;
    }
    
    const clanConfig = await db.get("clanSystem") || {};
    if (!clanConfig.channels) clanConfig.channels = {};
    clanConfig.channels.staff = channelId;
    await db.set("clanSystem", clanConfig);
    
    await interaction.followUp({
        content: `✅ Canal staff configurado: ${channel}`,
        ephemeral: true
    });

    setTimeout(async () => {
        try {
            await showChannelConfigMenu(interaction);
        } catch (error) {
            console.error("Erro ao voltar para configuração de canais:", error);
        }
    }, 1500);
}

async function handlePublicChannelSelected(interaction) {
    await interaction.deferUpdate();
    
    const channelId = interaction.values[0];
    const channel = interaction.guild.channels.cache.get(channelId);
    
    // Verificar permissões do bot no canal selecionado
    const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
    const permissionCheck = PermissionChecker.checkChannelPermissions(channel, botMember);
    
    if (!permissionCheck.hasAllPermissions) {
        await interaction.followUp({
            content: `❌ O bot não tem permissões suficientes no canal ${channel}.\n**Permissões em falta:** ${permissionCheck.permissionNames.join(', ')}\n\nConfigure as permissões e tente novamente.`,
            ephemeral: true
        });
        return;
    }
    
    const clanConfig = await db.get("clanSystem") || {};
    if (!clanConfig.channels) clanConfig.channels = {};
    clanConfig.channels.public = channelId;
    await db.set("clanSystem", clanConfig);
    
    await interaction.followUp({
        content: `✅ Canal público configurado: ${channel}`,
        ephemeral: true
    });

    setTimeout(async () => {
        try {
            await showChannelConfigMenu(interaction);
        } catch (error) {
            console.error("Erro ao voltar para configuração de canais:", error);
        }
    }, 1500);
}

async function handleConfigRoles(interaction) {
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

async function handleRolesSelected(interaction) {
    await interaction.deferUpdate();
    const clanConfig = await db.get("clanSystem") || {};
    if (!clanConfig.roles) clanConfig.roles = {};
    clanConfig.roles.authorized = interaction.values;
    await db.set("clanSystem", clanConfig);
    
    const roleNames = interaction.values
        .map(roleId => interaction.guild.roles.cache.get(roleId)?.name)
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

async function handleConfigEmbed(interaction) {
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

async function handleEmbedModal(interaction) {
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

async function handlePreviewMessage(interaction) {
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

async function handleSendMessage(interaction) {
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

async function handleSendChannelSelected(interaction, client) {
    await interaction.deferUpdate();
    
    const channelId = interaction.values[0];
    const channel = interaction.guild.channels.cache.get(channelId);
    
    if (!channel) {
        return interaction.followUp({
            content: "❌ Canal não encontrado.",
            ephemeral: true
        });
    }

    // Verificar permissões usando o utilitário
    const botMember = interaction.guild.members.cache.get(client.user.id);
    const permissionCheck = PermissionChecker.checkChannelPermissions(channel, botMember);
    
    if (!permissionCheck.hasAllPermissions) {
        return interaction.followUp({
            content: `❌ O bot não tem permissões suficientes neste canal.\n**Permissões em falta:** ${permissionCheck.permissionNames.join(', ')}\n\nConfigure as permissões e tente novamente.`,
            ephemeral: true
        });
    }

    const clanConfig = await db.get("clanSystem");
    const embedConfig = clanConfig.embed;

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
        console.error("Erro ao enviar mensagem:", error);
        await interaction.followUp({
            content: "❌ Erro ao enviar mensagem. Verifique as permissões do bot no canal.",
            ephemeral: true
        });
    }
}

async function handleBackToMain(interaction) {
    await interaction.deferUpdate();
    await reloadClanPanel(interaction);
}

async function showChannelConfigMenu(interaction) {
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
}

async function reloadClanPanel(interaction) {
    try {
        const clanConfig = await db.get("clanSystem") || {
            enabled: false,
            channels: { staff: null, public: null },
            roles: { authorized: [] },
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

        // Verificar permissões e adicionar avisos se necessário
        const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
        let permissionWarnings = [];
        
        if (staffChannel) {
            const staffCheck = PermissionChecker.checkChannelPermissions(staffChannel, botMember);
            if (!staffCheck.hasAllPermissions) {
                permissionWarnings.push(`⚠️ **Canal Staff:** ${staffCheck.permissionNames.join(', ')}`);
            }
        }
        
        if (publicChannel) {
            const publicCheck = PermissionChecker.checkChannelPermissions(publicChannel, botMember);
            if (!publicCheck.hasAllPermissions) {
                permissionWarnings.push(`⚠️ **Canal Público:** ${publicCheck.permissionNames.join(', ')}`);
            }
        }

        if (permissionWarnings.length > 0) {
            embed.addFields({
                name: "🚨 Avisos de Permissão",
                value: permissionWarnings.join("\n") + "\n\n**Solução:** Configure as permissões do bot nos canais mencionados.",
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
                        .setDisabled(!clanConfig.enabled || !staffChannel || !publicChannel || permissionWarnings.length > 0)
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