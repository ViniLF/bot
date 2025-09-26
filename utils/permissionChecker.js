const { PermissionFlagsBits } = require('discord.js');

class PermissionChecker {
    /**
     * Verifica se o bot tem todas as permissões necessárias em um canal
     * @param {GuildChannel} channel - Canal para verificar
     * @param {GuildMember} botMember - Membro do bot
     * @param {Array} additionalPermissions - Permissões adicionais necessárias
     * @returns {Object} Resultado da verificação
     */
    static checkChannelPermissions(channel, botMember, additionalPermissions = []) {
        if (!channel || !botMember) {
            return {
                hasAllPermissions: false,
                missingPermissions: [],
                permissionNames: ['Canal ou bot não encontrado'],
                error: 'Invalid channel or bot member'
            };
        }

        const missing = [];
        const defaultPermissions = [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks
        ];

        const requiredPermissions = [...defaultPermissions, ...additionalPermissions];

        try {
            const permissions = channel.permissionsFor(botMember);
            
            if (!permissions) {
                return {
                    hasAllPermissions: false,
                    missingPermissions: requiredPermissions,
                    permissionNames: ['Não é possível verificar permissões'],
                    error: 'Unable to check permissions'
                };
            }

            for (const permission of requiredPermissions) {
                if (!permissions.has(permission)) {
                    missing.push(permission);
                }
            }

            return {
                hasAllPermissions: missing.length === 0,
                missingPermissions: missing,
                permissionNames: missing.map(perm => this.getPermissionName(perm)),
                error: null
            };
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            return {
                hasAllPermissions: false,
                missingPermissions: [],
                permissionNames: ['Erro ao verificar permissões'],
                error: error.message
            };
        }
    }

    /**
     * Verifica permissões antes de executar uma interação
     * @param {CommandInteraction} interaction - Interação do Discord
     * @param {Array} requiredPermissions - Permissões necessárias
     * @returns {Boolean} Se tem todas as permissões
     */
    static async checkInteractionPermissions(interaction, requiredPermissions = []) {
        const { guild, channel } = interaction;
        
        if (!guild || !channel) {
            console.log('❌ Interação fora de servidor ou sem canal');
            return false;
        }

        const botMember = guild.members.cache.get(interaction.client.user.id);
        if (!botMember) {
            console.log('❌ Bot não encontrado no servidor');
            return false;
        }

        const permissionCheck = this.checkChannelPermissions(
            channel, 
            botMember, 
            requiredPermissions
        );

        if (!permissionCheck.hasAllPermissions) {
            console.log(`❌ Permissões em falta no canal ${channel.name}:`, 
                permissionCheck.permissionNames.join(', '));
            
            // Tentar responder apenas se a interação ainda é válida
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: `❌ O bot não tem as permissões necessárias neste canal.\n**Permissões em falta:** ${permissionCheck.permissionNames.join(', ')}\n\n**Como resolver:** Um administrador precisa dar essas permissões ao bot neste canal.`,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Erro ao responder sobre permissões:', error.message);
                }
            }
            
            return false;
        }

        return true;
    }

    /**
     * Verifica se um canal específico existe e se o bot tem acesso
     * @param {Guild} guild - Servidor do Discord
     * @param {String} channelId - ID do canal
     * @param {Array} requiredPermissions - Permissões necessárias
     * @returns {Object} Resultado da verificação
     */
    static checkChannelAccess(guild, channelId, requiredPermissions = []) {
        if (!channelId) {
            return {
                hasAccess: false,
                channel: null,
                error: 'ID do canal não fornecido'
            };
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            return {
                hasAccess: false,
                channel: null,
                error: 'Canal não encontrado ou bot sem acesso'
            };
        }

        const botMember = guild.members.cache.get(guild.client?.user?.id || guild.members.me?.id);
        if (!botMember) {
            return {
                hasAccess: false,
                channel: channel,
                error: 'Bot não encontrado no servidor'
            };
        }

        const permissionCheck = this.checkChannelPermissions(channel, botMember, requiredPermissions);
        
        return {
            hasAccess: permissionCheck.hasAllPermissions,
            channel: channel,
            error: permissionCheck.hasAllPermissions ? null : `Permissões em falta: ${permissionCheck.permissionNames.join(', ')}`,
            missingPermissions: permissionCheck.permissionNames
        };
    }

    /**
     * Converte flag de permissão para nome legível
     * @param {BigInt} permission - Flag da permissão
     * @returns {String} Nome da permissão
     */
    static getPermissionName(permission) {
        const permissionNames = {
            [PermissionFlagsBits.ViewChannel]: 'Ver Canal',
            [PermissionFlagsBits.SendMessages]: 'Enviar Mensagens',
            [PermissionFlagsBits.EmbedLinks]: 'Inserir Links',
            [PermissionFlagsBits.AttachFiles]: 'Anexar Arquivos',
            [PermissionFlagsBits.ReadMessageHistory]: 'Ver Histórico de Mensagens',
            [PermissionFlagsBits.UseExternalEmojis]: 'Usar Emojis Externos',
            [PermissionFlagsBits.AddReactions]: 'Adicionar Reações',
            [PermissionFlagsBits.ManageMessages]: 'Gerenciar Mensagens',
            [PermissionFlagsBits.ManageChannels]: 'Gerenciar Canais',
            [PermissionFlagsBits.ManageRoles]: 'Gerenciar Cargos',
            [PermissionFlagsBits.CreatePublicThreads]: 'Criar Threads Públicas',
            [PermissionFlagsBits.CreatePrivateThreads]: 'Criar Threads Privadas',
            [PermissionFlagsBits.SendMessagesInThreads]: 'Enviar Mensagens em Threads',
            [PermissionFlagsBits.Connect]: 'Conectar (Voz)',
            [PermissionFlagsBits.Speak]: 'Falar (Voz)',
            [PermissionFlagsBits.MuteMembers]: 'Silenciar Membros',
            [PermissionFlagsBits.DeafenMembers]: 'Ensurdecer Membros',
            [PermissionFlagsBits.MoveMembers]: 'Mover Membros'
        };

        return permissionNames[permission] || `Permissão Desconhecida (${permission})`;
    }

    /**
     * Verifica se o usuário tem cargo autorizado
     * @param {GuildMember} member - Membro do Discord
     * @param {Array} authorizedRoles - Array de IDs de cargos autorizados
     * @returns {Boolean} Se tem autorização
     */
    static hasAuthorizedRole(member, authorizedRoles = []) {
        if (!member || !authorizedRoles || authorizedRoles.length === 0) {
            return false;
        }
        
        return authorizedRoles.some(roleId => member.roles.cache.has(roleId));
    }

    /**
     * Valida configuração do sistema antes de executar
     * @param {Object} config - Configuração do sistema
     * @param {Guild} guild - Servidor do Discord
     * @returns {Object} Resultado da validação
     */
    static validateSystemConfig(config, guild) {
        const issues = [];
        const warnings = [];

        if (!config) {
            issues.push('Configuração não encontrada');
            return { isValid: false, issues, warnings };
        }

        if (!config.enabled) {
            issues.push('Sistema está desativado');
        }

        // Verificar canais
        if (!config.channels?.staff) {
            issues.push('Canal staff não configurado');
        } else {
            const staffCheck = this.checkChannelAccess(guild, config.channels.staff);
            if (!staffCheck.hasAccess) {
                issues.push(`Canal staff: ${staffCheck.error}`);
            }
        }

        if (!config.channels?.public) {
            warnings.push('Canal público não configurado - anúncios não serão enviados');
        } else {
            const publicCheck = this.checkChannelAccess(guild, config.channels.public);
            if (!publicCheck.hasAccess) {
                warnings.push(`Canal público: ${publicCheck.error}`);
            }
        }

        // Verificar cargos autorizados
        if (!config.roles?.authorized || config.roles.authorized.length === 0) {
            warnings.push('Nenhum cargo autorizado configurado - apenas owner pode usar');
        } else {
            const validRoles = config.roles.authorized.filter(roleId => 
                guild.roles.cache.has(roleId)
            );
            
            if (validRoles.length === 0) {
                warnings.push('Todos os cargos autorizados são inválidos');
            } else if (validRoles.length < config.roles.authorized.length) {
                warnings.push(`${config.roles.authorized.length - validRoles.length} cargo(s) autorizado(s) não encontrado(s)`);
            }
        }

        return {
            isValid: issues.length === 0,
            issues,
            warnings
        };
    }

    /**
     * Gera relatório de permissões para debug
     * @param {Guild} guild - Servidor do Discord
     * @param {Array} channelIds - IDs dos canais para verificar
     * @returns {String} Relatório formatado
     */
    static generatePermissionReport(guild, channelIds = []) {
        const botMember = guild.members.cache.get(guild.client?.user?.id || guild.members.me?.id);
        
        if (!botMember) {
            return '❌ Bot não encontrado no servidor';
        }

        let report = `📊 **Relatório de Permissões - ${guild.name}**\n\n`;
        report += `🤖 **Bot:** ${botMember.user.tag}\n`;
        report += `👑 **Owner:** ${botMember.permissions.has(PermissionFlagsBits.Administrator) ? 'Sim' : 'Não'}\n\n`;

        for (const channelId of channelIds) {
            const channel = guild.channels.cache.get(channelId);
            if (!channel) {
                report += `❌ **Canal ${channelId}:** Não encontrado\n`;
                continue;
            }

            const permCheck = this.checkChannelPermissions(channel, botMember);
            const status = permCheck.hasAllPermissions ? '✅' : '❌';
            
            report += `${status} **${channel.name}** (${channel.type})\n`;
            
            if (!permCheck.hasAllPermissions) {
                report += `   Faltando: ${permCheck.permissionNames.join(', ')}\n`;
            }
            
            report += '\n';
        }

        return report;
    }
}

module.exports = PermissionChecker;