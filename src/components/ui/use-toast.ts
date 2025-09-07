"use client";

import { useEffect, useState } from "react";
import { ToastProps } from "@/components/ui/toast";

// Definició de tipus per a l'estat del toast
type ToasterToast = ToastProps & {
    id: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    duration?: number;
    dismiss: () => void;
    update: (props: Partial<ToasterToast>) => void;
};

// Definició de l'estat del store
interface ToastState {
    toasts: ToasterToast[];
}

const TOAST_LIMIT = 1;

let count = 0;
function generateId(): string {
    count = (count + 1) % Number.MAX_VALUE;
    return count.toString();
}

// Implementació del store
const toastStore = {
    state: {
        toasts: [],
    } as ToastState,
    listeners: [] as ((state: ToastState) => void)[],

    getState(): ToastState {
        return toastStore.state;
    },

    setState(nextState: ((prevState: ToastState) => ToastState) | Partial<ToastState>): void {
        if (typeof nextState === 'function') {
            toastStore.state = nextState(toastStore.state);
        } else {
            toastStore.state = { ...toastStore.state, ...nextState };
        }
        
        toastStore.listeners.forEach(listener => listener(toastStore.state));
    },

    subscribe(listener: (state: ToastState) => void): () => void {
        toastStore.listeners.push(listener);
        return () => {
            toastStore.listeners = toastStore.listeners.filter(l => l !== listener);
        };
    },
};

type AddToastProps = Omit<ToasterToast, "id" | "dismiss" | "update">;

export const toast = (props: AddToastProps) => {
    const id = generateId();

    const update = (newProps: Partial<ToasterToast>) =>
        toastStore.setState((state) => ({
            ...state,
            toasts: state.toasts.map((t) =>
                t.id === id ? { ...t, ...newProps } : t
            ),
        }));

    const dismiss = () => toastStore.setState((state) => ({
        ...state,
        toasts: state.toasts.filter((t) => t.id !== id),
    }));

    toastStore.setState((state) => ({
        ...state,
        toasts: [
            { ...props, id, dismiss, update },
            ...state.toasts,
        ].slice(0, TOAST_LIMIT),
    }));

    return {
        id,
        dismiss,
        update,
    };
};

export function useToast() {
    const [state, setState] = useState<ToastState>(toastStore.getState());

    useEffect(() => {
        const unsubscribe = toastStore.subscribe((newState) => {
            setState(newState);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        const timeouts: NodeJS.Timeout[] = [];

        state.toasts.forEach((t) => {
            if (t.duration === Infinity) {
                return;
            }

            const timeout = setTimeout(() => {
                t.dismiss();
            }, t.duration || 5000);

            timeouts.push(timeout);
        });

        return () => {
            timeouts.forEach((timeout) => clearTimeout(timeout));
        };
    }, [state.toasts]);

    return {
        toast,
        toasts: state.toasts,
    };
}
