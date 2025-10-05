// Ubicació: /app/(app)/comunicacio/planificador/_hooks/useSocialPlanner.ts
"use client";

import { useState, useMemo, useTransition } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { addMonths, subMonths } from 'date-fns';
import { toast } from 'sonner';

import { scheduleSocialPostAction, unscheduleSocialPostAction, deleteSocialPostAction } from '../actions';
import type { SocialPost } from '@/types/comunicacio/SocialPost';

interface UseSocialPlannerProps {
    initialPosts: SocialPost[];
}

export function useSocialPlanner({ initialPosts }: UseSocialPlannerProps) {
    const [posts, setPosts] = useState(initialPosts);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isPending, startTransition] = useTransition();

    // Gestió dels diàlegs
    const [dialogState, setDialogState] = useState({
        create: false,
        schedule: false,
        view: false,
    });
    const [postToView, setPostToView] = useState<SocialPost | null>(null);
    const [postToSchedule, setPostToSchedule] = useState<{ post: SocialPost; date: Date } | null>(null);

    // Dades derivades
    const unscheduledDrafts = useMemo(() => posts.filter(p => p.status === 'draft'), [posts]);
    const calendarPosts = useMemo(() => posts.filter(p => p.status !== 'draft'), [posts]);

    // Handlers dels diàlegs
    const openCreateDialog = () => setDialogState(p => ({ ...p, create: true }));
    const openViewDialog = (post: SocialPost) => {
        setPostToView(post);
        setDialogState(p => ({ ...p, view: true }));
    };

    // Lògica de Drag & Drop
    const onDragEnd = (result: DropResult) => {
        const { destination, draggableId } = result;
        if (!destination) return;

        const postId = parseInt(draggableId);
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        if (destination.droppableId.startsWith('day-')) {
            const dateStr = destination.droppableId.replace('day-', '');
            setPostToSchedule({ post, date: new Date(dateStr) });
            setDialogState(p => ({ ...p, schedule: true }));
        } else if (destination.droppableId === 'unscheduled-drafts' && post.status === 'scheduled') {
            handleUnschedule(post.id);
        }
    };

    // Accions
    const handleScheduleConfirm = (time: string) => {
        if (!postToSchedule) return;
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledDateTime = new Date(postToSchedule.date.getFullYear(), postToSchedule.date.getMonth(), postToSchedule.date.getDate(), hours, minutes);

        startTransition(async () => {
            const { success, message } = await scheduleSocialPostAction(postToSchedule.post.id, scheduledDateTime.toISOString());
            toast[success ? 'success' : 'error'](message);
            if (success) {
                setPosts(prev => prev.map(p => p.id === postToSchedule.post.id ? { ...p, status: 'scheduled', scheduled_at: scheduledDateTime.toISOString() } : p));
            }
            setDialogState(p => ({ ...p, schedule: false }));
            setPostToSchedule(null);
        });
    };

    const handleCreatePost = (newPost: SocialPost) => {
        setPosts(prev => [newPost, ...prev]);
        setDialogState(p => ({ ...p, create: false }));
    };

    const handleUnschedule = (postId: number) => {
        startTransition(async () => {
            const result = await unscheduleSocialPostAction(postId);
            toast[result.success ? 'success' : 'error'](result.message);
            if (result.success) {
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'draft', scheduled_at: null } : p));
                setDialogState(p => ({ ...p, view: false }));
            }
        });
    };

    const handleDeletePost = (postId: number) => {
        startTransition(async () => {
            const result = await deleteSocialPostAction(postId);
            toast[result.success ? 'success' : 'error'](result.message);
            if (result.success) {
                setPosts(prev => prev.filter(p => p.id !== postId));
            }
        });
    };
    
    // Navegació del calendari
    const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
    const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));

    return {
        posts, currentMonth, isPending, unscheduledDrafts, calendarPosts, dialogState, postToView, postToSchedule,
        onDragEnd, handleScheduleConfirm, handleCreatePost, handleUnschedule, handleDeletePost, openViewDialog, openCreateDialog,
        setDialogState, nextMonth, prevMonth
    };
}