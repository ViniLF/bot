const {Client , GatewayIntentBits,Collection, Partials } = require("discord.js");
console.clear()

const client = new Client({
  intents: Object.keys(GatewayIntentBits),
  partials: Object.keys(Partials)
});

module.exports = client;
client.slashCommands = new Collection();
const {token} = require("./config.json");

process.on('unhandledRejection', (reason, promise) => {
  console.log(`🚫 Promise Rejeitada:`, reason);
  
  if (reason?.code) {
    switch(reason.code) {
      case 10062:
        console.log('💡 Dica: Interação desconhecida - verifique se não está respondendo múltiplas vezes ou se a interação expirou');
        break;
      case 40060:
        console.log('💡 Dica: Interação já foi respondida - adicione verificações interaction.replied/deferred');
        break;
      case 50013:
        console.log('💡 Dica: Sem permissões - verifique as permissões do bot no canal/servidor');
        break;
      case 50001:
        console.log('💡 Dica: Sem acesso - verifique se o bot pode ver o canal ou recurso');
        break;
      default:
        console.log(`🔍 Código do erro Discord: ${reason.code}`);
    }
  }

  if (reason?.url) {
    console.log(`🌐 URL da requisição: ${reason.url}`);
  }
});

process.on('uncaughtException', (error, origin) => {
  console.log(`🚫 Exceção não capturada:`, error);
  console.log(`📍 Origem:`, origin);
  
  if (error?.code) {
    switch(error.code) {
      case 10062:
        console.log('💡 Dica: Interação desconhecida - pode ser problema de timeout (>3s)');
        break;
      case 40060:
        console.log('💡 Dica: Interação já respondida - implemente verificações antes de responder');
        break;
      case 50013:
        console.log('💡 Dica: Sem permissões - verifique configurações do bot');
        break;
      case 50001:
        console.log('💡 Dica: Sem acesso - verifique se o recurso ainda existe');
        break;
      default:
        console.log(`🔍 Código do erro: ${error.code}`);
    }
  }

  if (error?.stack) {
    console.log(`📚 Stack trace:`, error.stack);
  }
});

client.on('error', (error) => {
  console.log('🚫 Erro do Cliente Discord:', error);
});

client.on('warn', (info) => {
  console.log('⚠️ Aviso do Discord:', info);
});

client.on('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);
  console.log(`👥 Usuários: ${client.users.cache.size}`);
});

client.on('guildCreate', (guild) => {
  console.log(`➕ Entrou no servidor: ${guild.name} (${guild.id})`);
});

client.on('guildDelete', (guild) => {
  console.log(`➖ Saiu do servidor: ${guild.name} (${guild.id})`);
});

async function startBot() {
  try {
    console.log('🔄 Iniciando bot...');
    await client.login(token);
    console.log('🎉 Bot iniciado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao fazer login:', error);
    
    if (error.code === 'TokenInvalid') {
      console.error('🔑 Token inválido! Verifique o arquivo config.json');
    } else if (error.code === 'DisallowedIntents') {
      console.error('🚫 Intents não permitidas! Verifique as configurações no Discord Developer Portal');
    }
    
    process.exit(1);
  }
}

const evento = require("./handler/Events");
evento.run(client);
require("./handler/index")(client);

startBot();

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, desligando bot...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, desligando bot...');
  client.destroy();
  process.exit(0);
});