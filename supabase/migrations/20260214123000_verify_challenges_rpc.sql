-- Add columns to gamification_challenges for automation
ALTER TABLE public.gamification_challenges 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('sales', 'orders', 'lessons', 'manual')) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS target_value INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS metric_table TEXT; -- e.g., 'pdv_orders', 'uni_progress'

-- Function to verify challenge progress
CREATE OR REPLACE FUNCTION public.verify_challenge_progress(
  p_user_id UUID,
  p_challenge_id UUID
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge RECORD;
  v_current_value DECIMAL(10,2) := 0;
  v_target_value DECIMAL(10,2);
  v_progress_percent INTEGER;
  v_status TEXT;
  v_user_challenge_id UUID;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM public.gamification_challenges WHERE id = p_challenge_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Challenge not found');
  END IF;

  v_target_value := v_challenge.target_value;

  -- Calculate current value based on type
  IF v_challenge.type = 'sales' THEN
    -- Sum of total sales for the user
    -- Assuming we track sales in pdv_orders.total where status = 'paid'
    -- And we only count sales within the challenge period (created_at <= end_date)
    SELECT COALESCE(SUM(total), 0) INTO v_current_value
    FROM public.pdv_orders
    WHERE user_id = p_user_id 
      AND status = 'paid'
      AND created_at >= v_challenge.created_at
      AND created_at <= v_challenge.end_date;

  ELSIF v_challenge.type = 'orders' THEN
    -- Count of orders
    SELECT COUNT(*) INTO v_current_value
    FROM public.pdv_orders
    WHERE user_id = p_user_id 
      AND status = 'paid'
      AND created_at >= v_challenge.created_at
      AND created_at <= v_challenge.end_date;

  ELSIF v_challenge.type = 'lessons' THEN
    -- Count of completed lessons
    -- Assuming uni_progress tracks completion
    SELECT COUNT(*) INTO v_current_value
    FROM public.uni_progress
    WHERE user_id = p_user_id 
      AND completed = true
      AND completed_at >= v_challenge.created_at
      AND completed_at <= v_challenge.end_date;
      
  ELSE
    -- Manual or unknown type, do nothing automatically
    RETURN jsonb_build_object('message', 'Manual challenge type, no auto-verification');
  END IF;

  -- Calculate progress percentage
  IF v_target_value > 0 THEN
    v_progress_percent := LEAST(FLOOR((v_current_value / v_target_value) * 100), 100);
  ELSE
    v_progress_percent := 100;
  END IF;

  -- Determine status
  IF v_progress_percent >= 100 THEN
    v_status := 'completed';
  ELSE
    v_status := 'active';
  END IF;

  -- Update or Insert user_challenge
  INSERT INTO public.user_challenges (user_id, challenge_id, status, progress, joined_at)
  VALUES (p_user_id, p_challenge_id, v_status, v_progress_percent, now())
  ON CONFLICT (user_id, challenge_id)
  DO UPDATE SET
    status = v_status,
    progress = v_progress_percent,
    completed_at = CASE WHEN v_status = 'completed' AND public.user_challenges.completed_at IS NULL THEN now() ELSE public.user_challenges.completed_at END
  RETURNING id INTO v_user_challenge_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_challenge_id', v_user_challenge_id,
    'new_status', v_status,
    'new_progress', v_progress_percent,
    'current_value', v_current_value
  );
END;
$$;
