/**
 * Minimal Security Checker for Wizzit
 * 
 * Detects only obvious threats without creating false positives.
 * Designed to be non-intrusive and educational rather than restrictive.
 */

export interface SecurityWarning {
  type: 'info' | 'caution'
  title: string
  message: string
  allowProceed: boolean
  icon: string
}

export class MinimalSecurityChecker {
  /**
   * Check for obvious security threats in file names
   * Only triggers on patterns with >90% malware probability
   */
  checkFile(file: File): SecurityWarning | null {
    const fileName = file.name.toLowerCase()
    
    // 1. Double extension threats (most common malware trick)
    const doubleExtensionPattern = /\.(pdf|doc|docx|jpg|jpeg|png|txt|zip)\.exe$/i
    if (doubleExtensionPattern.test(fileName)) {
      return {
        type: 'caution',
        title: 'Unusual file type detected',
        message: `This file appears to be an executable disguised as a ${this.getDisguisedType(fileName)}. This pattern is commonly used by malware.`,
        allowProceed: true,
        icon: '🛡️'
      }
    }
    
    // 2. High-risk extensions (screensavers, etc.)
    const highRiskExtensions = /\.(scr|pif|com|cmd|bat|vbs|ps1)$/i
    if (highRiskExtensions.test(fileName)) {
      return {
        type: 'info',
        title: 'System file type',
        message: `This is a ${this.getFileTypeDescription(fileName)} that can execute commands on your computer.`,
        allowProceed: true,
        icon: 'ℹ️'
      }
    }
    
    // 3. Obfuscated filenames (URL encoding, etc.)
    if (this.hasObfuscatedName(fileName)) {
      return {
        type: 'info',
        title: 'Unusual filename',
        message: 'This filename contains unusual characters that might be used to hide the real file type.',
        allowProceed: true,
        icon: '🔍'
      }
    }
    
    return null // File appears safe
  }
  
  private getDisguisedType(fileName: string): string {
    if (fileName.includes('.pdf.')) return 'PDF document'
    if (fileName.includes('.doc')) return 'Word document'
    if (fileName.includes('.jpg') || fileName.includes('.jpeg')) return 'image'
    if (fileName.includes('.png')) return 'image'
    if (fileName.includes('.txt')) return 'text file'
    if (fileName.includes('.zip')) return 'archive'
    return 'document'
  }
  
  private getFileTypeDescription(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()
    
    switch (ext) {
      case 'scr': return 'screensaver executable'
      case 'pif': return 'program information file'
      case 'com': return 'command file'
      case 'cmd': return 'command script'
      case 'bat': return 'batch script'
      case 'vbs': return 'VBScript file'
      case 'ps1': return 'PowerShell script'
      default: return 'system file'
    }
  }
  
  private hasObfuscatedName(fileName: string): boolean {
    // Check for URL encoding (e.g., %20, %2E)
    if (/%[0-9A-F]{2}/i.test(fileName)) return true
    
    // Check for unusual Unicode characters
    if (/[\u200B-\u200D\uFEFF]/.test(fileName)) return true
    
    // Check for excessive spaces or dots
    if (/\s{3,}|\.{3,}/.test(fileName)) return true
    
    return false
  }
  
  /**
   * Get informational message for common file types
   * Non-threatening, educational information
   */
  getFileTypeInfo(file: File): string | null {
    const ext = file.name.split('.').pop()?.toLowerCase()
    
    switch (ext) {
      case 'exe':
      case 'msi':
        return 'This is an executable program file'
      case 'zip':
      case 'rar':
      case '7z':
        return 'This is a compressed archive file'
      case 'pdf':
        return 'This is a PDF document'
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'This is an image file'
      default:
        return null
    }
  }
}

// Singleton instance
export const securityChecker = new MinimalSecurityChecker()