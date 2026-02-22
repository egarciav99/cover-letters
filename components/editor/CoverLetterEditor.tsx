'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo, Redo } from 'lucide-react';

interface CoverLetterEditorProps {
    content: string;
    onChange: (html: string) => void;
}

export default function CoverLetterEditor({ content, onChange }: CoverLetterEditorProps) {
    const editor = useEditor({
        extensions: [StarterKit, Underline],
        content,
        immediatelyRender: false,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                id: 'cover-letter-content',
                style: [
                    'min-height: 500px',
                    'padding: 40px 48px',
                    'background: #ffffff',
                    'color: #1a1a2e',
                    'font-family: Georgia, "Times New Roman", serif',
                    'font-size: 16px',
                    'line-height: 1.8',
                    'outline: none',
                    'border-radius: 0 0 12px 12px',
                ].join('; '),
            },
        },
    });

    if (!editor) return null;

    const ToolbarBtn = ({ onClick, active, title, children }: {
        onClick: () => void;
        active?: boolean;
        title: string;
        children: React.ReactNode;
    }) => (
        <button
            onClick={onClick}
            title={title}
            style={{
                background: active ? 'rgba(124,58,237,0.2)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 9px',
                cursor: 'pointer',
                color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!active) (e.target as HTMLElement).closest('button')!.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { if (!active) (e.target as HTMLElement).closest('button')!.style.background = 'transparent'; }}
        >
            {children}
        </button>
    );

    const Divider = () => (
        <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
    );

    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow)',
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                flexWrap: 'wrap',
            }}>
                <ToolbarBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold size={16} />
                </ToolbarBtn>
                <ToolbarBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic size={16} />
                </ToolbarBtn>
                <ToolbarBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon size={16} />
                </ToolbarBtn>
                <Divider />
                <ToolbarBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    <List size={16} />
                </ToolbarBtn>
                <ToolbarBtn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    <ListOrdered size={16} />
                </ToolbarBtn>
                <Divider />
                <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
                    <Undo size={16} />
                </ToolbarBtn>
                <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
                    <Redo size={16} />
                </ToolbarBtn>
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} />

            <style>{`
        .ProseMirror p { margin-bottom: 16px; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 24px; margin-bottom: 16px; }
        .ProseMirror li { margin-bottom: 4px; }
        .ProseMirror:focus { outline: none; }
      `}</style>
        </div>
    );
}
