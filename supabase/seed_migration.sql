-- ============================================================================
-- ARENA VOICE — CARGA E MIGRAÇÃO DE DADOS INICIAIS
-- ============================================================================

-- 1. Inserção do Evento Principal
INSERT INTO public.events (id, name, description, status, results_published, updated_at)
VALUES (
  'arena-voice-2026',
  'Arena Voice 2026',
  'Competição oficial de inovação com voto popular em tempo real.',
  'active',
  false,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 2. Inserção dos Projetos da Competição
INSERT INTO public.projects (id, event_id, name, category, description, banner_url, image_url, "order", active, status, updated_at)
VALUES (
  'projeto01',
  'arena-voice-2026',
  'Projeto 01',
  'Plataforma Inteligente de Gestão',
  'Solução preditiva e em tempo real para otimização de mobilidade e eficiência energética na malha.',
  '',
  '',
  1,
  true,
  'active',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  "order" = EXCLUDED."order",
  active = EXCLUDED.active,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO public.projects (id, event_id, name, category, description, banner_url, image_url, "order", active, status, updated_at)
VALUES (
  'projeto02',
  'arena-voice-2026',
  'Projeto 02',
  'Manutenção Preditiva com IoT',
  'Sensores inteligentes embarcados para diagnóstico antecipado de falhas em trens e vias permanentes.',
  '',
  '',
  2,
  true,
  'active',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  "order" = EXCLUDED."order",
  active = EXCLUDED.active,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO public.projects (id, event_id, name, category, description, banner_url, image_url, "order", active, status, updated_at)
VALUES (
  'projeto03',
  'arena-voice-2026',
  'Projeto 03',
  'Acessibilidade Digital',
  'Ecossistema inclusivo multicanal com inteligência artificial para orientação de passageiros com deficiência.',
  '',
  '',
  3,
  true,
  'active',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  "order" = EXCLUDED."order",
  active = EXCLUDED.active,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO public.projects (id, event_id, name, category, description, banner_url, image_url, "order", active, status, updated_at)
VALUES (
  'projeto04',
  'arena-voice-2026',
  'Projeto 04',
  'Sustentabilidade e Economia Circular',
  'Reaproveitamento avançado de componentes e gestão inteligente de resíduos industriais da frota.',
  '',
  '',
  4,
  true,
  'active',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  "order" = EXCLUDED."order",
  active = EXCLUDED.active,
  status = EXCLUDED.status,
  updated_at = NOW();

