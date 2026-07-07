CREATE TABLE "public"."game_profiles" (
    "user_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    "acai_coins" integer NOT NULL DEFAULT 0,
    "level" integer NOT NULL DEFAULT 1,
    "xp" integer NOT NULL DEFAULT 0,
    "current_streak" integer NOT NULL DEFAULT 0,
    "last_played_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now(),
    PRIMARY KEY ("user_id")
);

-- Habilitar RLS
ALTER TABLE "public"."game_profiles" ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Qualquer um logado pode ler game profiles"
ON "public"."game_profiles"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuário pode inserir seu próprio profile"
ON "public"."game_profiles"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário pode atualizar seu próprio profile"
ON "public"."game_profiles"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
