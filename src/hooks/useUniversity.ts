
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ══ TYPES ══ */
export interface Trail {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    category: string;
    level: string;
    color: string;
    required: boolean;
    active: boolean;
    lessons_count?: number; // Count from DB
    lessons?: Lesson[];
}

export interface Lesson {
    id: string;
    trail_id: string;
    title: string;
    subtitle: string;
    duration: string;
    video_url: string;
    description: string;
    order: number;
    completed?: boolean; // Calculated from progress
    materials?: Material[];
    links?: LinkItem[];
    questions?: Question[];
}

export interface Material {
    id: string;
    lesson_id: string;
    name: string;
    type: string;
    size: string;
    url: string;
}

export interface LinkItem {
    id: string;
    lesson_id: string;
    title: string;
    url: string;
    description: string;
}

export interface Question {
    id: string;
    lesson_id: string;
    user_id: string;
    author_name?: string;
    author_avatar?: string;
    text: string;
    answered: boolean;
    reply?: string;
    created_at: string;
}

/* ══ HOOKS ══ */

export function useTrails() {
    return useQuery({
        queryKey: ['trails'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('uni_trails')
                .select('*, lessons:uni_lessons(count)')
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Transform count
            return data.map((t: any) => ({
                ...t,
                lessons_count: t.lessons?.[0]?.count || 0
            })) as Trail[];
        },
    });
}

export function useTrail(id: string) {
    return useQuery({
        queryKey: ['trail', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('uni_trails')
                .select(`
          *,
          lessons:uni_lessons(
            *,
            materials:uni_materials(*),
            links:uni_links(*),
            questions:uni_questions(*)
          )
        `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Trail;
        },
        enabled: !!id,
    });
}

/* ══ MUTATIONS ══ */

export function useCreateTrail() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (trail: Partial<Trail>) => {
            const { data, error } = await supabase.from('uni_trails').insert(trail).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trails'] });
        },
    });
}

export function useUpdateTrail() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...trail }: Partial<Trail> & { id: string }) => {
            const { data, error } = await supabase.from('uni_trails').update(trail).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['trails'] });
            queryClient.invalidateQueries({ queryKey: ['trail', data.id] });
        },
    });
}

export function useDeleteTrail() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('uni_trails').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trails'] });
        },
    });
}

// ─── LESSONS ───

export function useCreateLesson() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (lesson: Partial<Lesson>) => {
            const { data, error } = await supabase.from('uni_lessons').insert(lesson).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['trail', variables.trail_id] });
        },
    });
}

export function useUpdateLesson() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...lesson }: Partial<Lesson> & { id: string }) => {
            const { data, error } = await supabase.from('uni_lessons').update(lesson).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['trail', data.trail_id] });
        },
    });
}

export function useDeleteLesson() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, trailId }: { id: string; trailId: string }) => {
            const { error } = await supabase.from('uni_lessons').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['trail', variables.trailId] });
        },
    });
}

// ─── MATERIALS / LINKS / QUESTIONS ───

export function useCreateMaterial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (material: Partial<Material>) => {
            const { data, error } = await supabase.from('uni_materials').insert(material).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data, variables) => {
            // We need to invalidate the trail to refresh materials. Since we don't have trail_id directly in variables unless provided, 
            // we might need to invalidate specific queries or refetch relevant data. 
            // For simplicity, we can invalidate all trails or rely on parent refetching. 
            // Ideally pass trailId in context.
            queryClient.invalidateQueries({ queryKey: ['trail'] });
        },
    });
}

export function useDeleteMaterial() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('uni_materials').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trail'] });
        },
    });
}


export function useCreateLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (link: Partial<LinkItem>) => {
            const { data, error } = await supabase.from('uni_links').insert(link).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trail'] });
        },
    });
}

export function useDeleteLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('uni_links').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trail'] });
        },
    });
}

export function useCreateQuestion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (question: Partial<Question>) => {
            const { data, error } = await supabase.from('uni_questions').insert(question).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trail'] });
        },
    });
}

export function useAnswerQuestion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
            const { data, error } = await supabase
                .from('uni_questions')
                .update({ answered: true, reply, reply_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trail'] });
        },
    });
}
