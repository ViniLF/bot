const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ModalBuilder, 
    TextInputBuilder 
} = require("discord.js");
const { db, owner, tk } = require("../../database/index");

module.exports = {
    name: "interactionCreate",
    run: async(interaction, client) => {
        const { customId, user, guild, member } = interaction;
        if (!customId || (!customId.startsWith("clan_manage") && !customId.startsWith("clan_clear"))) return;

        if (owner !== user.id) return interaction.deferUpdate();

        try {
            if (customId === "clan_manage_pending") {
                await interaction.deferUpdate();
                await showPendingRequests(interaction, client);
            }

            else if (customId === "clan_manage_history") {
                await interaction.deferUpdate();
                await showHistory(interaction, client);
            }

            else if (customId === "clan_manage_clear") {
                await interaction.deferUpdate();
                await showClearOptions(interaction);
            }

            else if (customId === "clan_manage_back") {
                await interaction.deferUpdate();
                const clanConfig = await db.get("clanSystem") || {};
                await showStatistics(interaction, clanConfig);
            }

            else if (customId === "clan_clear_select") {
                const option = interaction.values[0];
                
                const modal = new ModalBuilder()
                    .setCustomId(`clan_clear_confirm_${option}`)
                    .setTitle("Confirmar Limpeza");

                const confirmInput = new TextInputBuilder()
                    .setCustomId("confirm_text")
                    .setLabel("Digite 'CONFIRMAR' para prosseguir")
                    .setStyle(1)
                    .setMaxLength(9)
                    .setMinLength(9)
                    .setPlaceholder("CONFIRMAR")
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(confirmInput));

                await interaction.showModal(modal);
            }

            else if (customId === "clan_clear_pending_btn") {
                const modal = new ModalBuilder()
                    .setCustomId("clan_clear_confirm_pending")
                    .setTitle("Confirmar Limpeza - Pendentes");

                const confirmInput = new TextInputBuilder()
                    .setCustomId("confirm_text")
                    .setLabel("Digite 'CONFIRMAR' para prosseguir")
                    .setStyle(1)
                    .setMaxLength(9)
                    .setMinLength(9)
                    .setPlaceholder("CONFIRMAR")
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(confirmInput));
                await interaction.showModal(modal);
            }

            else if (customId === "clan_clear_history_btn") {
                const modal = new ModalBuilder()
                    .setCustomId("clan_clear_confirm_history")
                    .setTitle("Confirmar Limpeza - Histórico");

                const confirmInput = new TextInputBuilder()
                    .setCustomId("confirm_text")
                    .setLabel("Digite 'CONFIRMAR' para prosseguir")
                    .setStyle(1)
                    .setMaxLength(9)
                    .setMinLength(9)
                    .setPlaceholder("CONFIRMAR")
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(confirmInput));
                await interaction.showModal(modal);
            }

            else if (customId === "clan_clear_stats_btn") {
                const modal = new ModalBuilder()
                    .setCustomId("clan_clear_confirm_stats")
                    .setTitle("Confirmar Limpeza - Estatísticas");

                const confirmInput = new TextInputBuilder()
                    .setCustomId("confirm_text")
                    .setLabel("Digite 'CONFIRMAR' para prosseguir")
                    .setStyle(1)
                    .setMaxLength(9)
                    .setMinLength(9)
                    .setPlaceholder("CONFIRMAR")
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(confirmInput));
                await interaction.showModal(modal);
            }

            else if (customId === "clan_clear_all_btn") {
                const modal = new ModalBuilder()
                    .setCustomId("clan_clear_confirm_all")
                    .setTitle("Confirmar Limpeza - TUDO");

                const confirmInput = new TextInputBuilder()
                    .setCustomId("confirm_text")
                    .setLabel("Digite 'CONFIRMAR' para prosseguir")
                    .setStyle(1)
                    .setMaxLength(9)
                    .setMinLength(9)
                    .setPlaceholder("CONFIRMAR")
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(confirmInput));
                await interaction.showModal(modal);
            }

            else if (customId.startsWith("clan_clear_confirm_")) {
                const option = customId.split("clan_clear_confirm_")[1];
                const confirmText = interaction.fields.getTextInputValue("confirm_text");

                if (confirmText !== "CONFIRMAR") {
                    return interaction.reply({
                        content: "❌ Confirmação incorreta. Operação cancelada.",
                        ephemeral: true
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                let result = "";
                
                switch (option) {
                    case "pending":
                        result = await clearPendingRequests();
                        break;
                    case "history":
                        result = await clearHistory();
                        break;
                    case "stats":
                        result = await clearStatistics();
                        break;
                    case "all":
                        const pendingResult = await clearPendingRequests();
                        const historyResult = await clearHistory();
                        const statsResult = await clearStatistics();
                        result = `${pendingResult}\n${historyResult}\n${statsResult}`;
                        break;
                }

                await interaction.editReply({
                    content: `✅ **Limpeza concluída:**\n${result}`
                });

                setTimeout(async () => {
                    try {
                        const clanConfig = await db.get("clanSystem") || {};
                        await showStatistics(interaction, clanConfig);
                    } catch (error) {
                        console.error("Erro ao atualizar painel:", error);
                    }
                }, 2000);
            }

        } catch (error) {
            console.error("Erro no clanManage:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ Ocorreu um erro ao processar sua solicitação.",
                    ephemeral: true
                });
            }
        }
    }
};

async function showPendingRequests(interaction, client) {
    const pendingKeys = await tk.all();
    const pendingRequests = pendingKeys.filter(item => 
        item.id.startsWith("clan_request_") && 
        !item.id.includes("_data_")
    );

    if (pendingRequests.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle("⏳ Solicitações Pendentes")
            .setDescription("Não há solicitações pendentes no momento.")
            .setColor("#FFA500")
            .setTimestamp();

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("clan_manage_back")
                    .setLabel("Voltar")
                    .setStyle(2)
                    .setEmoji("⬅️")
            );

        return interaction.editReply({ 
            embeds: [embed], 
            components: [backButton] 
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`⏳ Solicitações Pendentes (${pendingRequests.length})`)
        .setColor("#FFA500")
        .setTimestamp();

    let description = "";
    
    for (let i = 0; i < Math.min(pendingRequests.length, 15); i++) {
        const request = pendingRequests[i].value;
        const user = client.users.cache.get(request.userId);
        const timeAgo = getTimeAgo(new Date(request.timestamp));
        
        description += `**${i + 1}.** \`${request.clanTag}\` **${request.clanName}**\n`;
        description += `   👤 ${user ? `${user.username}` : "Usuário não encontrado"}\n`;
        description += `   👑 Líder: \`${request.leaderNick}\`\n`;
        description += `   👥 Membros: \`${request.memberCount}\`\n`;
        description += `   ⏰ ${timeAgo}\n`;
        description += `   🔗 [Discord](${request.discordLink})\n\n`;
    }

    if (pendingRequests.length > 15) {
        description += `*... e mais ${pendingRequests.length - 15} solicitações*`;
    }

    embed.setDescription(description || "Nenhuma solicitação encontrada.");

    const components = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("clan_manage_back")
                    .setLabel("Voltar")
                    .setStyle(2)
                    .setEmoji("⬅️"),
                new ButtonBuilder()
                    .setCustomId("clan_manage_history")
                    .setLabel("Ver Histórico")
                    .setStyle(1)
                    .setEmoji("📋")
            )
    ];

    await interaction.editReply({ 
        embeds: [embed], 
        components: components 
    });
}

async function showHistory(interaction, client) {
    const allKeys = await tk.all();
    const historyRequests = allKeys.filter(item => 
        item.id.startsWith("clan_request_data_") &&
        item.value.status && item.value.status !== "pending"
    ).map(item => item.value).sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    if (historyRequests.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle("📋 Histórico de Solicitações")
            .setDescription("Nenhuma solicitação processada encontrada no histórico.")
            .setColor("#808080")
            .setTimestamp();

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("clan_manage_back")
                    .setLabel("Voltar")
                    .setStyle(2)
                    .setEmoji("⬅️")
            );

        return interaction.editReply({ 
            embeds: [embed], 
            components: [backButton] 
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`📋 Histórico de Solicitações (${historyRequests.length})`)
        .setColor("#00FFFF")
        .setTimestamp();

    let description = "";
    
    for (let i = 0; i < Math.min(historyRequests.length, 12); i++) {
        const request = historyRequests[i];
        const user = client.users.cache.get(request.userId);
        const timeAgo = getTimeAgo(new Date(request.timestamp));
        
        let statusEmoji = "⏳";
        
        if (request.status === "approved") {
            statusEmoji = "✅";
        } else if (request.status === "rejected") {
            statusEmoji = "❌";
        }
        
        description += `**${i + 1}.** ${statusEmoji} \`${request.clanTag}\` **${request.clanName}**\n`;
        description += `   👤 ${user ? user.username : "Usuário não encontrado"}\n`;
        description += `   📅 ${timeAgo}\n`;
        
        if (request.status === "approved" && request.approvedBy) {
            const approver = client.users.cache.get(request.approvedBy);
            const approveTime = request.approvedAt ? getTimeAgo(new Date(request.approvedAt)) : "Data desconhecida";
            description += `   ✅ Por: ${approver ? approver.username : "Desconhecido"} (${approveTime})\n`;
        } else if (request.status === "rejected" && request.rejectedBy) {
            const rejecter = client.users.cache.get(request.rejectedBy);
            const rejectTime = request.rejectedAt ? getTimeAgo(new Date(request.rejectedAt)) : "Data desconhecida";
            description += `   ❌ Por: ${rejecter ? rejecter.username : "Desconhecido"} (${rejectTime})\n`;
            if (request.rejectReason) {
                description += `   📝 Motivo: ${request.rejectReason.substring(0, 50)}${request.rejectReason.length > 50 ? '...' : ''}\n`;
            }
        }
        
        description += "\n";
    }

    if (historyRequests.length > 12) {
        description += `*... e mais ${historyRequests.length - 12} solicitações no histórico*`;
    }

    embed.setDescription(description);

    const approved = historyRequests.filter(r => r.status === "approved").length;
    const rejected = historyRequests.filter(r => r.status === "rejected").length;
    const approvalRate = historyRequests.length > 0 ? Math.round((approved / historyRequests.length) * 100) : 0;

    embed.addFields({
        name: "📊 Resumo do Histórico",
        value: `✅ Aprovados: \`${approved}\` | ❌ Reprovados: \`${rejected}\` | 📈 Taxa: \`${approvalRate}%\``,
        inline: false
    });

    const components = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("clan_manage_back")
                    .setLabel("Voltar")
                    .setStyle(2)
                    .setEmoji("⬅️"),
                new ButtonBuilder()
                    .setCustomId("clan_manage_pending")
                    .setLabel("Ver Pendentes")
                    .setStyle(1)
                    .setEmoji("⏳")
            )
    ];

    await interaction.editReply({ 
        embeds: [embed], 
        components: components 
    });
}

async function showStatistics(interaction, clanConfig) {
    const stats = clanConfig.stats || {
        totalRequests: 0,
        approved: 0,
        rejected: 0,
        pending: 0
    };

    const pendingKeys = await tk.all();
    const realPending = pendingKeys.filter(item => 
        item.id.startsWith("clan_request_") && 
        !item.id.includes("_data_")
    ).length;

    const embed = new EmbedBuilder()
        .setTitle("📊 Estatísticas do Sistema de Clãs")
        .setColor("#00FFFF")
        .addFields(
            {
                name: "📈 Total de Solicitações",
                value: `\`${stats.totalRequests}\``,
                inline: true
            },
            {
                name: "✅ Aprovadas",
                value: `\`${stats.approved}\``,
                inline: true
            },
            {
                name: "❌ Reprovadas",
                value: `\`${stats.rejected}\``,
                inline: true
            },
            {
                name: "⏳ Pendentes",
                value: `\`${realPending}\``,
                inline: true
            },
            {
                name: "📊 Taxa de Aprovação",
                value: `\`${stats.totalRequests > 0 ? Math.round((stats.approved / stats.totalRequests) * 100) : 0}%\``,
                inline: true
            },
            {
                name: "🎯 Status do Sistema",
                value: clanConfig.enabled ? "`🟢 Ativo`" : "`🔴 Inativo`",
                inline: true
            }
        )
        .setFooter({ text: "Sistema de Confirmação de Clãs • Use os botões para navegar" })
        .setTimestamp();

    const components = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("clan_manage_pending")
                    .setLabel("Ver Pendentes")
                    .setStyle(1)
                    .setEmoji("⏳")
                    .setDisabled(realPending === 0),
                new ButtonBuilder()
                    .setCustomId("clan_manage_history")
                    .setLabel("Histórico")
                    .setStyle(2)
                    .setEmoji("📋"),
                new ButtonBuilder()
                    .setCustomId("clan_manage_clear")
                    .setLabel("Limpar Dados")
                    .setStyle(4)
                    .setEmoji("🗑️")
            )
    ];

    await interaction.editReply({
        embeds: [embed],
        components: components
    });
}

async function showClearOptions(interaction) {
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Limpar Dados do Sistema")
        .setDescription("⚠️ **ATENÇÃO:** Esta ação não pode ser desfeita!\n\nClique em uma das opções abaixo:")
        .setColor("#FF0000")
        .addFields(
            {
                name: "⏳ Limpar Pendentes",
                value: "Remove todas as solicitações aguardando análise",
                inline: false
            },
            {
                name: "📋 Limpar Histórico",
                value: "Remove todo o histórico de solicitações processadas",
                inline: false
            },
            {
                name: "📊 Resetar Estatísticas",
                value: "Zera todas as estatísticas do sistema",
                inline: false
            },
            {
                name: "🗑️ Limpar Tudo",
                value: "Remove todos os dados (pendentes + histórico + estatísticas)",
                inline: false
            }
        )
        .setFooter({ text: "Você precisará confirmar digitando 'CONFIRMAR'" });

    const selectComponents = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("clan_clear_pending_btn")
                    .setLabel("Limpar Pendentes")
                    .setStyle(4)
                    .setEmoji("⏳"),
                new ButtonBuilder()
                    .setCustomId("clan_clear_history_btn")
                    .setLabel("Limpar Histórico")
                    .setStyle(4)
                    .setEmoji("📋")
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("clan_clear_stats_btn")
                    .setLabel("Resetar Estatísticas")
                    .setStyle(4)
                    .setEmoji("📊"),
                new ButtonBuilder()
                    .setCustomId("clan_clear_all_btn")
                    .setLabel("Limpar Tudo")
                    .setStyle(4)
                    .setEmoji("🗑️")
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("clan_manage_back")
                    .setLabel("Voltar")
                    .setStyle(2)
                    .setEmoji("⬅️")
            )
    ];

    await interaction.editReply({
        embeds: [embed],
        components: selectComponents
    });
}

async function clearPendingRequests() {
    const allKeys = await tk.all();
    const pendingKeys = allKeys.filter(item => 
        item.id.startsWith("clan_request_") && 
        !item.id.includes("_data_")
    );

    for (const key of pendingKeys) {
        await tk.delete(key.id);
    }

    return `⏳ ${pendingKeys.length} solicitação(ões) pendente(s) removida(s)`;
}

async function clearHistory() {
    const allKeys = await tk.all();
    const historyKeys = allKeys.filter(item => 
        item.id.startsWith("clan_request_data_")
    );

    for (const key of historyKeys) {
        await tk.delete(key.id);
    }

    return `📋 ${historyKeys.length} registro(s) do histórico removido(s)`;
}

async function clearStatistics() {
    const clanConfig = await db.get("clanSystem") || {};
    clanConfig.stats = {
        totalRequests: 0,
        approved: 0,
        rejected: 0,
        pending: 0
    };
    await db.set("clanSystem", clanConfig);

    return `📊 Estatísticas resetadas`;
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "agora mesmo";
    if (diffMinutes < 60) return `${diffMinutes} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric'
    });
}