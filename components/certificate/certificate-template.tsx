"use client"

import { CertificateData } from "@/lib/certificate-types"
import { Award, CheckCircle } from "lucide-react"

interface CertificateTemplateProps {
  data: CertificateData
}

export function CertificateTemplate({ data }: CertificateTemplateProps) {
  return (
    <div className="w-[800px] h-[600px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-12 flex flex-col relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Gold border */}
      <div className="absolute inset-4 border-2 border-amber-500/30 rounded-lg" />
      <div className="absolute inset-6 border border-amber-500/20 rounded-lg" />

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-between text-center">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 text-amber-400">
            <Award className="w-10 h-10" />
            <span className="text-sm font-semibold tracking-[0.3em] uppercase">Learning Hub</span>
            <Award className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold tracking-wide mt-4">
            Certificate of Completion
          </h1>
        </div>

        {/* Main content */}
        <div className="flex flex-col items-center gap-6 py-8">
          <p className="text-lg text-slate-300">This is to certify that</p>
          <h2 className="text-3xl font-bold text-amber-400 border-b-2 border-amber-500/50 pb-2 px-8">
            {data.userName}
          </h2>
          <p className="text-lg text-slate-300">has successfully completed</p>
          <h3 className="text-2xl font-semibold max-w-lg">
            {data.moduleTitle}
          </h3>
          <div className="flex items-center gap-2 mt-4 text-emerald-400">
            <CheckCircle className="w-6 h-6" />
            <span className="font-medium">Module Completed</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between w-full px-8">
          <div className="text-left">
            <p className="text-sm text-slate-400">Date of Completion</p>
            <p className="text-lg font-medium">{data.completionDate}</p>
          </div>
          <div className="text-center">
            <div className="w-32 h-16 border-b-2 border-amber-500/50 flex items-end justify-center pb-1">
              <span className="text-amber-400 italic font-serif text-xl">Learning Hub</span>
            </div>
            <p className="text-sm text-slate-400 mt-1">Authorized Signature</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Certificate ID</p>
            <p className="text-sm font-mono">{data.certificateId.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
