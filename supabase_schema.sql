-- ══════════════════════════════════════════════════════════
-- NutriAI v4 — SUPABASE SCHEMA DEFINITIVO
-- Execute tudo de uma vez no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── LIMPAR políticas antigas ──
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname, tablename FROM pg_policies WHERE schemaname='public'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.policyname, p.tablename); END LOOP;
END $$;

-- ═══════════ TABELAS ═══════════

CREATE TABLE IF NOT EXISTS profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL DEFAULT '',
  peso              NUMERIC(5,2),
  altura            NUMERIC(5,2),
  idade             INTEGER,
  sexo              TEXT CHECK (sexo IN ('masculino','feminino','outro')),
  objetivo          TEXT CHECK (objetivo IN ('emagrecer','ganhar_massa','manutencao','saude_geral')),
  nivel_atividade   TEXT CHECK (nivel_atividade IN ('sedentario','leve','moderado','intenso')),
  tipo_dieta        TEXT DEFAULT 'equilibrada',
  restricoes        TEXT[],
  meta_calorias     INTEGER DEFAULT 1800,
  meta_proteinas    INTEGER DEFAULT 90,
  meta_carboidratos INTEGER DEFAULT 200,
  meta_gorduras     INTEGER DEFAULT 60,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingredients (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  quantidade TEXT,
  categoria  TEXT DEFAULT 'Outros',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  quantidade    TEXT,
  tipo_refeicao TEXT DEFAULT 'Almoço',
  calorias      INTEGER DEFAULT 0,
  proteinas     NUMERIC(6,2) DEFAULT 0,
  carboidratos  NUMERIC(6,2) DEFAULT 0,
  gorduras      NUMERIC(6,2) DEFAULT 0,
  fibras        NUMERIC(6,2) DEFAULT 0,
  data_registro DATE DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semana_inicio DATE NOT NULL,
  dia_semana    TEXT NOT NULL,
  tipo_refeicao TEXT NOT NULL,
  descricao     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, semana_inicio, dia_semana, tipo_refeicao)
);

CREATE TABLE IF NOT EXISTS ai_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL DEFAULT 'geral',
  prompt_used TEXT,
  resposta    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_list (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  quantidade TEXT,
  categoria  TEXT DEFAULT 'Outros',
  comprado   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  descricao   TEXT,
  meta_valor  NUMERIC,
  atual_valor NUMERIC DEFAULT 0,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  descricao  TEXT,
  tipo       TEXT DEFAULT 'receita',
  dados      JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo     TEXT NOT NULL,
  mensagem   TEXT,
  tipo       TEXT DEFAULT 'info',
  lida       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progress_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peso         NUMERIC(5,2),
  calorias     INTEGER,
  proteinas    NUMERIC(6,2),
  carboidratos NUMERIC(6,2),
  gorduras     NUMERIC(6,2),
  data         DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, data)
);

-- ═══════════ RLS ═══════════
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list  ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_p       ON profiles      FOR ALL USING (auth.uid()=id)      WITH CHECK (auth.uid()=id);
CREATE POLICY ingredients_p    ON ingredients   FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY meals_p          ON meals         FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY meal_plans_p     ON meal_plans    FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY ai_history_p     ON ai_history    FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY shopping_list_p  ON shopping_list FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY goals_p          ON goals         FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY favorites_p      ON favorites     FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY notifications_p  ON notifications FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY progress_logs_p  ON progress_logs FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- ═══════════ ÍNDICES ═══════════
CREATE INDEX IF NOT EXISTS idx_ingr_u      ON ingredients(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_ud    ON meals(user_id, data_registro DESC);
CREATE INDEX IF NOT EXISTS idx_plans_u     ON meal_plans(user_id, semana_inicio);
CREATE INDEX IF NOT EXISTS idx_ai_u        ON ai_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_u      ON shopping_list(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_u       ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_u     ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prog_u      ON progress_logs(user_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_goals_u     ON goals(user_id);

-- ═══════════ TRIGGERS ═══════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ═══════════ VERIFICAÇÃO ═══════════
SELECT 'SETUP OK ✓' AS status,
       count(DISTINCT t.table_name)      AS tabelas,
       count(DISTINCT p.policyname)      AS politicas
FROM information_schema.tables t
LEFT JOIN pg_policies p ON p.tablename=t.table_name AND p.schemaname='public'
WHERE t.table_schema='public' AND t.table_type='BASE TABLE';
