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

        if (customId === "clan_confirm_request") {
            try {
                const clanConfig = await db.get("clanSystem");
                if (!clanConfig || !clanConfig.enabled) {
                    return interaction.reply({
                        content: "❌ O sistema de confirmação de clãs está desativado.",
                        ephemeral: true
                    });
                }

                const pendingRequest = await tk.get(`clan_request_${user.id}`);
                if (pendingRequest) {
                    return interaction.reply({
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

            } catch (error) {
                console.error("Erro ao abrir modal de solicitação:", error);
                await interaction.reply({
                    content: "❌ Ocorreu um erro ao abrir o formulário.",
                    ephemeral: true
                });
            }
        }

        else if (customId === "clan_request_modal") {
            try {
                await interaction.deferReply({ ephemeral: true });

                const leaderNick = interaction.fields.getTextInputValue("leader_nick");
                const clanName = interaction.fields.getTextInputValue("clan_name");
                const clanTag = interaction.fields.getTextInputValue("clan_tag");
                const discordLink = interaction.fields.getTextInputValue("discord_link");
                const memberCount = interaction.fields.getTextInputValue("member_count");

                if (isNaN(memberCount) || parseInt(memberCount) < 1) {
                    return interaction.editReply({
                        content: "❌ A quantidade de membros deve ser um número válido."
                    });
                }

                if (!discordLink.includes("discord.gg/") && !discordLink.includes("discord.com/invite/")) {
                    return interaction.editReply({
                        content: "❌ Por favor, forneça um link válido do Discord."
                    });
                }

                const clanConfig = await db.get("clanSystem");
                const staffChannel = guild.channels.cache.get(clanConfig.channels.staff);

                if (!staffChannel) {
                    return interaction.editReply({
                        content: "❌ Canal staff não configurado. Contate um administrador."
                    });
                }

                const botMember = guild.members.cache.get(client.user.id);
                if (!staffChannel.permissionsFor(botMember).has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
                    return interaction.editReply({
                        content: "❌ O bot não tem permissões suficientes no canal staff configurado.\n**Permissões necessárias:** Ver Canal, Enviar Mensagens, Inserir Links"
                    });
                }

                const requestId = `${user.id}_${Date.now()}`;

                const requestData = {
                    userId: user.id,
                    username: user.username,
                    displayName: member.displayName,
                    leaderNick,
                    clanName,
                    clanTag,
                    discordLink,
                    memberCount: parseInt(memberCount),
                    timestamp: new Date().toISOString(),
                    status: "pending"
                };

                await tk.set(`clan_request_${user.id}`, requestData);
                await tk.set(`clan_request_data_${requestId}`, requestData);

                const staffEmbed = new EmbedBuilder()
                    .setTitle("🏰 Nova Solicitação de Confirmação de Clã")
                    .setColor("#FFA500")
                    .setThumbnail(user.displayAvatarURL())
                    .addFields(
                        {
                            name: "👤 Solicitante",
                            value: `${user} (${user.username})`,
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

                await staffChannel.send({
                    embeds: [staffEmbed],
                    components: [staffButtons, linkButton]
                });

                await interaction.editReply({
                    content: "✅ Sua solicitação foi enviada com sucesso! Aguarde a análise da equipe."
                });

            } catch (error) {
                console.error("Erro ao processar solicitação de clã:", error);
                await interaction.editReply({
                    content: "❌ Ocorreu um erro ao processar sua solicitação."
                });
            }
        }

        else if (customId.startsWith("clan_approve_")) {
            try {
                const requestId = customId.split("clan_approve_")[1];
                const clanConfig = await db.get("clanSystem");

                const hasPermission = clanConfig.roles.authorized.some(roleId => 
                    member.roles.cache.has(roleId)
                );

                if (!hasPermission) {
                    return interaction.reply({
                        content: "❌ Você não tem permissão para aprovar solicitações.",
                        ephemeral: true
                    });
                }

                await interaction.deferUpdate();

                const requestData = await tk.get(`clan_request_data_${requestId}`);
                if (!requestData) {
                    return interaction.followUp({
                        content: "❌ Solicitação não encontrada.",
                        ephemeral: true
                    });
                }

                requestData.status = "approved";
                requestData.approvedBy = user.id;
                requestData.approvedAt = new Date().toISOString();
                
                await tk.set(`clan_request_data_${requestId}`, requestData);
                await tk.delete(`clan_request_${requestData.userId}`);

                const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor("#00FF00")
                    .setTitle("✅ Clã Aprovado")
                    .addFields({
                        name: "✅ Aprovado por",
                        value: `${user} em <t:${Math.floor(Date.now() / 1000)}:f>`,
                        inline: false
                    });

                await interaction.editReply({
                    embeds: [originalEmbed],
                    components: []
                });

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
                                    value: user.username,
                                    inline: true
                                }
                            )
                            .setTimestamp();

                        await requestUser.send({ embeds: [dmEmbed] });
                    } catch (error) {
                        console.log("Não foi possível enviar DM para o usuário:", error.message);
                    }
                }

                const publicChannel = guild.channels.cache.get(clanConfig.channels.public);
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

                await interaction.followUp({
                    content: `✅ Clã **${requestData.clanName}** aprovado com sucesso!`,
                    ephemeral: true
                });

            } catch (error) {
                console.error("Erro ao aprovar clã:", error);
                await interaction.followUp({
                    content: "❌ Ocorreu um erro ao aprovar o clã.",
                    ephemeral: true
                });
            }
        }

        else if (customId.startsWith("clan_reject_")) {
            try {
                const requestId = customId.split("clan_reject_")[1];
                const clanConfig = await db.get("clanSystem");

                const hasPermission = clanConfig.roles.authorized.some(roleId => 
                    member.roles.cache.has(roleId)
                );

                if (!hasPermission) {
                    return interaction.reply({
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

                await interaction.showModal(modal);

            } catch (error) {
                console.error("Erro ao abrir modal de reprovação:", error);
                await interaction.reply({
                    content: "❌ Ocorreu um erro ao processar a reprovação.",
                    ephemeral: true
                });
            }
        }

        else if (customId.startsWith("clan_reject_modal_")) {
            try {
                const requestId = customId.split("clan_reject_modal_")[1];
                await interaction.deferUpdate();

                const reason = interaction.fields.getTextInputValue("reject_reason");
                const requestData = await tk.get(`clan_request_data_${requestId}`);

                if (!requestData) {
                    return interaction.followUp({
                        content: "❌ Solicitação não encontrada.",
                        ephemeral: true
                    });
                }

                requestData.status = "rejected";
                requestData.rejectedBy = user.id;
                requestData.rejectedAt = new Date().toISOString();
                requestData.rejectReason = reason;
                
                await tk.set(`clan_request_data_${requestId}`, requestData);
                await tk.delete(`clan_request_${requestData.userId}`);

                const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor("#FF0000")
                    .setTitle("❌ Clã Reprovado")
                    .addFields(
                        {
                            name: "❌ Reprovado por",
                            value: `${user} em <t:${Math.floor(Date.now() / 1000)}:f>`,
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

                await interaction.followUp({
                    content: `❌ Clã **${requestData.clanName}** reprovado.`,
                    ephemeral: true
                });

            } catch (error) {
                console.error("Erro ao reprovar clã:", error);
                await interaction.followUp({
                    content: "❌ Ocorreu um erro ao reprovar o clã.",
                    ephemeral: true
                });
            }
        }
    }
};