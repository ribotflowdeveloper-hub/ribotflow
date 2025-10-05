import { FC } from 'react';

export const EmptyState: FC<{ message: string }> = ({ message }) => (
    <p className="text-center text-muted-foreground py-8">{message}</p>
);