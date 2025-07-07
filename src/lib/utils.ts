import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getFileIcon(fileName: string): string {
  if (!fileName) return '📎'
  
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  
  const iconMap: Record<string, string> = {
    // Images
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
    // Documents
    pdf: '📄', doc: '📝', docx: '📝', txt: '📄', rtf: '📝',
    // Spreadsheets
    xls: '📊', xlsx: '📊', csv: '📊',
    // Presentations
    ppt: '📊', pptx: '📊',
    // Archives
    zip: '🗜️', rar: '🗜️', '7z': '🗜️', tar: '🗜️', gz: '🗜️',
    // Audio
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵', ogg: '🎵',
    // Video
    mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬', wmv: '🎬',
    // Code
    js: '💻', ts: '💻', html: '💻', css: '💻', json: '💻', xml: '💻',
    py: '🐍', java: '☕', cpp: '⚙️', c: '⚙️', php: '🐘',
  }
  
  return iconMap[ext] || '📎'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function isValidFileType(file: File): boolean {
  // For now, allow all file types but could add restrictions later
  return true
}

export function getRandomWittyMessage(): string {
  const messages = [
    "Establishing secure connection...",
    "Configuring peer discovery...",
    "Optimizing transfer pathway...",
    "Synchronizing data streams...",
    "Initializing encryption layer...",
    "Setting up direct channel...",
    "Negotiating with network...",
    "Preparing data packets...",
    "Establishing encrypted tunnel...",
    "Optimizing connection quality...",
  ]
  
  return messages[Math.floor(Math.random() * messages.length)]
}

export function getProgressMessage(progress: number): string {
  if (progress < 25) return "Initializing transfer..."
  if (progress < 50) return "Transfer in progress..."
  if (progress < 75) return "Almost complete..."
  if (progress < 95) return "Finalizing transfer..."
  return "Transfer completed!"
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      return Promise.resolve(successful)
    } catch (err) {
      document.body.removeChild(textArea)
      return Promise.resolve(false)
    }
  }
  
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false)
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
} 