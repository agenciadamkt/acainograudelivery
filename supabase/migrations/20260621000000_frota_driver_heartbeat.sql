-- O app do motorista hoje só prova que está "vivo" através do GPS
-- (current_location/updated_at). Se o GPS travar (tela bloqueada, economia
-- de bateria agressiva do fabricante, app suspenso), o admin não tem como
-- distinguir "motorista sem sinal de GPS" de "app fechado/morto" — os dois
-- parecem iguais no mapa. last_heartbeat é um sinal de vida independente do
-- GPS, atualizado em intervalo fixo enquanto o app estiver aberto e online.
ALTER TABLE public.fleet_drivers
  ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;
