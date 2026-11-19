/**
 * Utilitário Centralizado de Padronização de Mensagens e Tratamento Seguro de Erros
 * Arena Voice — Voto Popular
 *
 * Garante que:
 * 1. O usuário final NUNCA veja jargões técnicos, códigos de erro internos, nomes de banco, tabelas ou tecnologias.
 * 2. Administradores e desenvolvedores continuem tendo rastreabilidade completa via logs internos (console.error) com timestamp, operação, código e contexto.
 * 3. Nenhuma informação sensível (senhas, tokens, chaves) seja exposta.
 */

export interface TechnicalErrorContext {
  operation?: string;
  eventId?: string | null;
  projectId?: string | null;
  userId?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Remove dados sensíveis (senhas, tokens, chaves) de objetos de contexto antes de logar
 */
function sanitizeMetadata(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const sanitized: Record<string, any> = Array.isArray(data) ? [] : {};
  const sensitiveKeys = ['password', 'senha', 'token', 'access_token', 'refresh_token', 'secret', 'key', 'apikey', 'auth'];

  for (const key of Object.keys(data)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      sanitized[key] = sanitizeMetadata(data[key]);
    } else {
      sanitized[key] = data[key];
    }
  }
  return sanitized;
}

/**
 * Registra internamente o detalhe técnico para desenvolvedores e administradores
 */
export function logTechnicalError(error: any, context?: TechnicalErrorContext): void {
  const timestamp = new Date().toISOString();
  const rawMessage = error?.message || (typeof error === 'string' ? error : 'Erro desconhecido');
  const code = error?.code || error?.status || error?.statusCode || 'UNKNOWN_CODE';
  const operation = context?.operation || 'Operação Interna';
  const eventId = context?.eventId || 'N/A';

  console.error('[ARENA_VOICE_ERROR_LOG]', {
    timestamp,
    operation,
    eventId,
    projectId: context?.projectId || 'N/A',
    userId: context?.userId || 'N/A',
    errorCode: code,
    technicalMessage: rawMessage,
    details: error?.details || error?.hint || null,
    metadata: context?.metadata ? sanitizeMetadata(context.metadata) : undefined,
    stack: error?.stack ? error.stack.split('\n').slice(0, 4).join('\n') : undefined,
  });
}

/**
 * Converte qualquer erro do sistema em uma mensagem humana, profissional e orientativa
 */
export function formatUserErrorMessage(error: any, context?: TechnicalErrorContext): string {
  // Sempre registra internamente primeiro
  logTechnicalError(error, context);

  const raw = (error?.message || (typeof error === 'string' ? error : '')).toLowerCase();
  const code = String(error?.code || error?.status || '').toUpperCase();

  // 1. Registro inexistente ou falha de coerção PostgREST (PGRST116 / single())
  if (
    raw.includes('cannot coerce result to a single json object') ||
    raw.includes('multiple (or no) rows returned') ||
    code === 'PGRST116' ||
    raw.includes('not found') ||
    raw.includes('não encontrado')
  ) {
    if (context?.eventId || context?.operation?.toLowerCase().includes('evento')) {
      return 'Não foi possível localizar o evento solicitado. Atualize a página e tente novamente.';
    }
    if (context?.projectId || context?.operation?.toLowerCase().includes('projeto')) {
      return 'Não foi possível localizar o projeto solicitado. Atualize a página e tente novamente.';
    }
    return 'Não foi possível localizar as informações solicitadas. Atualize a página e tente novamente.';
  }

  // 2. Violação de integridade referencial (Foreign Key constraint 23503)
  if (
    raw.includes('violates foreign key constraint') ||
    raw.includes('foreign key') ||
    code === '23503'
  ) {
    return 'Não foi possível excluir este registro porque existem informações vinculadas a ele.';
  }

  // 3. Violação de permissão / RLS (42501 / permission denied)
  if (
    raw.includes('row-level security') ||
    raw.includes('rls') ||
    raw.includes('permission denied') ||
    code === '42501' ||
    raw.includes('restrita') ||
    raw.includes('não possui autorização')
  ) {
    return 'Você não possui permissão para realizar esta ação.';
  }

  // 4. Registro duplicado (Unique constraint 23505)
  if (
    raw.includes('duplicate key') ||
    raw.includes('unique constraint') ||
    code === '23505' ||
    raw.includes('already exists')
  ) {
    return 'Já existe um cadastro com essas informações no sistema.';
  }

  // 5. Sessão expirada / Não autorizado (401 / JWT)
  if (
    raw.includes('jwt') ||
    raw.includes('invalid_credentials') ||
    raw.includes('invalid login') ||
    raw.includes('unauthorized') ||
    code === '401'
  ) {
    return 'Sua sessão não está autorizada para acessar esta funcionalidade. Faça login novamente.';
  }

  // 6. Falha de rede / Conexão
  if (
    raw.includes('failed to fetch') ||
    raw.includes('network') ||
    raw.includes('conexão') ||
    raw.includes('offline') ||
    raw.includes('net::err') ||
    code === 'NETWORK_ERROR'
  ) {
    return 'Não foi possível conectar ao sistema. Verifique sua conexão e tente novamente.';
  }

  // 7. Timeout / Operação demorada
  if (
    raw.includes('timeout') ||
    raw.includes('timed out') ||
    code === '504' ||
    code === '524'
  ) {
    return 'A operação está demorando mais que o esperado. Tente novamente.';
  }

  // 8. Falha de Armazenamento / Upload de Imagem
  if (
    raw.includes('storage') ||
    raw.includes('bucket') ||
    raw.includes('payload too large') ||
    raw.includes('excede o limite') ||
    code === '413'
  ) {
    return 'Não foi possível enviar o arquivo. Verifique o arquivo e tente novamente.';
  }

  // 9. Se a mensagem já é uma frase amigável do sistema em português sem jargões
  if (
    error?.message &&
    !error.message.includes('Supabase') &&
    !error.message.includes('Postgres') &&
    !error.message.includes('PostgREST') &&
    !error.message.includes('JSON') &&
    !error.message.includes('RLS') &&
    !error.message.includes('column') &&
    !error.message.includes('table') &&
    !error.message.includes('relation') &&
    !error.message.includes('PGRST')
  ) {
    return error.message;
  }

  // 10. Mensagem padrão cordial e profissional
  return 'Não foi possível concluir a operação. Tente novamente.';
}

/**
 * Atalho centralizado: registra o erro e devolve a mensagem humana
 */
export function handleUserError(error: any, context?: TechnicalErrorContext): string {
  return formatUserErrorMessage(error, context);
}

