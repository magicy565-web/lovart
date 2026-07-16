"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import * as studio from "@/features/studio/server/service"
import type {
  ArtifactContent,
  ArtifactType,
  CampaignFoundationContent,
} from "@/lib/studio/types"

const uuidSchema = z.string().uuid()
const shortTextSchema = z.string().trim().max(2_000)
const projectNameSchema = z.string().trim().min(1).max(160)
const artifactTypeSchema = z.enum([
  "brief",
  "research",
  "campaign-foundation",
  "visual-system",
  "campaign",
  "validation",
  "release-package",
])

function parseArtifactContent(content: ArtifactContent) {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new Error("Artifact 内容格式无效")
  }
  return content
}

export async function initializeProjectPipeline(projectId: string, name = "未命名发布企划", initialPrompt = "") {
  const { getOptionalUser } = await import("@/lib/auth-session")
  const user = await getOptionalUser()
  return studio.initializeProjectPipeline(
    uuidSchema.parse(projectId),
    projectNameSchema.parse(name),
    shortTextSchema.parse(initialPrompt),
    user?.id,
  )
}

export async function createProject(initialPrompt: string) {
  const { getOptionalUser } = await import("@/lib/auth-session")
  const user = await getOptionalUser()
  return studio.createProject(shortTextSchema.min(1).parse(initialPrompt), user?.id)
}

export async function getProjectState(projectId: string) {
  return studio.getProjectState(uuidSchema.parse(projectId))
}

export async function syncCanvasArtifact(
  projectId: string,
  artifactType: ArtifactType,
  operation: "generate" | "approve" | "revise",
  feedback = "",
) {
  const result = await studio.syncCanvasArtifact(
    uuidSchema.parse(projectId),
    artifactTypeSchema.parse(artifactType),
    z.enum(["generate", "approve", "revise"]).parse(operation),
    shortTextSchema.parse(feedback),
  )
  revalidatePath(`/studio?project=${projectId}`)
  return result
}

export async function startArtifactGeneration(projectId: string, artifactId: string) {
  return studio.startArtifactGeneration(uuidSchema.parse(projectId), uuidSchema.parse(artifactId))
}

export async function generateArtifactDraft(projectId: string, artifactId: string, instruction = "") {
  return studio.generateArtifactDraft(
    uuidSchema.parse(projectId),
    uuidSchema.parse(artifactId),
    shortTextSchema.parse(instruction),
  )
}

export async function submitArtifactForReview(
  projectId: string,
  artifactId: string,
  content: ArtifactContent,
  prompt: string,
) {
  return studio.submitArtifactForReview(
    uuidSchema.parse(projectId),
    uuidSchema.parse(artifactId),
    parseArtifactContent(content),
    shortTextSchema.parse(prompt),
  )
}

export async function approveArtifact(projectId: string, artifactId: string) {
  const result = await studio.approveArtifact(uuidSchema.parse(projectId), uuidSchema.parse(artifactId))
  revalidatePath(`/studio?project=${projectId}`)
  return result
}

export async function requestArtifactRevision(projectId: string, artifactId: string, feedback: string) {
  return studio.requestArtifactRevision(
    uuidSchema.parse(projectId),
    uuidSchema.parse(artifactId),
    shortTextSchema.min(1).parse(feedback),
  )
}

export async function synthesizeCampaignFoundationDecision(
  projectId: string,
  selectedDirectionIds: string[],
  instruction: string,
) {
  const result = await studio.synthesizeCampaignFoundationDecision(
    uuidSchema.parse(projectId),
    z.array(z.string().trim().min(1).max(120)).max(10).parse(selectedDirectionIds),
    shortTextSchema.parse(instruction),
  )
  revalidatePath(`/studio?project=${projectId}`)
  return result
}

export async function saveCampaignFoundation(projectId: string, content: CampaignFoundationContent) {
  const result = await studio.saveCampaignFoundation(uuidSchema.parse(projectId), content)
  revalidatePath(`/studio?project=${projectId}`)
  return result
}

export async function assembleReleasePackage(projectId: string) {
  return studio.assembleReleasePackage(uuidSchema.parse(projectId))
}

export async function startTask(projectId: string, taskId: string) {
  return studio.startTask(uuidSchema.parse(projectId), uuidSchema.parse(taskId))
}

export async function completeTask(projectId: string, taskId: string) {
  return studio.completeTask(uuidSchema.parse(projectId), uuidSchema.parse(taskId))
}

export async function saveRevision(artifactId: string, content: ArtifactContent, prompt: string) {
  return studio.saveRevision(
    uuidSchema.parse(artifactId),
    parseArtifactContent(content),
    shortTextSchema.parse(prompt),
  )
}

export async function switchRevision(artifactId: string, revisionId: string) {
  return studio.switchRevision(uuidSchema.parse(artifactId), uuidSchema.parse(revisionId))
}

export async function renameProject(projectId: string, name: string) {
  return studio.renameProject(uuidSchema.parse(projectId), projectNameSchema.parse(name))
}

export async function publishProject(projectId: string) {
  const slug = await studio.publishProject(uuidSchema.parse(projectId))
  revalidatePath(`/campaign/${slug}`)
  return slug
}

export async function unpublishProject(projectId: string) {
  const result = await studio.unpublishProject(uuidSchema.parse(projectId))
  revalidatePath(`/studio?project=${projectId}`)
  return result
}

export async function recordSignal(projectId: string, type: string, value = "") {
  return studio.recordSignal(
    uuidSchema.parse(projectId),
    z.string().trim().min(1).max(80).parse(type),
    shortTextSchema.parse(value),
  )
}

export async function getSignalCounts(projectId: string): Promise<Record<string, number>> {
  return studio.getSignalCounts(uuidSchema.parse(projectId))
}

export async function approveFoundationAndPublishConcept(
  projectId: string,
  content?: CampaignFoundationContent,
) {
  const result = await studio.approveFoundationAndPublishConcept(
    uuidSchema.parse(projectId),
    content,
  )
  revalidatePath(`/studio?project=${projectId}`)
  revalidatePath(`/campaign/${result.slug}`)
  return result
}
