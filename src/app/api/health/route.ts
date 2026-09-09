export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, service: "studyuml", phase: 0 });
}
