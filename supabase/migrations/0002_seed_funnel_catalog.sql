-- =====================================================================
-- LUMEN Studio — Seed do catálogo de funis (21 modelos)
-- Idempotente: usa ON CONFLICT (name) DO UPDATE.
-- =====================================================================

-- Garantir restrição de unicidade na coluna name para o ON CONFLICT (name) funcionar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'funnel_catalog_items_name_key'
  ) THEN
    ALTER TABLE funnel_catalog_items ADD CONSTRAINT funnel_catalog_items_name_key UNIQUE (name);
  END IF;
END $$;

INSERT INTO funnel_catalog_items
  (name, stage_tags, ticket_tags, requirements_json, assets_json, status, difficulty, estimated_time)
VALUES
  -- 1
  ('Reativação de Base',
   ARRAY['entrada'],
   ARRAY['ate_97','97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Ter lista de contatos"]}'::jsonb,
   '{"ativos":["oferta_principal","pilares_de_conteudo"]}'::jsonb,
   'ativo','iniciante','1-2 semanas'),
  -- 2
  ('Isca Digital',
   ARRAY['entrada'],
   ARRAY['ate_97','97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Criar material gratuito"]}'::jsonb,
   '{"ativos":["oferta_principal","stack_de_prova"]}'::jsonb,
   'ativo','iniciante','2-3 semanas'),
  -- 3
  ('Reels + ManyChat',
   ARRAY['entrada'],
   ARRAY['ate_97','97_297','297_997'],
   '{"requisitos":["Fazer vídeos"]}'::jsonb,
   '{"ativos":["pilares_de_conteudo","linha_editorial"]}'::jsonb,
   'ativo','medio','1-2 semanas'),
  -- 4
  ('Nissin Miojo',
   ARRAY['entrada'],
   ARRAY['ate_97','97_297'],
   '{"requisitos":["Fazer vídeos"]}'::jsonb,
   '{"ativos":["oferta_principal","bio_taglines"]}'::jsonb,
   'ativo','medio','1-2 semanas'),
  -- 5
  ('Diagnóstico Público',
   ARRAY['entrada'],
   ARRAY['297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Fazer vídeos"]}'::jsonb,
   '{"ativos":["stack_de_prova","posicionamento"]}'::jsonb,
   'ativo','avancado','2-4 semanas'),
  -- 6
  ('Jornada Documentada',
   ARRAY['nutricao'],
   ARRAY['97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Fazer vídeos"]}'::jsonb,
   '{"ativos":["storytelling","pilares_de_conteudo"]}'::jsonb,
   'ativo','medio','4-8 semanas'),
  -- 7
  ('IA em Ação',
   ARRAY['nutricao'],
   ARRAY['ate_97','97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Fazer vídeos"]}'::jsonb,
   '{"ativos":["pilares_de_conteudo","linha_editorial"]}'::jsonb,
   'beta','avancado','2-4 semanas'),
  -- 8
  ('Tripwire',
   ARRAY['conversao'],
   ARRAY['ate_97','97_297'],
   '{"requisitos":["Criar material gratuito"]}'::jsonb,
   '{"ativos":["oferta_principal","stack_de_prova"]}'::jsonb,
   'ativo','medio','1-2 semanas'),
  -- 9
  ('Empréstimo de Audiência',
   ARRAY['entrada'],
   ARRAY['97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Ter parceiros"]}'::jsonb,
   '{"ativos":["posicionamento","bio_taglines"]}'::jsonb,
   'ativo','medio','2-4 semanas'),
  -- 10
  ('Destaques em Sequência',
   ARRAY['nutricao'],
   ARRAY['ate_97','97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":[]}'::jsonb,
   '{"ativos":["linha_editorial","pilares_de_conteudo"]}'::jsonb,
   'ativo','iniciante','1-2 semanas'),
  -- 11
  ('Conteúdo Fixado',
   ARRAY['nutricao'],
   ARRAY['ate_97','97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":[]}'::jsonb,
   '{"ativos":["linha_editorial","posicionamento"]}'::jsonb,
   'ativo','iniciante','1 semana'),
  -- 12
  ('Série Semanal',
   ARRAY['nutricao'],
   ARRAY['ate_97','97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Fazer vídeos"]}'::jsonb,
   '{"ativos":["pilares_de_conteudo","storytelling"]}'::jsonb,
   'ativo','medio','4-8 semanas'),
  -- 13
  ('Broadcast',
   ARRAY['nutricao'],
   ARRAY['ate_97','97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Ter lista de contatos"]}'::jsonb,
   '{"ativos":["linha_editorial","pilares_de_conteudo"]}'::jsonb,
   'ativo','iniciante','1-2 semanas'),
  -- 14
  ('Close Friends VIP',
   ARRAY['nutricao'],
   ARRAY['97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Ter lista de contatos"]}'::jsonb,
   '{"ativos":["linha_editorial","pilares_de_conteudo"]}'::jsonb,
   'ativo','medio','2-3 semanas'),
  -- 15
  ('Diagnóstico',
   ARRAY['conversao'],
   ARRAY['297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Criar formulário"]}'::jsonb,
   '{"ativos":["oferta_principal","stack_de_prova"]}'::jsonb,
   'ativo','medio','2-4 semanas'),
  -- 16
  ('Link na Bio VSL',
   ARRAY['conversao'],
   ARRAY['97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Fazer vídeos"]}'::jsonb,
   '{"ativos":["oferta_principal","stack_de_prova","bio_taglines"]}'::jsonb,
   'ativo','avancado','3-5 semanas'),
  -- 17
  ('Link na Bio Carta de Vendas',
   ARRAY['conversao'],
   ARRAY['97_297','297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Escrever copy"]}'::jsonb,
   '{"ativos":["oferta_principal","stack_de_prova","bio_taglines"]}'::jsonb,
   'ativo','avancado','2-4 semanas'),
  -- 18
  ('Grupo WhatsApp + Aquecimento',
   ARRAY['conversao'],
   ARRAY['ate_97','97_297','297_997'],
   '{"requisitos":["Ter lista de contatos"]}'::jsonb,
   '{"ativos":["oferta_principal","pilares_de_conteudo"]}'::jsonb,
   'ativo','medio','2-4 semanas'),
  -- 19
  ('Aplicação/Formulário',
   ARRAY['conversao'],
   ARRAY['997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Criar formulário"]}'::jsonb,
   '{"ativos":["oferta_principal","posicionamento"]}'::jsonb,
   'ativo','medio','1-2 semanas'),
  -- 20
  ('Webinar/Aula ao Vivo',
   ARRAY['conversao'],
   ARRAY['297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Fazer vídeos"]}'::jsonb,
   '{"ativos":["oferta_principal","stack_de_prova","storytelling"]}'::jsonb,
   'ativo','avancado','3-5 semanas'),
  -- 21
  ('Aula Gravada + Aplicação',
   ARRAY['conversao'],
   ARRAY['297_997','997_2497','2497_9997','acima_9997'],
   '{"requisitos":["Fazer vídeos","Criar formulário"]}'::jsonb,
   '{"ativos":["oferta_principal","stack_de_prova","storytelling"]}'::jsonb,
   'ativo','avancado','3-6 semanas')
ON CONFLICT (name) DO UPDATE SET
  stage_tags     = EXCLUDED.stage_tags,
  ticket_tags    = EXCLUDED.ticket_tags,
  requirements_json = EXCLUDED.requirements_json,
  assets_json    = EXCLUDED.assets_json,
  status         = EXCLUDED.status,
  difficulty     = EXCLUDED.difficulty,
  estimated_time = EXCLUDED.estimated_time;