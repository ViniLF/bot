const { ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require("discord.js");
const { db, owner, tk } = require("../../database/index");

module.exports = {
    name: "clan-manage",
    description: "Gerenciar sistema de clãs - estatísticas e solicitações",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "acao",
            description: "Ação a ser executada",
            type: 3, // STRING
            required: false,
            choices: [
                {
                    name: "Estatísticas",
                    value: "stats"
                },
                {
                    name: "Solicitações Pendentes",
                    value: "pending"
                },
                {
                    name: "Histórico",
                    value: "history"
                },
                {
                    name: "Limpar Dados",
                    value: "clear"
                }
            ]
        }
    ],
    run: async(client, interaction) => {
        if (owner !== interaction.user.id) {
            return interaction.reply({
                content: "❌ Você não tem permissão para usar este comando.",
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            const action = interaction.options.getString("acao") || "stats";
            const clanConfig = await db.get("clanSystem") || {};

            switch (action) {
                case "stats":
                    await showStatistics(interaction, clanConfig);
                    break;
                case "pending":
                    await showPendingRequests(interaction, client);
                    break;
                case "history":
                    await showHistory(interaction, client);
                    break;
                case "clear":
                    await showClearOptions(interaction);
                    break;
                default:
                    await showMainMenu(interaction, clanConfig);
            }

        } catch (error) {
            console.error("Erro no clan-manage:", error);
            
            const errorMsg = "❌ Ocorreu um erro ao executar o comando.";
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
        }
    }
};

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
                name: "📈 Solicitações Totais",
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
        .setFooter({ text: "Use os botões abaixo para outras opções" })
        .setTimestamp();

    const components = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("clan_manage_pending")
                    .setLabel("Ver Pendentes")
                    .setStyle(1)
                    .setEmoji("⏳"),
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
            .setColor("#FFA500");

        return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
        .setTitle(`⏳ Solicitações Pendentes (${pendingRequests.length})`)
        .setColor("#FFA500")
        .setDescription("Lista de todas as solicitações aguardando análise:");

    let description = "";
    
    for (let i = 0; i < Math.min(pendingRequests.length, 10); i++) {
        const request = pendingRequests[i].value;
        const user = client.users.cache.get(request.userId);
        const timeAgo = getTimeAgo(new Date(request.timestamp));
        
        description += `**${i + 1}.** ${request.clanName} \`[${request.clanTag}]\`\n`;
        description += `   👤 ${user ? user.username : "Usuário não encontrado"}\n`;
        description += `   ⏰ ${timeAgo}\n\n`;
    }

    if (pendingRequests.length > 10) {
        description += `... e mais ${pendingRequests.length - 10} solicitações`;
    }

    embed.setDescription(description || "Nenhuma solicitação encontrada.");

    await interaction.editReply({ embeds: [embed] });
}

async function showHistory(interaction, client) {
    const allKeys = await tk.all();
    const historyRequests = allKeys.filter(item => 
        item.id.startsWith("clan_request_data_")
    ).map(item => item.value).sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    if (historyRequests.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle("📋 Histórico de Solicitações")
            .setDescription("Nenhuma solicitação encontrada no histórico.")
            .setColor("#808080");

        return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
        .setTitle(`📋 Histórico de Solicitações (${historyRequests.length})`)
        .setColor("#00FFFF")
        .setDescription("Últimas 10 solicitações processadas:");

    let description = "";
    
    for (let i = 0; i < Math.min(historyRequests.length, 10); i++) {
        const request = historyRequests[i];
        const user = client.users.cache.get(request.userId);
        const timeAgo = getTimeAgo(new Date(request.timestamp));
        
        let statusEmoji = "⏳";
        let statusColor = "🟡";
        
        if (request.status === "approved") {
            statusEmoji = "✅";
            statusColor = "🟢";
        } else if (request.status === "rejected") {
            statusEmoji = "❌";
            statusColor = "🔴";
        }
        
        description += `**${i + 1}.** ${statusEmoji} ${request.clanName} \`[${request.clanTag}]\`\n`;
        description += `   👤 ${user ? user.username : "Usuário não encontrado"}\n`;
        description += `   ⏰ ${timeAgo}\n`;
        
        if (request.status === "approved" && request.approvedBy) {
            const approver = client.users.cache.get(request.approvedBy);
            description += `   ✅ Aprovado por: ${approver ? approver.username : "Desconhecido"}\n`;
        } else if (request.status === "rejected" && request.rejectedBy) {
            const rejecter = client.users.cache.get(request.rejectedBy);
            description += `   ❌ Reprovado por: ${rejecter ? rejecter.username : "Desconhecido"}\n`;
        }
        
        description += "\n";
    }

    if (historyRequests.length > 10) {
        description += `... e mais ${historyRequests.length - 10} solicitações no histórico`;
    }

    embed.setDescription(description);

    await interaction.editReply({ embeds: [embed] });
}

async function showClearOptions(interaction) {
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Limpar Dados do Sistema")
        .setDescription("⚠️ **ATENÇÃO:** Esta ação não pode ser desfeita!")
        .setColor("#FF0000")
        .addFields(
            {
                name: "🔹 Limpar Pendentes",
                value: "Remove todas as solicitações pendentes"
            },
            {
                name: "🔹 Limpar Histórico",
                value: "Remove todo o histórico de solicitações"
            },
            {
                name: "🔹 Resetar Estatísticas",
                value: "Zera todas as estatísticas do sistema"
            },
            {
                name: "🔹 Limpar Tudo",
                value: "Remove todos os dados (pendentes + histórico + stats)"
            }
        );

    const components = [
        new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("clan_clear_select")
                    .setPlaceholder("Selecione o que deseja limpar...")
                    .addOptions([
                        {
                            label: "Solicitações Pendentes",
                            description: "Remove apenas as solicitações pendentes",
                            value: "pending",
                            emoji: "⏳"
                        },
                        {
                            label: "Histórico",
                            description: "Remove todo o histórico de solicitações",
                            value: "history", 
                            emoji: "📋"
                        },
                        {
                            label: "Estatísticas",
                            description: "Zera as estatísticas do sistema",
                            value: "stats",
                            emoji: "📊"
                        },
                        {
                            label: "Tudo",
                            description: "Remove todos os dados do sistema",
                            value: "all",
                            emoji: "🗑️"
                        }
                    ])
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
        components: components
    });
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "agora mesmo";
    if (diffMinutes < 60) return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''} atrás`;
    if (diffHours < 24) return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
    if (diffDays < 7) return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
    
    return date.toLocaleDateString('pt-BR');
}