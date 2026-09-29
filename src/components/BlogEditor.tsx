import { Node, mergeAttributes } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, type ComponentType } from "react";
import { uploadBlogMedia } from "../lib/blog-media";
import { classifyBlogImages, imageFilesFromClipboard, stampImageShapes } from "../lib/blog-images";
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconClear,
  IconCode,
  IconHeading,
  IconHighlight,
  IconItalic,
  IconLine,
  IconLink,
  IconList,
  IconNumbers,
  IconPicture,
  IconQuote,
  IconRedo,
  IconStrike,
  IconSubhead,
  IconUnderline,
  IconUndo,
  IconVideo,
  IconYoutube,
} from "./editor-icons";

function Tool({
  label,
  icon: Icon,
  className,
  onClick,
}: {
  label: string;
  icon: ComponentType;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={className} aria-label={label} title={label} onClick={onClick}>
      <Icon />
    </button>
  );
}

const UploadedVideo = Node.create({
  name: "uploadedVideo",
  group: "block",
  atom: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: "video" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes({ controls: true }, HTMLAttributes)];
  },
});

async function uploadMedia(file: File): Promise<string> {
  const payload = await uploadBlogMedia(file);
  return payload.url;
}

export function BlogEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      handlePaste(_view, event) {
        const files = imageFilesFromClipboard(event.clipboardData);
        if (!files.length) return false;
        event.preventDefault();
        event.stopPropagation();
        void pasteImages(files);
        return true;
      },
      handleDrop(_view, event) {
        const files = imageFilesFromClipboard(event.dataTransfer);
        if (!files.length) return false;
        event.preventDefault();
        event.stopPropagation();
        void pasteImages(files);
        return true;
      },
    },
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Highlight,
      Image.extend({
        inline: true,
        group: "inline",
        addAttributes() {
          return {
            ...this.parent?.(),
            class: {
              default: "blog-figure",
              parseHTML: (element) => element.getAttribute("class"),
              renderHTML: (attributes) => (attributes.class ? { class: attributes.class } : {}),
            },
          };
        },
      }).configure({
        allowBase64: false,
      }),
      UploadedVideo,
      Youtube.configure({ width: 640, height: 360, nocookie: true, modestBranding: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "Set the piece here. Paste a picture from the clipboard, or fetch one from the tray.",
      }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor: current }) => emitHtml(current),
    onCreate: ({ editor: current }) => emitHtml(current),
  });

  editorRef.current = editor;

  function emitHtml(current: Editor) {
    classifyBlogImages(current.view.dom);
    onChange(stampImageShapes(current.getHTML(), current.view.dom));
  }

  function insertImage(current: Editor, url: string) {
    const pos = current.state.selection.$from.start();
    current.chain().focus().insertContentAt(pos, { type: "image", attrs: { src: url } }).run();
  }

  async function pasteImages(files: File[]) {
    const current = editorRef.current;
    if (!current) return;
    for (const file of files) {
      try {
        const url = await uploadMedia(file);
        insertImage(current, url);
      } catch (caught) {
        window.alert(caught instanceof Error ? caught.message : "The picture could not be added.");
      }
    }
  }

  useEffect(() => {
    if (!editor) return;
    classifyBlogImages(editor.view.dom);
    const onLoad = (event: Event) => {
      if (event.target instanceof HTMLImageElement) emitHtml(editor);
    };
    editor.view.dom.addEventListener("load", onLoad, true);
    return () => editor.view.dom.removeEventListener("load", onLoad, true);
  }, [editor]);

  if (!editor) return <p className="loading-line">Opening the editor…</p>;
  const view = editor;

  function mark(name: string) {
    return view.isActive(name) ? "is-on" : undefined;
  }

  async function pickFile(kind: "image" | "video", file: File | undefined) {
    if (!file) return;
    try {
      const url = await uploadMedia(file);
      if (kind === "image") insertImage(view, url);
      else view.chain().focus().insertContent({ type: "uploadedVideo", attrs: { src: url } }).run();
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : "The file could not be added.");
    }
  }

  function addYoutube() {
    const src = window.prompt("Paste a YouTube link");
    if (!src) return;
    view.chain().focus().setYoutubeVideo({ src }).run();
  }

  function addLink() {
    const href = window.prompt("Link address", view.getAttributes("link").href ?? "https://");
    if (href === null) return;
    if (!href) view.chain().focus().unsetLink().run();
    else view.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  return (
    <div className="blog-editor">
      <div className="blog-toolbar" role="toolbar" aria-label="Writing tools">
        <Tool label="Bold" className={mark("bold")} icon={IconBold} onClick={() => view.chain().focus().toggleBold().run()} />
        <Tool label="Italic" className={mark("italic")} icon={IconItalic} onClick={() => view.chain().focus().toggleItalic().run()} />
        <Tool label="Underline" className={mark("underline")} icon={IconUnderline} onClick={() => view.chain().focus().toggleUnderline().run()} />
        <Tool label="Strikethrough" className={mark("strike")} icon={IconStrike} onClick={() => view.chain().focus().toggleStrike().run()} />
        <Tool label="Highlight" className={mark("highlight")} icon={IconHighlight} onClick={() => view.chain().focus().toggleHighlight().run()} />
        <Tool label="Code" className={mark("code")} icon={IconCode} onClick={() => view.chain().focus().toggleCode().run()} />
        <span className="blog-toolbar-gap" />
        <Tool label="Heading" className={view.isActive("heading", { level: 2 }) ? "is-on" : undefined} icon={IconHeading} onClick={() => view.chain().focus().toggleHeading({ level: 2 }).run()} />
        <Tool label="Subheading" className={view.isActive("heading", { level: 3 }) ? "is-on" : undefined} icon={IconSubhead} onClick={() => view.chain().focus().toggleHeading({ level: 3 }).run()} />
        <Tool label="Bullet list" className={mark("bulletList")} icon={IconList} onClick={() => view.chain().focus().toggleBulletList().run()} />
        <Tool label="Numbered list" className={mark("orderedList")} icon={IconNumbers} onClick={() => view.chain().focus().toggleOrderedList().run()} />
        <Tool label="Quote" className={mark("blockquote")} icon={IconQuote} onClick={() => view.chain().focus().toggleBlockquote().run()} />
        <span className="blog-toolbar-gap" />
        <Tool label="Align left" icon={IconAlignLeft} onClick={() => view.chain().focus().setTextAlign("left").run()} />
        <Tool label="Align centre" icon={IconAlignCenter} onClick={() => view.chain().focus().setTextAlign("center").run()} />
        <Tool label="Align right" icon={IconAlignRight} onClick={() => view.chain().focus().setTextAlign("right").run()} />
        <span className="blog-toolbar-gap" />
        <Tool label="Link" className={mark("link")} icon={IconLink} onClick={addLink} />
        <Tool label="Picture" icon={IconPicture} onClick={() => imageInput.current?.click()} />
        <Tool label="Video" icon={IconVideo} onClick={() => videoInput.current?.click()} />
        <Tool label="YouTube" icon={IconYoutube} onClick={addYoutube} />
        <Tool label="Horizontal line" icon={IconLine} onClick={() => view.chain().focus().setHorizontalRule().run()} />
        <Tool label="Undo" icon={IconUndo} onClick={() => view.chain().focus().undo().run()} />
        <Tool label="Redo" icon={IconRedo} onClick={() => view.chain().focus().redo().run()} />
        <Tool label="Clear formatting" icon={IconClear} onClick={() => view.chain().focus().unsetAllMarks().run()} />
      </div>
      <input
        ref={imageInput}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        onChange={(event) => {
          void pickFile("image", event.target.files?.[0]).finally(() => {
            event.target.value = "";
          });
        }}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/mp4,video/webm"
        hidden
        onChange={(event) => {
          void pickFile("video", event.target.files?.[0]).finally(() => {
            event.target.value = "";
          });
        }}
      />
      <EditorContent editor={editor} className="blog-canvas" />
      <p className="blog-paste-hint">Paste a picture from the clipboard into the copy, or use the picture tool.</p>
    </div>
  );
}
