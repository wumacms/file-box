import type { FileCategory } from '../providers/type';

export const getFileCategory = (type: string, name: string): FileCategory => {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  // 1. High Priority Specialized Extensions
  if (ext === 'csv') return 'csv';
  if (ext === 'md') return 'markdown';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'pdf' || type === 'application/pdf') return 'pdf';

  // 2. MIME Type Based (Standard categories)
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';

  // 3. Extension Based Fallbacks
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];
  if (imageExts.includes(ext)) return 'image';
  
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  if (videoExts.includes(ext)) return 'video';
  
  const audioExts = ['mp3', 'wav', 'flac', 'aac'];
  if (audioExts.includes(ext)) return 'audio';

  const docExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
  if (docExts.includes(ext)) return 'document';
  
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];
  if (archiveExts.includes(ext)) return 'archive';
  
  const codeExts = ['js', 'ts', 'vue', 'html', 'css', 'json', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'cs', 'sql', 'sh', 'yaml', 'xml'];
  if (codeExts.includes(ext)) return 'code';
  
  // 4. Generic Text/Code check
  if (type.startsWith('text/')) return 'code';
  const textExts = ['txt', 'log', 'conf', 'ini'];
  if (textExts.includes(ext)) return 'code';
  
  return 'other';
};
