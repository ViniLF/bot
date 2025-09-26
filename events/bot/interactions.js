const { InteractionType } = require("discord.js");
const interactionRouter = require("../../middleware/interactionRouter");

module.exports = {
    name: "interactionCreate",
    run: async(interaction, client) => {
        // Log básico para debug
        console.log(`🔄 Interação recebida: ${interaction.type} | ${interaction.customId || interaction.commandName || 'N/A'} | ${interaction.user.username}`);

        try {
            // Verificar se a interação ainda é válida
            if (!interaction.guild) {
                console.log('⚠️ Interação recebida fora de um servidor, ignorando...');
                return;
            }

            // Handler para Slash Commands
            if (interaction.type === InteractionType.ApplicationCommand) {
                await handleSlashCommand(interaction, client);
                return;
            }
            
            // Handler para outros tipos de interação (botões, modals, selects, etc.)
            if (interaction.isButton() || interaction.isStringSelectMenu() || 
                interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu() || 
                interaction.isModalSubmit()) {
                
                // Usar o router para determinar qual handler usar
                const wasHandled = await interactionRouter.routeInteraction(interaction, client);
                
                if (!wasHandled) {
                    console.log(`⚠️ Nenhum handler encontrado para: ${interaction.customId}`);
                    
                    // Só responder se ainda não foi respondido
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: "❌ Funcionalidade não encontrada ou temporariamente indisponível.",
                            ephemeral: true
                        });
                    }
                }
                return;
            }

            // Tipos de interação não tratados
            console.log(`❓ Tipo de interação não suportado: ${interaction.type}`);

        } catch (error) {
            console.error(`🚫 Erro no handler principal de interação:`, error);
            
            // Tentar responder apenas se for um erro crítico e a interação ainda não foi respondida
            if (!interaction.replied && !interaction.deferred) {
                try {
                    // Verificar se a interação ainda é válida (não expirou)
                    const now = Date.now();
                    const interactionTime = interaction.createdTimestamp;
                    const timeElapsed = now - interactionTime;
                    
                    // Discord interactions expiram em 3 segundos
                    if (timeElapsed < 2800) { // 2.8 segundos para segurança
                        await interaction.reply({
                            content: "❌ Ocorreu um erro interno. Tente novamente em alguns segundos.",
                            ephemeral: true
                        });
                    } else {
                        console.log('⏰ Interação expirou, não é possível responder');
                    }
                } catch (replyError) {
                    console.error('Erro ao responder com mensagem de erro:', replyError.message);
                }
            }
        }
    }
};

async function handleSlashCommand(interaction, client) {
    const cmd = client.slashCommands.get(interaction.commandName);
    
    if (!cmd) {
        console.log(`⚠️ Comando não encontrado: ${interaction.commandName}`);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "❌ Comando não encontrado.",
                ephemeral: true
            });
        }
        return;
    }

    // Verificar se já foi respondido (double-check de segurança)
    if (interaction.replied || interaction.deferred) {
        console.log(`⚠️ Comando ${interaction.commandName} já foi processado`);
        return;
    }

    // Adicionar propriedade member se não existir
    if (!interaction.member && interaction.guild) {
        interaction.member = interaction.guild.members.cache.get(interaction.user.id);
    }

    // Log do comando executado
    console.log(`📝 Executando comando: ${interaction.commandName} | Usuário: ${interaction.user.username} | Servidor: ${interaction.guild.name}`);

    try {
        // Executar o comando
        await cmd.run(client, interaction);
        
        console.log(`✅ Comando ${interaction.commandName} executado com sucesso`);
        
    } catch (commandError) {
        console.error(`🚫 Erro ao executar comando ${interaction.commandName}:`, commandError);
        
        // Tentar responder com erro apenas se ainda não foi respondido
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: `❌ Erro ao executar o comando **${interaction.commandName}**. Tente novamente.`,
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Erro ao responder com erro do comando:', replyError.message);
            }
        } else {
            // Se já foi respondido, tentar fazer followUp
            try {
                await interaction.followUp({
                    content: `❌ Ocorreu um erro durante a execução do comando.`,
                    ephemeral: true
                });
            } catch (followUpError) {
                console.error('Erro ao fazer followUp:', followUpError.message);
            }
        }
    }
}