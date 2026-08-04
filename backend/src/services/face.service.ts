import { loadEnv } from '../config/env';
import { prisma } from '../lib/prisma';
import { uploadFile, deleteFile } from '../lib/storage';
import { AppError } from '../middleware/error-handler';

const FACE_URL = () => loadEnv().FACE_SERVICE_URL ?? 'http://localhost:8000';

function bufferToEmbedding(buf: Buffer): number[] {
  return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4));
}

export async function extractFaceEmbedding(imageBuffer: Buffer, employeeId: string): Promise<number[]> {
  const form = new FormData();
  form.append('employee_id', employeeId);
  form.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'face.jpg');

  const res = await fetch(`${FACE_URL()}/extract`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.text();
    throw new AppError(400, `Face extraction failed: ${err}`);
  }
  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

export async function verifyFaceImage(
  imageBuffer: Buffer,
  employeeId: string
): Promise<{ verified: boolean; confidence: number }> {
  const stored = await prisma.faceEmbedding.findFirst({
    where: { employeeId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!stored) {
    throw new AppError(404, 'No face registered for this employee');
  }

  const newEmbedding = await extractFaceEmbedding(imageBuffer, employeeId);
  const storedEmbedding = bufferToEmbedding(Buffer.from(stored.embedding));

  const res = await fetch(`${FACE_URL()}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embedding1: newEmbedding,
      embedding2: storedEmbedding,
    }),
  });

  if (!res.ok) throw new AppError(400, 'Face verification failed');
  return (await res.json()) as { verified: boolean; confidence: number };
}

export async function registerFace(
  employeeId: string,
  imageBuffer: Buffer,
  companyId: string
): Promise<{ id: string; imageUrl: string | null }> {
  const embedding = await extractFaceEmbedding(imageBuffer, employeeId);

  await prisma.faceEmbedding.updateMany({
    where: { employeeId, isActive: true },
    data: { isActive: false },
  });

  const imagePath = `faces/${companyId}/${employeeId}/${Date.now()}.jpg`;
  const imageUrl = await uploadFile('cronos-uploads', imagePath, imageBuffer, 'image/jpeg');

  const record = await prisma.faceEmbedding.create({
    data: {
      employeeId,
      embedding: Buffer.from(new Float32Array(embedding).buffer),
      imageUrl,
      isActive: true,
    },
  });

  return { id: record.id, imageUrl };
}

export async function deleteFace(employeeId: string): Promise<void> {
  const embeddings = await prisma.faceEmbedding.findMany({ where: { employeeId } });
  for (const emb of embeddings) {
    if (emb.imageUrl?.startsWith('/uploads/')) {
      const relative = emb.imageUrl.replace('/uploads/', '');
      const [bucket, ...rest] = relative.split('/');
      if (bucket && rest.length) await deleteFile(bucket, rest.join('/'));
    }
  }
  await prisma.faceEmbedding.updateMany({
    where: { employeeId },
    data: { isActive: false },
  });
  await fetch(`${FACE_URL()}/${employeeId}`, { method: 'DELETE' }).catch(() => {});
}

export async function getFaceStatus(employeeId: string) {
  const active = await prisma.faceEmbedding.findFirst({
    where: { employeeId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  return { registered: !!active, registeredAt: active?.createdAt ?? null, imageUrl: active?.imageUrl ?? null };
}
