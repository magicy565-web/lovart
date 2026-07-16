"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, ExternalLink, FileCheck2, Link2, Loader2, Plus, ShieldCheck, Trash2, Upload, X } from "lucide-react"

import {
  addCampaignEvidenceLink,
  approveCampaignEvidence,
  createCampaignClaim,
  deleteCampaignClaim,
  getCampaignEvidenceState,
  rejectCampaignEvidence,
} from "@/app/actions/evidence"
import { Button } from "@/components/ui/button"
import type {
  CampaignClaimRecord,
  CampaignEvidenceRecord,
  CampaignFoundationContent,
  FoundationEvidenceItem,
} from "@/lib/studio/types"
import { cn } from "@/lib/utils"

const truthLabels = {
  generated_concept: "生成概念",
  cad_render: "CAD 渲染",
  prototype_photo: "原型证据",
  production_sample: "量产样品",
  manufacturing_evidence: "生产证据",
  verified_data: "验证数据",
} as const

const claimLabels = { assumption: "假设", target: "目标", tested: "已测试", verified: "已验证" } as const

export function CampaignEvidencePanel({ projectId, requirements, onFoundationUpdated }: {
  projectId: string
  requirements: FoundationEvidenceItem[]
  onFoundationUpdated: (content: CampaignFoundationContent) => void
}) {
  const [evidence, setEvidence] = useState<CampaignEvidenceRecord[]>([])
  const [claims, setClaims] = useState<CampaignClaimRecord[]>([])
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [links, setLinks] = useState<Record<string, string>>({})
  const [claimText, setClaimText] = useState("")
  const [claimStatus, setClaimStatus] = useState<CampaignClaimRecord["status"]>("assumption")
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([])

  const load = useCallback(async () => {
    const state = await getCampaignEvidenceState(projectId)
    setEvidence(state.evidence)
    setClaims(state.claims)
  }, [projectId])

  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "读取证据失败")) }, [load])

  const approved = useMemo(() => evidence.filter((item) => item.status === "approved"), [evidence])

  async function upload(requirement: FoundationEvidenceItem, file: File) {
    const key = `upload:${requirement.id}`
    setBusy(key); setError("")
    try {
      const form = new FormData()
      form.set("projectId", projectId)
      form.set("requirementId", requirement.id)
      form.set("label", `${requirement.label} · ${file.name}`)
      form.set("role", requirement.id === "concept" ? "hero_product" : "proof")
      form.set("truthClass", requirement.truthClass)
      form.set("provenance", `用户上传：${file.name}`)
      form.set("notes", requirement.notes)
      form.set("file", file)
      const response = await fetch("/api/evidence/upload", { method: "POST", body: form })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || "上传失败")
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "上传失败")
    } finally { setBusy("") }
  }

  async function addLink(requirement: FoundationEvidenceItem) {
    const url = links[requirement.id]?.trim()
    if (!url) return
    const key = `link:${requirement.id}`
    setBusy(key); setError("")
    try {
      await addCampaignEvidenceLink(projectId, {
        requirementId: requirement.id,
        label: requirement.label,
        role: requirement.id === "concept" ? "hero_product" : "proof",
        url,
        truthClass: requirement.truthClass,
        provenance: "用户登记的外部证据链接",
        notes: requirement.notes,
      })
      setLinks((current) => ({ ...current, [requirement.id]: "" }))
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "登记失败") } finally { setBusy("") }
  }

  async function review(record: CampaignEvidenceRecord, action: "approve" | "reject") {
    setBusy(record.id); setError("")
    try {
      const result = action === "approve"
        ? await approveCampaignEvidence(projectId, record.id)
        : await rejectCampaignEvidence(projectId, record.id)
      if (result.foundation) onFoundationUpdated(result.foundation)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "审核失败") } finally { setBusy("") }
  }

  async function addClaim() {
    if (!claimText.trim()) return
    setBusy("claim"); setError("")
    try {
      await createCampaignClaim(projectId, { text: claimText, status: claimStatus, scope: "campaign", evidenceIds: selectedEvidence })
      setClaimText(""); setSelectedEvidence([])
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "声明保存失败") } finally { setBusy("") }
  }

  return (
    <div className="grid gap-7">
      <div className="grid gap-3">
        {requirements.map((requirement) => {
          const records = evidence.filter((item) => item.requirementId === requirement.id)
          const satisfied = records.some((item) => item.status === "approved" && item.truthClass === requirement.truthClass)
          return (
            <div key={requirement.id} className={cn("rounded-lg border p-3", satisfied ? "border-emerald-500/30 bg-emerald-50/40" : "border-black/10 bg-[#fafbfa]") }>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><p className="flex items-center gap-2 text-sm font-medium">{satisfied ? <ShieldCheck className="size-4 text-emerald-700" /> : <FileCheck2 className="size-4 text-black/45" />}{requirement.label}</p><p className="mt-1 text-[11px] leading-5 text-black/45">{requirement.notes}</p></div>
                <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-[10px] text-black/50">{truthLabels[requirement.truthClass]}</span>
              </div>
              {records.length > 0 && <div className="mt-3 divide-y divide-black/8 border-y border-black/8">{records.map((record) => <div key={record.id} className="flex flex-wrap items-center gap-2 py-2 text-[11px]"><a href={record.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-1.5 hover:underline"><ExternalLink className="size-3" /><span className="truncate">{record.label}</span></a><span className={cn("rounded-full px-2 py-0.5", record.status === "approved" ? "bg-emerald-100 text-emerald-700" : record.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{record.status === "approved" ? "已批准" : record.status === "rejected" ? "已拒绝" : "待审核"}</span>{record.status !== "approved" && <Button size="xs" variant="outline" disabled={busy === record.id} onClick={() => void review(record, "approve")}>{busy === record.id ? <Loader2 className="animate-spin" /> : <Check />}批准</Button>}{record.status !== "rejected" && <Button size="icon-xs" variant="ghost" title="拒绝证据" disabled={busy === record.id} onClick={() => void review(record, "reject")}><X /></Button>}</div>)}</div>}
              <div className="mt-3 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-xs hover:bg-black/5"><Upload className="size-3.5" />{busy === `upload:${requirement.id}` ? "上传中" : "上传文件"}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(requirement, file); event.target.value = "" }} /></label>
                <div className="flex h-8 items-center rounded-lg border border-black/10 bg-white px-2"><Link2 className="size-3.5 shrink-0 text-black/35" /><input value={links[requirement.id] ?? ""} onChange={(event) => setLinks((current) => ({ ...current, [requirement.id]: event.target.value }))} placeholder="登记外部证据链接" className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none" /></div>
                <Button size="sm" variant="outline" disabled={!links[requirement.id]?.trim() || busy === `link:${requirement.id}`} onClick={() => void addLink(requirement)}>{busy === `link:${requirement.id}` ? <Loader2 className="animate-spin" /> : <Plus />}登记</Button>
              </div>
            </div>
          )
        })}
      </div>

      <section className="border-t border-black/10 pt-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Claims Ledger</p><p className="mt-1 text-[11px] text-black/45">已测试或已验证的声明必须关联批准证据。</p></div><span className="font-mono text-xs text-black/35">{claims.length} CLAIMS</span></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
          <input value={claimText} onChange={(event) => setClaimText(event.target.value)} placeholder="例如：连续运行 8 小时后核心功能保持稳定" className="h-9 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none" />
          <select value={claimStatus} onChange={(event) => setClaimStatus(event.target.value as CampaignClaimRecord["status"])} className="h-9 rounded-lg border border-black/10 bg-white px-2 text-xs outline-none">{Object.entries(claimLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <Button className="h-9 bg-[#202622] text-white" disabled={!claimText.trim() || busy === "claim"} onClick={() => void addClaim()}>{busy === "claim" ? <Loader2 className="animate-spin" /> : <Plus />}添加声明</Button>
        </div>
        {approved.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{approved.map((record) => <label key={record.id} className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px]", selectedEvidence.includes(record.id) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-black/10 bg-white text-black/50")}><input type="checkbox" className="sr-only" checked={selectedEvidence.includes(record.id)} onChange={() => setSelectedEvidence((current) => current.includes(record.id) ? current.filter((id) => id !== record.id) : [...current, record.id])} />{selectedEvidence.includes(record.id) && <Check className="size-3" />}{record.label}</label>)}</div>}
        {claims.length > 0 && <div className="mt-4 divide-y divide-black/8 border-y border-black/8">{claims.map((claim) => <div key={claim.id} className="flex items-start gap-3 py-3"><span className="rounded-full bg-black/5 px-2 py-1 text-[10px] text-black/55">{claimLabels[claim.status]}</span><div className="min-w-0 flex-1"><p className="text-sm leading-5">{claim.text}</p><p className="mt-1 text-[10px] text-black/35">关联 {claim.evidenceIds.length} 项证据</p></div><Button size="icon-xs" variant="ghost" title="删除声明" onClick={() => void deleteCampaignClaim(projectId, claim.id).then(load)}><Trash2 /></Button></div>)}</div>}
      </section>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  )
}
