import { Text, View } from "react-native";
import { entityTagToMapFocus } from "@/lib/posts/entityTagOptions";
import type { PostEntityTag } from "@/lib/posts/types";
import { PostGrid } from "@/components/posts/PostGrid";
import { styles } from "./EntityPostsSection.styles";

type Props = {
  tag: PostEntityTag | null;
};

// Posts tagged at this spot / DIY / store -- only ones whose author has
// checked in here at some point (entity_posts enforces that server-side).
export function EntityPostsSection({ tag }: Props) {
  if (!tag) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.label}>POSTS HERE</Text>
      <PostGrid source={`entity:${entityTagToMapFocus(tag)}`} emptyIcon="images-outline" emptyLabel="NO POSTS FROM HERE YET" />
    </View>
  );
}
