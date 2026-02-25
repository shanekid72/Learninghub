export interface Certificate {
  id: string
  userId: string
  moduleId: string
  moduleTitle?: string
  userName?: string
  certificateUrl: string | null
  issuedAt: string
}

export interface CertificateData {
  certificateId: string
  userName: string
  moduleTitle: string
  completionDate: string
  issuedAt: string
}

export interface GenerateCertificateRequest {
  moduleId: string
  moduleTitle: string
}
