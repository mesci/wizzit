export interface FileTransfer {
  id: string
  file: File
  status: 'pending' | 'connecting' | 'transferring' | 'completed' | 'failed'
  progress: number
  startTime?: Date
  endTime?: Date
  speed?: number // bytes per second
  peer?: RTCPeerConnection
}

export interface ShareLink {
  id: string
  url: string
  fileName: string
  fileSize: number
  createdAt: Date
  expiresAt?: Date
  downloadCount: number
  maxDownloads?: number
}

export interface PeerConnection {
  id: string
  connection: RTCPeerConnection
  dataChannel?: RTCDataChannel
  status: 'connecting' | 'connected' | 'disconnected' | 'failed'
  type: 'sender' | 'receiver'
}

export interface TransferHistory {
  id: string
  fileName: string
  fileSize: number
  type: 'sent' | 'received'
  timestamp: Date
  status: 'completed' | 'failed'
  peer?: string
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'close'
  senderId: string
  receiverId: string
  data: any
}

export interface FileMetadata {
  name: string
  size: number
  type: string
  lastModified: number
  chunks: number
  checksum?: string
}

export interface TransferStats {
  bytesTransferred: number
  totalBytes: number
  speed: number
  timeRemaining?: number
  startTime: Date
}

export interface AppConfig {
  maxFileSize: number // in bytes
  chunkSize: number // in bytes
  iceServers: RTCIceServer[]
  signalTimeout: number // in milliseconds
  transferTimeout: number // in milliseconds
}

export interface ErrorInfo {
  code: string
  message: string
  timestamp: Date
  context?: Record<string, any>
}

export interface QRCodeData {
  url: string
  size: number
  includeMargin: boolean
  level: 'L' | 'M' | 'Q' | 'H'
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet'
  browser: string
  supportsWebRTC: boolean
  supportsNFC: boolean
  supportsServiceWorker: boolean
} 