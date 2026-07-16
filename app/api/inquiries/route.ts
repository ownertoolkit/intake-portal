import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { portalConfig } from "@/lib/portal/config";
import { validateSubmission, type FilePlaceholder } from "@/lib/inquiries/validate";
import { extractRoleValues } from "@/lib/inquiries/extract-roles";
import { safeFilename } from "@/lib/inquiries/safe-filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FileMeta {
  fieldId: string;
  filename: string;
  contentType: string;
  size: number;
}

interface RequestBody {
  answers: Record<string, unknown>;
  files: FileMeta[];
}

const BUCKET = "inquiry-files";

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rawFilesByField: Record<string, FilePlaceholder[]> = {};
  for (const f of body.files ?? []) {
    if (!f || typeof f !== "object") continue;
    if (typeof f.fieldId !== "string" || typeof f.filename !== "string") continue;
    const bucket = rawFilesByField[f.fieldId] ?? [];
    bucket.push({
      filename: f.filename,
      contentType: typeof f.contentType === "string" ? f.contentType : "application/octet-stream",
      size: typeof f.size === "number" ? f.size : 0,
    });
    rawFilesByField[f.fieldId] = bucket;
  }

  const validation = validateSubmission(portalConfig.fields, {
    answers: body.answers ?? {},
    files: rawFilesByField,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: "Please check your answers.", details: validation.errors }, { status: 400 });
  }

  const { answers, files } = validation.data;
  const roles = extractRoleValues(portalConfig.fields, answers);

  const supabase = createSupabaseAdminClient();
  const inquiryId = crypto.randomUUID();

  // Sign one upload URL per file and record their storage paths in answers.
  const uploads: {
    fieldId: string;
    filename: string;
    path: string;
    token: string;
  }[] = [];
  const answersWithFiles: Record<string, unknown> = { ...answers };

  for (const [fieldId, filesForField] of Object.entries(files)) {
    const fileEntries: {
      name: string;
      path: string;
      size: number;
      contentType: string;
    }[] = [];
    for (const [i, file] of filesForField.entries()) {
      const safe = safeFilename(file.filename);
      const path = `${inquiryId}/${fieldId}-${i}-${safe}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) {
        return NextResponse.json(
          { error: "Could not prepare file upload." },
          { status: 500 },
        );
      }
      fileEntries.push({
        name: file.filename,
        path,
        size: file.size,
        contentType: file.contentType,
      });
      uploads.push({ fieldId, filename: file.filename, path, token: data.token });
    }
    answersWithFiles[fieldId] = fileEntries;
  }

  const { error: insertError } = await supabase
    .from("inquiries")
    .insert({
      id: inquiryId,
      status: "new",
      customer_name: roles.customer_name,
      customer_email: roles.customer_email,
      customer_phone: roles.customer_phone,
      answers: answersWithFiles,
    });

  if (insertError) {
    console.error("[api/inquiries] insert failed:", insertError);
    return NextResponse.json(
      { error: "Could not save your inquiry. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, inquiryId, uploads });
}
