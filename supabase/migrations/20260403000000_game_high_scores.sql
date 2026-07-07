CREATE TABLE "public"."game_scores" (
    "user_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    "score" integer NOT NULL DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT now(),
    PRIMARY KEY ("user_id")
);

-- Habilitar RLS
ALTER TABLE "public"."game_scores" ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Qualquer pessoa pode ler as pontuações"
ON "public"."game_scores"
FOR SELECT
USING (true);

CREATE POLICY "Usuários podem inserir a própria pontuação"
ON "public"."game_scores"
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar a própria pontuação"
ON "public"."game_scores"
FOR UPDATE
USING (auth.uid() = user_id);
