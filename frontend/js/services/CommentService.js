import { api } from '../utils/api.js';

function normalizeComment(comment) {
  if (!comment) return null;

  return {
    id: String(comment.id),
    storyId: String(comment.story_id ?? comment.storyId ?? ''),
    userId: String(comment.user_id ?? comment.userId ?? ''),
    userName: comment.user_name || comment.userName || 'Lector',
    userAvatar: comment.user_avatar || comment.userAvatar || null,
    content: String(comment.content || ''),
    createdAt: comment.created_at || comment.createdAt || null,
  };
}

export const CommentService = {
  async getByStory(storyId) {
    const comments = await api.get(`/comments/${encodeURIComponent(storyId)}`);
    if (comments === null) {
      throw new Error('No pudimos cargar los comentarios en este momento.');
    }

    return Array.isArray(comments)
      ? comments.map(normalizeComment).filter(Boolean)
      : [];
  },

  async create({ storyId, userId, userName, userAvatar, content }) {
    const comment = await api.post('/comments/', {
      story_id: storyId,
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar || null,
      content,
    });

    if (!comment) {
      throw new Error('No pudimos publicar tu comentario. Intenta de nuevo en un momento.');
    }

    return normalizeComment(comment);
  },

  async delete(commentId, userId) {
    const response = await api.delete(`/comments/${encodeURIComponent(commentId)}`, {
      user_id: userId,
    });
    if (!response) {
      throw new Error('No pudimos eliminar el comentario. Intenta de nuevo en un momento.');
    }

    return response;
  },
};
