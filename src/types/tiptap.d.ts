import { ReactNode } from 'react'
import { Editor } from '@tiptap/react'

declare module '@tiptap/react' {
  interface EditorContentProps {
    editor: Editor
    className?: string
  }

  export const EditorContent: React.FC<EditorContentProps>
} 