/**
 * Middleware para rotear interações entre diferentes handlers
 * Resolve conflitos de customId e previne processamento duplicado
 */

class InteractionRouter {
    constructor() {
        this.handlers = new Map();
        this.processedInteractions = new Set();
        this.setupDefaultHandlers();
    }

    /**
     * Configura os handlers padrão para diferentes tipos de interação
     */
    setupDefaultHandlers() {
        // Handlers para sistema de clãs (SOLICITAÇÕES)
        this.addHandler(/^clan_confirm_request$/, 'clanRequests');
        this.addHandler(/^clan_request_modal$/, 'clanRequests');
        this.addHandler(/^clan_approve_\d+_\d+$/, 'clanRequests');
        this.addHandler(/^clan_reject_\d+_\d+$/, 'clanRequests'); // Reject buttons
        this.addHandler(/^clan_reject_modal_\d+_\d+$/, 'clanRequests'); // Reject modals
        
        // Handlers para configuração de clãs (ADMIN)
        this.addHandler(/^clan_toggle_system$/, 'clanConfig');
        this.addHandler(/^clan_config_/, 'clanConfig');
        this.addHandler(/^clan_select_/, 'clanConfig');
        this.addHandler(/^clan_staff_channel_selected$/, 'clanConfig');
        this.addHandler(/^clan_public_channel_selected$/, 'clanConfig');
        this.addHandler(/^clan_roles_selected$/, 'clanConfig');
        this.addHandler(/^clan_embed_modal$/, 'clanConfig');
        this.addHandler(/^clan_preview_message$/, 'clanConfig');
        this.addHandler(/^clan_send_/, 'clanConfig');
        this.addHandler(/^clan_back_to_main$/, 'clanConfig');

        // Handlers para gerenciamento de clãs
        this.addHandler(/^clan_manage_/, 'clanManage');
        this.addHandler(/^clan_clear_/, 'clanManage');

        // Handlers para sistema de auto-reply
        this.addHandler(/^autoreply_/, 'autoReplyConfig');

        // Handlers para sistema de tickets
        this.addHandler(/^painel-ticket$/, 'ticketOpen');
        this.addHandler(/^ts/, 'ticketOpen');
        this.addHandler(/^sair_ticket$/, 'ticketOpen');
        this.addHandler(/^deletar_ticket$/, 'ticketOpen');
        this.addHandler(/^assumir_ticket$/, 'ticketOpen');
        this.addHandler(/^painel_staff$/, 'ticketOpen');
        this.addHandler(/^panelstaff$/, 'ticketOpen');
        this.addHandler(/^stars_/, 'ticketOpen');
        this.addHandler(/^starsmodal_/, 'ticketOpen');

        // Handlers para painel de controle
        this.addHandler(/^systemtrueorfalse$/, 'panel');
        this.addHandler(/^configpanel$/, 'panel');
        this.addHandler(/^definition$/, 'panel');
        this.addHandler(/^functionsTicket$/, 'panel');
        this.addHandler(/^functionSelectcConfig$/, 'panel');
        this.addHandler(/^voltar$/, 'panel');
        this.addHandler(/^rolesconfig$/, 'panel');
        this.addHandler(/^channelsconfig$/, 'panel');
    }

    /**
     * Adiciona um novo handler
     * @param {RegExp|String} pattern - Padrão para identificar o customId
     * @param {String} handlerName - Nome do handler
     */
    addHandler(pattern, handlerName) {
        this.handlers.set(pattern, handlerName);
    }

    /**
     * Determina qual handler deve processar a interação
     * @param {String} customId - ID personalizado da interação
     * @returns {String|null} Nome do handler ou null se não encontrado
     */
    getHandler(customId) {
        if (!customId) return null;

        for (const [pattern, handlerName] of this.handlers) {
            if (pattern instanceof RegExp) {
                if (pattern.test(customId)) {
                    return handlerName;
                }
            } else if (typeof pattern === 'string') {
                if (customId === pattern || customId.startsWith(pattern)) {
                    return handlerName;
                }
            }
        }

        return null;
    }

    /**
     * Gera uma chave única para a interação
     * @param {Interaction} interaction - Interação do Discord
     * @returns {String} Chave única
     */
    getInteractionKey(interaction) {
        return `${interaction.id}_${interaction.user.id}_${interaction.customId || interaction.commandName}`;
    }

    /**
     * Verifica se a interação já foi processada
     * @param {Interaction} interaction - Interação do Discord
     * @returns {Boolean} Se já foi processada
     */
    isProcessed(interaction) {
        const key = this.getInteractionKey(interaction);
        return this.processedInteractions.has(key);
    }

    /**
     * Marca a interação como processada
     * @param {Interaction} interaction - Interação do Discord
     */
    markAsProcessed(interaction) {
        const key = this.getInteractionKey(interaction);
        this.processedInteractions.add(key);
        
        // Limpar cache após 5 minutos
        setTimeout(() => {
            this.processedInteractions.delete(key);
        }, 5 * 60 * 1000);
    }

    /**
     * Processa a interação e roteia para o handler correto
     * @param {Interaction} interaction - Interação do Discord
     * @param {Client} client - Cliente do Discord
     * @returns {Boolean} Se foi processada com sucesso
     */
    async routeInteraction(interaction, client) {
        // Verificar se já foi processada
        if (this.isProcessed(interaction)) {
            console.log(`🔄 Interação já processada: ${interaction.customId || interaction.commandName} | ${interaction.user.username}`);
            return true;
        }

        // Verificar se a interação ainda é válida
        if (interaction.replied || interaction.deferred) {
            console.log(`⚠️ Interação já respondida: ${interaction.customId || interaction.commandName} | ${interaction.user.username}`);
            return true;
        }

        const customId = interaction.customId;
        const handlerName = this.getHandler(customId);

        if (!handlerName) {
            console.log(`❓ Handler não encontrado para: ${customId}`);
            return false;
        }

        console.log(`📨 Roteando interação ${customId} para handler: ${handlerName} | Usuário: ${interaction.user.username}`);

        try {
            // Marcar como processada antes de executar
            this.markAsProcessed(interaction);

            // Importar e executar o handler dinamicamente
            const handler = await this.loadHandler(handlerName);
            if (handler && typeof handler.run === 'function') {
                await handler.run(interaction, client);
                console.log(`✅ Interação processada com sucesso: ${customId}`);
                return true;
            } else {
                console.error(`❌ Handler ${handlerName} não tem função run válida`);
                return false;
            }

        } catch (error) {
            console.error(`🚫 Erro ao processar interação ${customId} com handler ${handlerName}:`, error);
            
            // Remover da lista de processadas se houve erro
            const key = this.getInteractionKey(interaction);
            this.processedInteractions.delete(key);
            
            // Tentar responder com erro apenas se ainda não foi respondido
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: "❌ Ocorreu um erro interno. Tente novamente em alguns segundos.",
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error("Erro ao responder com mensagem de erro:", replyError.message);
                }
            }
            
            return false;
        }
    }

    /**
     * Carrega um handler dinamicamente
     * @param {String} handlerName - Nome do handler
     * @returns {Object|null} Handler carregado
     */
    async loadHandler(handlerName) {
        const handlerPaths = {
            'clanRequests': '../events/others/clanRequests',
            'clanConfig': '../events/others/clanConfig', 
            'clanManage': '../events/others/clanManage',
            'autoReplyConfig': '../events/others/autoReplyConfig',
            'ticketOpen': '../events/others/ticketOpen',
            'panel': '../events/others/panel'
        };

        const handlerPath = handlerPaths[handlerName];
        if (!handlerPath) {
            console.error(`❌ Caminho do handler não encontrado: ${handlerName}`);
            return null;
        }

        try {
            // Limpar cache do require para sempre pegar a versão mais recente
            delete require.cache[require.resolve(handlerPath)];
            const handler = require(handlerPath);
            return handler;
        } catch (error) {
            console.error(`❌ Erro ao carregar handler ${handlerName}:`, error);
            return null;
        }
    }

    /**
     * Gera relatório de debug das interações
     * @returns {String} Relatório formatado
     */
    generateDebugReport() {
        let report = "📊 **Relatório do Router de Interações**\n\n";
        report += `🔄 **Interações em cache:** ${this.processedInteractions.size}\n`;
        report += `🎯 **Handlers registrados:** ${this.handlers.size}\n\n`;
        
        report += "**Handlers configurados:**\n";
        for (const [pattern, handlerName] of this.handlers) {
            const patternStr = pattern instanceof RegExp ? pattern.toString() : pattern;
            report += `• ${handlerName}: ${patternStr}\n`;
        }

        return report;
    }

    /**
     * Limpa o cache de interações processadas
     */
    clearCache() {
        this.processedInteractions.clear();
        console.log("🧹 Cache de interações limpo");
    }
}

// Exportar uma instância singleton
module.exports = new InteractionRouter();