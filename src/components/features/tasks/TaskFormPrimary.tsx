// src/components/features/tasks/TaskFormPrimary.tsx
'use client';

import EditorWysiwyg from '@/components/ui/EditorWysiwyg';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JSONContent } from '@tiptap/react';
import { AlignLeft, ListTodo } from 'lucide-react';

interface TaskFormPrimaryProps {
  initialTitle: string;
  descriptionContent: string;
  onDescriptionChange: (html: string, json: JSONContent) => void;
}

export function TaskFormPrimary({
  initialTitle,
  descriptionContent,
  onDescriptionChange,
}: TaskFormPrimaryProps) {
  return (
    <div className="space-y-4">
      {/* Títol */}
      <div className="space-y-2">
        <Label htmlFor="title" className="flex items-center gap-2 text-base">
          <ListTodo className="w-5 h-5" />
          Títol de la Tasca
        </Label>
        <Input
          id="title"
          name="title"
          defaultValue={initialTitle}
          placeholder="Ex: Preparar informe trimestral"
          required
          className="text-lg"
        />
      </div>

      {/* Descripció */}
      <div className="space-y-2">
        <Label htmlFor="description" className="flex items-center gap-2 text-base">
          <AlignLeft className="w-5 h-5" />
          Descripció
        </Label>
        <EditorWysiwyg
          id="description"
          name="description"
          defaultValue={descriptionContent} // L'estat ve del hook
          onChange={onDescriptionChange}
        />
      </div>
    </div>
  );
}