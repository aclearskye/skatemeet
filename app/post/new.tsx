import { useRouter } from "expo-router";
import { PostComposer } from "@/components/posts/PostComposer";

export default function NewPostScreen() {
  const router = useRouter();
  return <PostComposer onClose={() => router.back()} />;
}
