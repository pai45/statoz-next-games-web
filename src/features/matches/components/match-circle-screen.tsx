"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";

import {
  AddCommentIcon,
  ChatBubbleIcon,
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  ConfirmDialog,
  DeleteIcon,
  EditIcon,
  ErrorIcon,
  ForumIcon,
  HeartIcon,
  HeartOutlineIcon,
  MoreIcon,
  NoDataState,
  PersonOffIcon,
  SendIcon,
} from "@statoz/design-system/games";
import {
  matchCirclePostMaxLength,
  repliesFor,
  topLevelPosts,
  type MatchCircleAuthor,
  type MatchCirclePost,
  type SportMatch,
} from "@/domain/matches";
import { useProfileIdentity } from "@/features/profile";
import { matchDemoAnchor } from "@/mocks/matches";
import { avatarOptionById } from "@/mocks/onboarding";
import { useDemoNow, useKeyboardOpen } from "@/shared/hooks";

import {
  addComment,
  addReply,
  deletePost,
  editPost,
  threadFor,
  toggleLike,
  useMatchCircle,
} from "../state/match-circle-store";
import { MatchSummaryHeader } from "./match-summary-header";
import styles from "./match-circle.module.css";

/**
 * The discussion behind a fixture: comments newest first, one level of replies
 * under each, and a composer that doubles as the reply and edit surface.
 */
export function MatchCircleScreen({ match }: { match: SportMatch }) {
  const snapshot = useMatchCircle();
  const identity = useProfileIdentity();
  const keyboardOpen = useKeyboardOpen();
  // A seeded thread is dated off the demo anchor, so ages are read from the
  // same clock the fixtures run on rather than from the wall clock.
  const now = useDemoNow(matchDemoAnchor) ?? Date.parse(matchDemoAnchor);
  const thread = threadFor(snapshot, match);

  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<MatchCirclePost | null>(null);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [editing, setEditing] = useState<MatchCirclePost | null>(null);
  const [heldDraft, setHeldDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MatchCirclePost | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  const author: MatchCircleAuthor = {
    id: "me",
    displayName: identity.displayName || "You",
    avatarId: identity.avatarId,
    playerTag: identity.playerTag ?? undefined,
  };

  const posts = topLevelPosts(thread);

  function focusComposer() {
    window.setTimeout(() => field.current?.focus(), 0);
  }

  function startReply(post: MatchCirclePost) {
    // Leaving an edit half-done puts the original draft back.
    if (editing) {
      setDraft(heldDraft);
      setHeldDraft("");
      setEditing(null);
    }
    setReplyingTo(post);
    // Answering a reply joins the conversation it belongs to, never a third level.
    setReplyParentId(post.parentId ?? post.id);
    setError(null);
    focusComposer();
  }

  function startEdit(post: MatchCirclePost) {
    if (!editing) setHeldDraft(draft);
    setDraft(post.text);
    setEditing(post);
    setReplyingTo(null);
    setReplyParentId(null);
    setError(null);
    focusComposer();
  }

  function cancelMode() {
    if (editing) setDraft(heldDraft);
    setHeldDraft("");
    setEditing(null);
    setReplyingTo(null);
    setReplyParentId(null);
    setError(null);
  }

  function startComment() {
    cancelMode();
    focusComposer();
  }

  function submit() {
    const text = draft.trim();
    if (text === "") {
      setError("Write something before posting.");
      focusComposer();
      return;
    }
    if (text.length > matchCirclePostMaxLength) {
      setError("Comments can be up to 500 characters.");
      focusComposer();
      return;
    }

    const result = editing
      ? editPost(match, author.id, editing.id, text)
      : replyParentId
        ? addReply(match, author, replyParentId, text)
        : addComment(match, author, text);
    if (!result.ok) {
      setError(result.reason);
      focusComposer();
      return;
    }
    // An interrupted draft comes back once the edit that interrupted it is saved.
    setDraft(editing ? heldDraft : "");
    setHeldDraft("");
    setEditing(null);
    setReplyingTo(null);
    setReplyParentId(null);
    setError(null);
  }

  function confirmDelete() {
    const post = pendingDelete;
    setPendingDelete(null);
    if (!post) return;
    const result = deletePost(match, author.id, post.id);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    if (editing?.id === post.id || replyingTo?.id === post.id) cancelMode();
  }

  function like(post: MatchCirclePost) {
    const result = toggleLike(match, author.id, post.id);
    if (!result.ok) setError(result.reason);
  }

  return (
    <div className={styles.screen}>
      <header className={styles.topBar}>
        <Link href={`/matches/${match.id}`} className={styles.backLink}>
          <span aria-hidden className={styles.backIcon}>
            <ChevronLeftIcon size={18} />
          </span>
          <span className={styles.topTitle}>BACK TO MATCHES</span>
        </Link>
        <span aria-hidden className={styles.topMark}>
          <ForumIcon size={20} />
        </span>
      </header>

      {keyboardOpen ? null : <MatchSummaryHeader match={match} />}
      <span aria-hidden className={styles.divider} />

      <div className={styles.feed}>
        {posts.length === 0 ? (
          <NoDataState
            icon={ForumIcon}
            spark={AddCommentIcon}
            title="Start the circle"
            message="Be the first to talk about this match."
            action={
              <button type="button" className={styles.emptyAction} onClick={startComment}>
                <EditIcon size={16} aria-hidden="true" />
                WRITE A COMMENT
              </button>
            }
          />
        ) : (
          posts.map((post) => (
            <Discussion
              key={post.id}
              post={post}
              replies={repliesFor(thread, post.id)}
              author={author}
              now={now}
              onLike={like}
              onReply={startReply}
              onEdit={startEdit}
              onDelete={setPendingDelete}
            />
          ))
        )}
      </div>

      <div className={styles.composer}>
        {editing || replyingTo ? (
          <p className={styles.mode}>
            <span>
              {editing
                ? "EDITING YOUR COMMENT"
                : `REPLYING TO ${replyingTo?.author.displayName.toUpperCase()}`}
            </span>
            <button type="button" onClick={cancelMode} aria-label="Cancel">
              <CloseIcon size={18} />
            </button>
          </p>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            <ErrorIcon size={15} aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <div className={styles.composerRow}>
          <span className={styles.field}>
            <textarea
              ref={field}
              className={styles.input}
              value={draft}
              rows={1}
              maxLength={matchCirclePostMaxLength}
              autoCapitalize="sentences"
              placeholder={
                editing
                  ? "Update your comment"
                  : replyingTo
                    ? "Write a reply"
                    : "Join the Match Circle"
              }
              aria-label={editing ? "Update your comment" : "Write a comment"}
              onChange={(event) => {
                setDraft(event.target.value);
                if (error) setError(null);
              }}
            />
            <small className={draft.length >= 450 ? styles.countWarn : undefined}>
              {draft.length}/{matchCirclePostMaxLength}
            </small>
          </span>

          <button
            type="button"
            className={styles.send}
            disabled={draft.trim() === ""}
            aria-label={editing ? "Save comment" : "Post comment"}
            onClick={submit}
          >
            {editing ? <CheckIcon size={20} /> : <SendIcon size={20} />}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        title="Delete comment?"
        message="This cannot be undone. Replies will remain under a deleted-comment marker."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

/** One comment and whatever hangs under it. */
function Discussion({
  post,
  replies,
  author,
  now,
  onLike,
  onReply,
  onEdit,
  onDelete,
}: {
  post: MatchCirclePost;
  replies: MatchCirclePost[];
  author: MatchCircleAuthor;
  now: number;
  onLike: (post: MatchCirclePost) => void;
  onReply: (post: MatchCirclePost) => void;
  onEdit: (post: MatchCirclePost) => void;
  onDelete: (post: MatchCirclePost) => void;
}) {
  return (
    <article className={styles.thread}>
      <PostTile
        post={post}
        author={author}
        now={now}
        onLike={onLike}
        onReply={post.isDeleted ? undefined : onReply}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      {replies.length > 0 ? (
        <div className={styles.replies}>
          {replies.map((reply) => (
            <PostTile
              key={reply.id}
              post={reply}
              author={author}
              now={now}
              compact
              onLike={onLike}
              onReply={post.isDeleted ? undefined : onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function PostTile({
  post,
  author,
  now,
  compact = false,
  onLike,
  onReply,
  onEdit,
  onDelete,
}: {
  post: MatchCirclePost;
  author: MatchCircleAuthor;
  now: number;
  compact?: boolean;
  onLike: (post: MatchCirclePost) => void;
  onReply?: (post: MatchCirclePost) => void;
  onEdit: (post: MatchCirclePost) => void;
  onDelete: (post: MatchCirclePost) => void;
}) {
  const owned = post.author.id === author.id;
  const liked = post.likedBy.includes(author.id);
  // Your own face follows your profile, so changing it carries to older posts.
  const face = avatarOptionById(owned ? author.avatarId : post.author.avatarId);

  return (
    <div
      className={[styles.post, compact ? styles.postCompact : ""].filter(Boolean).join(" ")}
      style={
        {
          "--size": compact ? "32px" : "38px",
          "--body": compact ? "12px" : "13px",
        } as CSSProperties
      }
    >
      {post.isDeleted ? (
        <span aria-hidden className={styles.goneAvatar}>
          <PersonOffIcon size={17} />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- a static avatar.
        <img
          className={[styles.avatar, owned ? styles.avatarOwn : ""].filter(Boolean).join(" ")}
          src={face.src}
          alt=""
          width={38}
          height={38}
        />
      )}

      <div className={styles.body}>
        <div className={styles.head}>
          <strong className={post.isDeleted ? styles.deletedName : undefined}>
            {post.isDeleted ? "DELETED COMMENT" : post.author.displayName}
          </strong>
          <time dateTime={post.createdAt} suppressHydrationWarning>
            {relativeTime(post.createdAt, now)}
          </time>
          {owned && !post.isDeleted ? (
            <OwnedPostMenu post={post} onEdit={onEdit} onDelete={onDelete} />
          ) : null}
        </div>

        <p className={post.isDeleted ? styles.deletedText : styles.text}>
          {post.isDeleted ? "This comment was deleted." : post.text}
        </p>

        {post.isDeleted ? null : (
          <div className={styles.actions}>
            <button
              type="button"
              className={[styles.action, liked ? styles.actionActive : ""]
                .filter(Boolean)
                .join(" ")}
              aria-label={liked ? "Unlike comment" : "Like comment"}
              aria-pressed={liked}
              onClick={() => onLike(post)}
            >
              {liked ? (
                <HeartIcon size={16} aria-hidden="true" />
              ) : (
                <HeartOutlineIcon size={16} aria-hidden="true" />
              )}
              {post.likes === 0 ? "LIKE" : post.likes}
            </button>
            {onReply ? (
              <button
                type="button"
                className={styles.action}
                aria-label={`Reply to ${post.author.displayName}`}
                onClick={() => onReply(post)}
              >
                <ChatBubbleIcon size={16} aria-hidden="true" />
                REPLY
              </button>
            ) : null}
            {post.editedAt ? <span className={styles.edited}>EDITED</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Edit and delete, folded behind one control.
 *
 * Flutter opens a `PopupMenuButton`; here it is a plain menu that closes on
 * Escape, on a choice, and when focus leaves it altogether.
 */
function OwnedPostMenu({
  post,
  onEdit,
  onDelete,
}: {
  post: MatchCirclePost;
  onEdit: (post: MatchCirclePost) => void;
  onDelete: (post: MatchCirclePost) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={styles.menu}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className={styles.menuTrigger}
        aria-label="Comment options"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon size={19} />
      </button>
      {open ? (
        <span
          role="menu"
          className={styles.menuSheet}
          // The feed clips its own overflow, so a menu on the last comment
          // brings itself into view rather than opening off the bottom edge.
          ref={(node) => {
            node?.scrollIntoView({ block: "nearest" });
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit(post);
            }}
          >
            <EditIcon size={18} aria-hidden="true" />
            EDIT
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.menuDanger}
            onClick={() => {
              setOpen(false);
              onDelete(post);
            }}
          >
            <DeleteIcon size={18} aria-hidden="true" />
            DELETE
          </button>
        </span>
      ) : null}
    </span>
  );
}

/** "4h", "2d", then the date — the age a comment shows next to its author. */
function relativeTime(iso: string, now: number): string {
  const posted = new Date(iso);
  const minutes = Math.floor((now - posted.getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const day = String(posted.getDate()).padStart(2, "0");
  const month = String(posted.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${posted.getFullYear()}`;
}
