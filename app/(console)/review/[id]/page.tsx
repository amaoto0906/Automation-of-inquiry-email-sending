import { ReviewWorkspace } from "@/components/review-workspace";

export const metadata = { title: "送信前確認" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewWorkspace targetId={id} />;
}
