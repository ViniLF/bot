const { ApplicationCommandType, ChannelType } = require("discord.js");
const { db, owner } = require("../../database/index");

module.exports = {
    name: "ticket-setup",
    description: "Configurar sistema de tickets",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "categoria",
            description: "Categoria onde os tickets serão criados",
            type: 7, // CHANNEL
            channel_types: [ChannelType.GuildCategory],
            required: true
        },
        {
            name: "logs",
            description: "Canal de logs dos tickets", 
            type: 7, // CHANNEL
            channel_types: [ChannelType.GuildText],
            required: false
        },
        {
            name: "feedback",
            description: "Canal de feedback dos tickets",
            type: 7, // CHANNEL
            channel_types: [ChannelType.GuildText], 
            required: false
        },
        {
            name: "cargo",
            description: "Cargo da staff",
            type: 8, // ROLE
            required: false
        }
    ],
    run: async(client, interaction) => {
        if (owner !== interaction.user.id) {
            return interaction.reply({
                content: "Você não tem permissão para usar este comando.",
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            const categoria = interaction.options.getChannel("categoria");
            const logs = interaction.options.getChannel("logs");
            const feedback = interaction.options.getChannel("feedback"); 
            const cargo = interaction.options.getRole("cargo");

            // Salvar configurações
            if (categoria) {
                await db.set("definition.channels.category", categoria.id);
            }
            
            if (logs) {
                await db.set("definition.channels.logs", logs.id);
            }
            
            if (feedback) {
                await db.set("definition.channels.feedback", feedback.id);
            }
            
            if (cargo) {
                await db.set("definition.role", cargo.id);
            }

            // Ativar sistema
            await db.set("system", true);

            let response = "✅ **Sistema de Tickets Configurado:**\n\n";
            response += `📂 **Categoria:** ${categoria ? categoria : "Não alterado"}\n`;
            response += `📝 **Logs:** ${logs ? logs : "Não alterado"}\n`;
            response += `💬 **Feedback:** ${feedback ? feedback : "Não alterado"}\n`;
            response += `👥 **Cargo Staff:** ${cargo ? cargo : "Não alterado"}\n`;
            response += `🔧 **Status:** Sistema Ativado`;

            await interaction.editReply({
                content: response
            });

        } catch (error) {
            console.error("Erro no ticket-setup:", error);
            
            const errorMsg = "❌ Ocorreu um erro ao configurar o sistema.";
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
        }
    }
}