const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ModalBuilder, 
    TextInputBuilder 
} = require("discord.js");
const { db, tk } = require("../../database/index");

module.exports = {
    name: "interactionCreate",
    run: async(interaction, client) => {
        const { customId, user, guild, member } = interaction;
        if (!customId) return;

        // Verificar se a interação já foi respondida ou está em processamento
        if (interaction.replied || interaction.deferred) {
            console.log(`⚠️ Interação ${customId} já foi processada pelo usuário ${user.username}`);
            return;
        }

        // Verificar se a interação ainda é válida (timeout check)
        const now = Date.now();
        const interactionTime = interaction.createdTimestamp;
        const timeElapsed = now - interactionTime;
        
        if (timeElapsed > 2500) { // 2.5 segundos para dar margem
            console.log(`⏰ Interação ${customId} expirou (${timeElapsed}ms)`);
            return;
        }

        try {
            // Log da ação para debug
            console.log(`🏰 Processando solicitação de clã: ${customId} | Usuário: ${user.username} | Tempo: ${timeElapsed}ms`);

            if (customId === "clan_confirm_request") {
                await handleClanConfirmRequest(interaction, client);
            }
            else if (customId === "clan_request_modal") {
                await handleClanRequestModal(interaction, client);
            }
            else if (customId.startsWith("clan_approve_")) {
                await handleClanApproval(interaction, client, customId);
            }
            else if (customId.startsWith("clan_reject_") && !customId.startsWith("clan_reject_modal_")) {
                // Botões de rejeição (não modals)
                await handleClanRejection(interaction, client, customId);
            }
            else if (customId.startsWith("clan_reject_modal_")) {
                // Modals de rejeição
                await handleClanRejectionModal(interaction, client, customId);
            }
            else {
                // Log para debug - não deveria chegar aqui com o router
                console.log(`⚠️ CustomId não tratado no clanRequests: ${customId}`);
                
                // Se não é uma interação de clã, não processar
                if (!customId.startsWith("clan_")) {
                    return;
                }
                
                return; // Não processar se não reconhecer
            }
        } catch (error) {
            console.error(`🚫 Erro no clanRequests (${customId}):`, error);
            
            // Não tentar responder se já foi respondido ou se a interação expirou
            if (!interaction.replied && !interaction.deferred && timeElapsed < 2500) {
                try {
                    if (error.code === 10062) {
                        console.log('⏰ Interação expirou durante o processamento');
                        return;
                    }
                    
                    if (error.code === 40060) {
                        console.log('⚠️ Interação já foi respondida durante o processamento');
                        return;
                    }

                    await interaction.reply({
                        content: "❌ Ocorreu um erro inesperado. Tente novamente.",
                        flags: 64 // ephemeral flag
                    });
                } catch (replyError) {
                    console.error("Erro ao responder com erro:", replyError.message);
                }
            }
        }
    }
};

async function handleClanConfirmRequest(interaction, client) {
    // Verificação dupla de segurança
    if (interaction.replied || interaction.deferred) return;

    const clanConfig = await db.get("clanSystem");
    if (!clanConfig || !clanConfig.enabled) {
        return await interaction.reply({
            content: "❌ O sistema de confirmação de clãs está desativado.",
            ephemeral: true
        });
    }

    const pendingRequest = await tk.get(`clan_request_${interaction.user.id}`);
    if (pendingRequest) {
        return await interaction.reply({
            content: "❌ Você já possui uma solicitação de clã pendente.",
            ephemeral: true
        });
    }

    const modal = new ModalBuilder()
        .setCustomId("clan_request_modal")
        .setTitle("Solicitação de Confirmação de Clã");

    const leaderNickInput = new TextInputBuilder()
        .setCustomId("leader_nick")
        .setLabel("Nickname do Líder (no jogo)")
        .setStyle(1)
        .setMaxLength(50)
        .setPlaceholder("Ex: PlayerLider123")
        .setRequired(true);

    const clanNameInput = new TextInputBuilder()
        .setCustomId("clan_name")
        .setLabel("Nome do Clã")
        .setStyle(1)
        .setMaxLength(100)
        .setPlaceholder("Ex: Os Guerreiros")
        .setRequired(true);

    const clanTagInput = new TextInputBuilder()
        .setCustomId("clan_tag")
        .setLabel("TAG do Clã")
        .setStyle(1)
        .setMaxLength(10)
        .setPlaceholder("Ex: [WAR]")
        .setRequired(true);

    const discordLinkInput = new TextInputBuilder()
        .setCustomId("discord_link")
        .setLabel("Link do Discord do Clã")
        .setStyle(1)
        .setPlaceholder("https://discord.gg/exemplo")
        .setRequired(true);

    const memberCountInput = new TextInputBuilder()
        .setCustomId("member_count")
        .setLabel("Quantidade de Membros")
        .setStyle(1)
        .setMaxLength(4)
        .setPlaceholder("Ex: 25")
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(leaderNickInput),
        new ActionRowBuilder().addComponents(clanNameInput),
        new ActionRowBuilder().addComponents(clanTagInput),
        new ActionRowBuilder().addComponents(discordLinkInput),
        new ActionRowBuilder().addComponents(memberCountInput)
    );

    await interaction.showModal(modal);
}

async function handleClanRequestModal(interaction, client) {
    // Verificação de segurança
    if (interaction.replied || interaction.deferred) return;

    await interaction.deferReply({ ephemeral: true });

    const leaderNick = interaction.fields.getTextInputValue("leader_nick");
    const clanName = interaction.fields.getTextInputValue("clan_name");
    const clanTag = interaction.fields.getTextInputValue("clan_tag");
    const discordLink = interaction.fields.getTextInputValue("discord_link");
    const memberCount = interaction.fields.getTextInputValue("member_count");

    // Validações
    if (isNaN(memberCount) || parseInt(memberCount) < 1) {
        return await interaction.editReply({
            content: "❌ A quantidade de membros deve ser um número válido."
        });
    }

    if (!discordLink.includes("discord.gg/") && !discordLink.includes("discord.com/invite/")) {
        return await interaction.editReply({
            content: "❌ Por favor, forneça um link válido do Discord."
        });
    }

    const clanConfig = await db.get("clanSystem");
    const staffChannel = interaction.guild.channels.cache.get(clanConfig.channels.staff);

    if (!staffChannel) {
        return await interaction.editReply({
            content: "❌ Canal staff não configurado. Contate um administrador."
        });
    }

    // Verificar permissões do bot
    const botMember = interaction.guild.members.cache.get(client.user.id);
    if (!staffChannel.permissionsFor(botMember).has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
        return await interaction.editReply({
            content: "❌ O bot não tem permissões suficientes no canal staff configurado.\n**Permissões necessárias:** Ver Canal, Enviar Mensagens, Inserir Links"
        });
    }

    const requestId = `${interaction.user.id}_${Date.now()}`;

    const requestData = {
        userId: interaction.user.id,
        username: interaction.user.username,
        displayName: interaction.member.displayName,
        leaderNick,
        clanName,
        clanTag,
        discordLink,
        memberCount: parseInt(memberCount),
        timestamp: new Date().toISOString(),
        status: "pending"
    };

    // Salvar dados
    await tk.set(`clan_request_${interaction.user.id}`, requestData);
    await tk.set(`clan_request_data_${requestId}`, requestData);

    // Criar embed para o staff
    const staffEmbed = new EmbedBuilder()
        .setTitle("🏰 Nova Solicitação de Confirmação de Clã")
        .setColor("#FFA500")
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
            {
                name: "👤 Solicitante",
                value: `${interaction.user} (${interaction.user.username})`,
                inline: true
            },
            {
                name: "🎮 Nickname do Líder",
                value: `\`${leaderNick}\``,
                inline: true
            },
            {
                name: "🏰 Nome do Clã",
                value: `**${clanName}**`,
                inline: true
            },
            {
                name: "🏷️ TAG do Clã",
                value: `\`${clanTag}\``,
                inline: true
            },
            {
                name: "👥 Quantidade de Membros",
                value: `\`${memberCount}\``,
                inline: true
            },
            {
                name: "🔗 Link do Discord",
                value: `[Clique aqui](${discordLink})`,
                inline: true
            }
        )
        .setFooter({ text: `ID: ${requestId}` })
        .setTimestamp();

    const staffButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`clan_approve_${requestId}`)
                .setLabel("Aprovar")
                .setStyle(3)
                .setEmoji("✅"),
            new ButtonBuilder()
                .setCustomId(`clan_reject_${requestId}`)
                .setLabel("Reprovar")
                .setStyle(4)
                .setEmoji("❌")
        );

    const linkButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Ver Discord do Clã")
                .setStyle(5)
                .setEmoji("🔗")
                .setURL(discordLink)
        );

    // Enviar para o canal staff
    await staffChannel.send({
        embeds: [staffEmbed],
        components: [staffButtons, linkButton]
    });

    // Responder ao usuário
    await interaction.editReply({
        content: "✅ Sua solicitação foi enviada com sucesso! Aguarde a análise da equipe."
    });

    // Atualizar estatísticas
    const stats = clanConfig.stats || {};
    stats.totalRequests = (stats.totalRequests || 0) + 1;
    await db.set("clanSystem.stats", stats);
}

async function handleClanApproval(interaction, client, customId) {
    // Verificação de segurança
    if (interaction.replied || interaction.deferred) return;

    const requestId = customId.split("clan_approve_")[1];
    const clanConfig = await db.get("clanSystem");

    // Verificar permissões
    const hasPermission = clanConfig.roles.authorized.some(roleId => 
        interaction.member.roles.cache.has(roleId)
    );

    if (!hasPermission) {
        return await interaction.reply({
            content: "❌ Você não tem permissão para aprovar solicitações.",
            ephemeral: true
        });
    }

    await interaction.deferUpdate();

    const requestData = await tk.get(`clan_request_data_${requestId}`);
    if (!requestData) {
        return await interaction.followUp({
            content: "❌ Solicitação não encontrada.",
            ephemeral: true
        });
    }

    // Atualizar dados da solicitação
    requestData.status = "approved";
    requestData.approvedBy = interaction.user.id;
    requestData.approvedAt = new Date().toISOString();
    
    await tk.set(`clan_request_data_${requestId}`, requestData);
    await tk.delete(`clan_request_${requestData.userId}`);

    // Atualizar embed original
    const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor("#00FF00")
        .setTitle("✅ Clã Aprovado")
        .addFields({
            name: "✅ Aprovado por",
            value: `${interaction.user} em <t:${Math.floor(Date.now() / 1000)}:f>`,
            inline: false
        });

    await interaction.editReply({
        embeds: [originalEmbed],
        components: []
    });

    // Enviar DM para o solicitante
    const requestUser = client.users.cache.get(requestData.userId);
    if (requestUser) {
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle("🎉 Clã Aprovado!")
                .setDescription(`Parabéns! Seu clã **${requestData.clanName}** foi aprovado!`)
                .setColor("#00FF00")
                .addFields(
                    {
                        name: "🏰 Nome do Clã",
                        value: requestData.clanName,
                        inline: true
                    },
                    {
                        name: "🏷️ TAG",
                        value: requestData.clanTag,
                        inline: true
                    },
                    {
                        name: "✅ Aprovado por",
                        value: interaction.user.username,
                        inline: true
                    }
                )
                .setTimestamp();

            await requestUser.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log("Não foi possível enviar DM para o usuário:", error.message);
        }
    }

    // Anunciar no canal público
    const publicChannel = interaction.guild.channels.cache.get(clanConfig.channels.public);
    if (publicChannel) {
        const publicEmbed = new EmbedBuilder()
            .setTitle("🎉 Novo Clã Confirmado!")
            .setColor("#FFD700")
            .addFields(
                {
                    name: "🏰 Nome do Clã",
                    value: `**${requestData.clanName}**`,
                    inline: true
                },
                {
                    name: "🏷️ TAG",
                    value: `\`${requestData.clanTag}\``,
                    inline: true
                },
                {
                    name: "👤 Líder",
                    value: `\`${requestData.leaderNick}\``,
                    inline: true
                },
                {
                    name: "👥 Membros",
                    value: `\`${requestData.memberCount}\``,
                    inline: true
                },
                {
                    name: "🔗 Discord",
                    value: `[Entrar no servidor](${requestData.discordLink})`,
                    inline: true
                }
            )
            .setTimestamp();

        await publicChannel.send({ embeds: [publicEmbed] });
    }

    // Atualizar estatísticas
    const stats = clanConfig.stats || {};
    stats.approved = (stats.approved || 0) + 1;
    await db.set("clanSystem.stats", stats);

    await interaction.followUp({
        content: `✅ Clã **${requestData.clanName}** aprovado com sucesso!`,
        ephemeral: true
    });
}

async function handleClanRejection(interaction, client, customId) {
    // Verificação de segurança
    if (interaction.replied || interaction.deferred) return;

    // Verificar se a interação ainda é válida (não expirou)
    const now = Date.now();
    const interactionTime = interaction.createdTimestamp;
    const timeElapsed = now - interactionTime;
    
    if (timeElapsed > 2800) { // 2.8 segundos
        console.log('⏰ Interação expirou antes de mostrar modal');
        return;
    }

    const requestId = customId.split("clan_reject_")[1];
    const clanConfig = await db.get("clanSystem");

    // Verificar permissões
    const hasPermission = clanConfig.roles.authorized.some(roleId => 
        interaction.member.roles.cache.has(roleId)
    );

    if (!hasPermission) {
        return await interaction.reply({
            content: "❌ Você não tem permissão para reprovar solicitações.",
            ephemeral: true
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`clan_reject_modal_${requestId}`)
        .setTitle("Motivo da Reprovação");

    const reasonInput = new TextInputBuilder()
        .setCustomId("reject_reason")
        .setLabel("Motivo da reprovação")
        .setStyle(2)
        .setMaxLength(1000)
        .setPlaceholder("Digite o motivo da reprovação...")
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(reasonInput)
    );

    // Verificar novamente antes de mostrar o modal
    if (interaction.replied || interaction.deferred) {
        console.log('⚠️ Interação já foi respondida antes de mostrar modal');
        return;
    }

    await interaction.showModal(modal);
}

async function handleClanRejectionModal(interaction, client, customId) {
    // Verificação de segurança
    if (interaction.replied || interaction.deferred) return;

    const requestId = customId.split("clan_reject_modal_")[1];
    await interaction.deferUpdate();

    const reason = interaction.fields.getTextInputValue("reject_reason");
    const requestData = await tk.get(`clan_request_data_${requestId}`);

    if (!requestData) {
        return await interaction.followUp({
            content: "❌ Solicitação não encontrada.",
            ephemeral: true
        });
    }

    // Atualizar dados da solicitação
    requestData.status = "rejected";
    requestData.rejectedBy = interaction.user.id;
    requestData.rejectedAt = new Date().toISOString();
    requestData.rejectReason = reason;
    
    await tk.set(`clan_request_data_${requestId}`, requestData);
    await tk.delete(`clan_request_${requestData.userId}`);

    // Atualizar embed original
    const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor("#FF0000")
        .setTitle("❌ Clã Reprovado")
        .addFields(
            {
                name: "❌ Reprovado por",
                value: `${interaction.user} em <t:${Math.floor(Date.now() / 1000)}:f>`,
                inline: false
            },
            {
                name: "📝 Motivo",
                value: reason,
                inline: false
            }
        );

    await interaction.editReply({
        embeds: [originalEmbed],
        components: []
    });

    // Enviar DM para o solicitante
    const requestUser = client.users.cache.get(requestData.userId);
    if (requestUser) {
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle("❌ Clã Reprovado")
                .setDescription(`Infelizmente, seu clã **${requestData.clanName}** foi reprovado.`)
                .setColor("#FF0000")
                .addFields(
                    {
                        name: "📝 Motivo",
                        value: reason
                    },
                    {
                        name: "🔄 Nova Solicitação",
                        value: "Você pode fazer uma nova solicitação após corrigir os problemas mencionados."
                    }
                )
                .setTimestamp();

            await requestUser.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log("Não foi possível enviar DM para o usuário:", error.message);
        }
    }

    // Atualizar estatísticas
    const clanConfig = await db.get("clanSystem");
    const stats = clanConfig.stats || {};
    stats.rejected = (stats.rejected || 0) + 1;
    await db.set("clanSystem.stats", stats);

    await interaction.followUp({
        content: `❌ Clã **${requestData.clanName}** reprovado.`,
        ephemeral: true
    });
}